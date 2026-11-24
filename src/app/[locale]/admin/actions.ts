"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendJournalEmail } from "@/lib/email";
import { getSession, isStaff } from "@/lib/auth";
import type { AppRole, SubmissionStatus } from "@/lib/types";
import { cleanI18nHtml } from "@/lib/sanitize";
import { isDoi, isDoiPrefix, isIssn, normalizeDoi, normalizeIssn } from "@/lib/identifiers";
import { afterPublish, crossrefConfigured, registerDois } from "@/lib/crossref";
import { createAdminClient } from "@/lib/supabase/admin";

async function staff() {
  const s = await getSession();
  if (!s.user || !isStaff(s.profile)) throw new Error("Forbidden");
  return s;
}
const done = () => {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/sitemap.xml"); // search engines see new and removed pages at once
};
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => (str(f, k) ? Number.parseInt(str(f, k), 10) : null);
const i18n = (f: FormData, k: string) => ({ uz: str(f, `${k}_uz`), ru: str(f, `${k}_ru`), en: str(f, `${k}_en`) });
/** A DOI typed by an editor: "" → null, a doi.org link → the bare DOI, anything else that is not a DOI → error. */
function doiField(v: string | null | undefined) {
  const d = normalizeDoi(v);
  if (!d) return null;
  if (!isDoi(d)) throw new Error("bad-doi");
  return d;
}
/** DOIs and Crossref run after the response, with the service key when there is one (works without a session). */
function doiAfterPublish(fallback: Awaited<ReturnType<typeof staff>>["supabase"], ids: string[], userId?: string | null) {
  if (ids.length) after(() => afterPublish(createAdminClient() ?? fallback, ids, userId).catch(() => {}));
}

/* ---------- submissions ---------- */

export async function setDecision(formData: FormData) {
  const { supabase, user } = await staff();
  const id = str(formData, "id");
  const status = str(formData, "status") as SubmissionStatus;
  const { error } = await supabase
    .from("submissions")
    .update({ status, decision_note: str(formData, "note") || null, editor_id: user!.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const key = status === "accepted" ? "decision_accept" : status === "rejected" ? "decision_reject" : status === "revision_required" ? "revision_required" : null;
  if (key) after(() => sendJournalEmail(key, { submissionId: id }));
  done();
}

export async function assignReviewer(formData: FormData) {
  const { supabase } = await staff();
  const submission_id = str(formData, "submission_id");
  const { data: prev } = await supabase
    .from("review_assignments")
    .select("round")
    .eq("submission_id", submission_id)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: review, error } = await supabase.from("review_assignments").insert({
    submission_id,
    reviewer_id: str(formData, "reviewer_id"),
    round: int(formData, "round") ?? prev?.round ?? 1,
    due_at: str(formData, "due_at") || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  after(() => sendJournalEmail("review_invite", { submissionId: submission_id, reviewId: review.id }));
  // move to "under review" automatically
  await supabase
    .from("submissions")
    .update({ status: "under_review" })
    .eq("id", submission_id)
    .in("status", ["submitted", "desk_review"]);
  done();
}

export async function cancelReview(id: string) {
  const { supabase } = await staff();
  await supabase.from("review_assignments").update({ status: "cancelled" }).eq("id", id);
  done();
}

export async function publishSubmission(input: {
  submissionId: string;
  issueId: string;
  firstPage: number | null;
  lastPage: number | null;
  doi: string | null;
  pdfPath: string | null;
  fullText?: string | null;
}) {
  const { supabase, user } = await staff();
  const doi = doiField(input.doi);
  const { data: s, error: e1 } = await supabase.from("submissions").select("*").eq("id", input.submissionId).single();
  if (e1) throw new Error(e1.message);
  const [{ data: authors }, { data: issue }] = await Promise.all([
    supabase.from("submission_authors").select("*").eq("submission_id", s.id).order("sort_order"),
    supabase.from("issues").select("status").eq("id", input.issueId).single(),
  ]);
  const live = issue?.status === "published";

  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      submission_id: s.id,
      journal_id: s.journal_id,
      issue_id: input.issueId,
      section_id: s.section_id,
      title: s.title,
      abstract: s.abstract,
      keywords: s.keywords,
      language: s.language,
      references: s.references,
      authors: (authors ?? []).map((a) => ({
        name: a.full_name,
        affiliation: a.affiliation ?? undefined,
        orcid: a.orcid || undefined,
      })),
      first_page: input.firstPage,
      last_page: input.lastPage,
      doi,
      pdf_path: input.pdfPath,
      full_text: input.fullText?.slice(0, 200_000) || null,
      status: live ? "published" : "scheduled",
      published_at: live ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("submissions").update({ status: "published" }).eq("id", s.id);
  // the author hears about it once the article is live (scheduled ones: when their issue is published)
  if (live) {
    doiAfterPublish(supabase, [article.id], user?.id);
    after(() => sendJournalEmail("article_published", { submissionId: s.id, articleId: article.id }));
  }
  done();
  return article.id as string;
}

/* ---------- volumes & issues ---------- */

export async function createVolume(formData: FormData) {
  const { supabase } = await staff();
  const { error } = await supabase.from("volumes").insert({
    journal_id: str(formData, "journal_id"),
    number: int(formData, "number"),
    year: int(formData, "year"),
  });
  if (error) throw new Error(error.message);
  done();
}

export async function createIssue(formData: FormData) {
  const { supabase } = await staff();
  const { error } = await supabase.from("issues").insert({
    volume_id: str(formData, "volume_id"),
    number: int(formData, "number"),
    is_special: formData.get("is_special") === "on",
    title: i18n(formData, "title"),
    conference_id: str(formData, "conference_id") || null,
  });
  if (error) throw new Error(error.message);
  done();
}

export async function setIssuePublished(id: string, publish: boolean) {
  const { supabase, user } = await staff();
  const now = new Date().toISOString();
  const { data: issue } = await supabase.from("issues").select("published_at").eq("id", id).single();
  await supabase
    .from("issues")
    .update({ status: publish ? "published" : "draft", published_at: publish ? issue?.published_at ?? now : issue?.published_at })
    .eq("id", id);
  // articles follow their issue
  if (publish) {
    const { data: going } = await supabase.from("articles").update({ status: "published", published_at: now })
      .eq("issue_id", id).eq("status", "scheduled").select("id, submission_id");
    doiAfterPublish(supabase, (going ?? []).map((a) => a.id as string), user?.id);
    const list = (going ?? []).filter((a) => a.submission_id) as { id: string; submission_id: string }[];
    if (list.length) after(async () => { for (const a of list) await sendJournalEmail("article_published", { submissionId: a.submission_id, articleId: a.id }); });
  } else {
    await supabase.from("articles").update({ status: "scheduled" }).eq("issue_id", id);
  }
  done();
}

/* ---------- articles ---------- */

export async function updateArticle(formData: FormData) {
  const { supabase, user } = await staff();
  const id = str(formData, "id");
  const doi = doiField(str(formData, "doi"));
  const { data: before } = await supabase.from("articles").select("doi, doi_status, status").eq("id", id).maybeSingle();
  const doiChanged = (before?.doi ?? null) !== doi;
  const { error } = await supabase
    .from("articles")
    .update({
      ...(doiChanged ? { doi_status: "none", doi_message: null } : {}),
      title: str(formData, "title"),
      title_i18n: i18n(formData, "title"),
      abstract: str(formData, "abstract"),
      abstract_i18n: i18n(formData, "abstract"),
      keywords: str(formData, "keywords").split(",").map((k) => k.trim()).filter(Boolean),
      references: str(formData, "references"),
      first_page: int(formData, "first_page"),
      last_page: int(formData, "last_page"),
      doi,
      issue_id: str(formData, "issue_id") || null,
      sort_order: int(formData, "sort_order") ?? 0,
      authors: JSON.parse(str(formData, "authors") || "[]"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  // a registered DOI keeps Crossref's copy of the details up to date (updates are free)
  if (crossrefConfigured() && doi && before?.status === "published" && (doiChanged || before.doi_status === "registered")) {
    after(() => registerDois(createAdminClient() ?? supabase, [id], user?.id).catch(() => {}));
  }
  done();
}

export async function setArticlePdf(id: string, pdfPath: string, fullText?: string | null) {
  const { supabase } = await staff();
  await supabase.from("articles").update({ pdf_path: pdfPath, full_text: fullText?.slice(0, 200_000) || null }).eq("id", id);
  done();
}

/* ---------- users (admin only) ---------- */

export async function updateUserRole(formData: FormData) {
  const { supabase, profile } = await staff();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  const { error } = await supabase
    .from("profiles")
    .update({
      role: str(formData, "role") as AppRole,
      is_reviewer: formData.get("is_reviewer") === "on",
    })
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  done();
}

/* ---------- CMS pages ---------- */

export async function savePage(formData: FormData) {
  const { supabase } = await staff();
  const id = str(formData, "id");
  const row = {
    slug: str(formData, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    title: i18n(formData, "title"),
    body: cleanI18nHtml(i18n(formData, "body")),
    is_published: formData.get("is_published") === "on",
    show_in_menu: formData.get("show_in_menu") === "on",
    sort_order: int(formData, "sort_order") ?? 0,
  };
  const { error } = id
    ? await supabase.from("pages").update(row).eq("id", id)
    : await supabase.from("pages").insert(row);
  if (error) throw new Error(error.message);
  done();
}

/* ---------- journal settings (admin) */
export async function saveSettings(input: {
  title: Record<string, string>; description: Record<string, string>; issn_online: string; issn_print?: string; publisher: string;
  contact_email: string; indexes: string[]; cfp_deadline: string | null; cfp_text: Record<string, string>; logo_url?: string | null;
  doi_prefix?: string; doi_auto?: boolean; google_verification?: string;
}): Promise<{ error?: "bad-issn-online" | "bad-issn-print" | "bad-prefix" | "bad-google" }> {
  const { supabase, profile } = await staff();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  // numbers are checked here, so a typo never reaches Google Scholar or Crossref
  const issnOnline = normalizeIssn(input.issn_online), issnPrint = normalizeIssn(input.issn_print);
  if (issnOnline && !isIssn(issnOnline)) return { error: "bad-issn-online" };
  if (issnPrint && !isIssn(issnPrint)) return { error: "bad-issn-print" };
  const prefix = String(input.doi_prefix ?? "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/\/$/, "");
  if (prefix && !isDoiPrefix(prefix)) return { error: "bad-prefix" };
  // Search Console gives a whole tag: <meta name="google-site-verification" content="CODE" /> — keep only the code
  const gRaw = String(input.google_verification ?? "").trim();
  const google = gRaw.match(/content=["']([^"']+)["']/)?.[1]?.trim() ?? gRaw;
  if (google && !/^[A-Za-z0-9_-]{10,100}$/.test(google)) return { error: "bad-google" };
  const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
  const row: Record<string, unknown> = {
    ...input, issn_online: issnOnline || null, issn_print: issnPrint || null, doi_prefix: prefix || null, doi_auto: input.doi_auto ?? true,
    google_verification: google || null,
  };
  if (input.logo_url === undefined) delete row.logo_url;
  const { error } = await supabase.from("journals").update(row).eq("id", j!.id);
  if (error) throw new Error(error.message);
  done();
  return {};
}

/* ---------- editorial board */
export async function saveMember(id: string | null, input: {
  full_name: Record<string, string>; position: Record<string, string>; affiliation: Record<string, string>;
  position_type: "chief" | "deputy" | "member"; sort_order: number; photo_url?: string | null;
  academic_degree?: Record<string, string>; email?: string | null;
}) {
  const { supabase } = await staff();
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("bad-email");
  const row: Record<string, unknown> = { ...input };
  // board members review for the journal: a registered user with this email becomes a reviewer
  if (input.email) await supabase.from("profiles").update({ is_reviewer: true }).eq("email", input.email);
  if (input.photo_url === undefined) delete row.photo_url;
  if (id) {
    const { error } = await supabase.from("editorial_board").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
    const { error } = await supabase.from("editorial_board").insert({ ...row, journal_id: j?.id });
    if (error) throw new Error(error.message);
  }
  done();
}

export async function deleteMember(id: string) {
  const { supabase } = await staff();
  await supabase.from("editorial_board").delete().eq("id", id);
  done();
}

/* ---------- news */
export async function saveNews(formData: FormData) {
  const { supabase } = await staff();
  const id = str(formData, "id");
  const row = { date: str(formData, "date"), pinned: formData.get("pinned") === "on", title: i18n(formData, "title"), body: cleanI18nHtml(i18n(formData, "body")) };
  const { error } = id ? await supabase.from("news").update(row).eq("id", id) : await supabase.from("news").insert(row);
  if (error) throw new Error(error.message);
  done();
}

export async function deleteNews(id: string) {
  const { supabase } = await staff();
  await supabase.from("news").delete().eq("id", id);
  done();
}

/* ---------- plagiarism / similarity check */
export async function setSimilarity(formData: FormData) {
  const { supabase } = await staff();
  const raw = str(formData, "similarity_percent");
  const pct = raw === "" ? null : Math.max(0, Math.min(100, Number(raw.replace(",", "."))));
  const { error } = await supabase
    .from("submissions")
    .update({ similarity_percent: pct, similarity_note: str(formData, "similarity_note") || null })
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  done();
}

/* ---------- conferences */
export async function saveConference(formData: FormData) {
  const { supabase } = await staff();
  const id = str(formData, "id");
  const row = {
    title: i18n(formData, "title"),
    location: i18n(formData, "location"),
    description: cleanI18nHtml(i18n(formData, "description")),
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date") || null,
    registration_deadline: str(formData, "registration_deadline") || null,
    scope: str(formData, "scope") === "international" ? "international" : "local",
  };
  if (id) {
    const { error } = await supabase.from("conferences").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
    const { error } = await supabase.from("conferences").insert({ ...row, journal_id: j?.id });
    if (error) throw new Error(error.message);
  }
  done();
}

export async function deleteConference(id: string) {
  const { supabase } = await staff();
  await supabase.from("conferences").delete().eq("id", id);
  done();
}

/* ---------- email templates ---------- */

export async function saveEmailTemplate(key: string, subject: Record<string, string>, body: Record<string, string>) {
  const { supabase, user } = await staff();
  const { EMAIL_KEYS } = await import("@/lib/email-templates");
  if (!(EMAIL_KEYS as readonly string[]).includes(key)) throw new Error("Unknown template");
  const clean = (o: Record<string, string>) => Object.fromEntries(["uz", "ru", "en"].map((l) => [l, String(o[l] ?? "").slice(0, 20_000)]));
  const row = { subject: clean(subject), body: clean(body), updated_at: new Date().toISOString(), updated_by: user!.id };
  const { data: existing } = await supabase.from("email_templates").select("key").eq("key", key).maybeSingle();
  const { error } = existing
    ? await supabase.from("email_templates").update(row).eq("key", key)
    : await supabase.from("email_templates").insert({ key, ...row });
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/emails", "layout");
}

export async function resetEmailTemplate(key: string) {
  const { supabase } = await staff();
  await supabase.from("email_templates").delete().eq("key", key);
  revalidatePath("/[locale]/admin/emails", "layout");
}

/* ---------- bulk import of old issues ---------- */

export type ImportRow = {
  volume: number; year: number; issue: number; issue_date: string; special: boolean; section: string;
  title: string; title_ru: string; title_en: string; authors: { name: string; affiliation?: string; orcid?: string }[];
  abstract: string; keywords: string[]; language: string; first_page: number | null; last_page: number | null; doi: string;
  pdf_path: string | null; full_text: string | null;
};

/** Adds articles to the archive, creating volumes and issues as needed. Called in small batches by the import page. */
export async function importArticles(rows: ImportRow[], skipExistingDoi: boolean) {
  const { supabase } = await staff();
  if (rows.length > 50) throw new Error("Too many rows in one batch");
  const { data: journal } = await supabase.from("journals").select("id").limit(1).single();
  if (!journal) throw new Error("No journal");
  const jid = journal.id as string;
  const [{ data: vols }, { data: sections }] = await Promise.all([
    supabase.from("volumes").select("id, number, year").eq("journal_id", jid),
    supabase.from("sections").select("id, title").eq("journal_id", jid),
  ]);
  const volumes = (vols ?? []) as { id: string; number: number; year: number }[];
  const issueCache = new Map<string, string>();
  let added = 0, skipped = 0;

  for (const r of rows) {
    if (skipExistingDoi && r.doi) {
      const { data: dup } = await supabase.from("articles").select("id").eq("doi", r.doi).maybeSingle();
      if (dup) { skipped++; continue; }
    }
    // volume
    let vol = volumes.find((v) => v.number === r.volume);
    if (vol && vol.year !== r.year) throw new Error(`Volume ${r.volume} already exists for ${vol.year}`);
    if (!vol) {
      const { data, error } = await supabase.from("volumes").insert({ journal_id: jid, number: r.volume, year: r.year }).select("id, number, year").single();
      if (error) throw new Error(error.message);
      vol = data as { id: string; number: number; year: number };
      volumes.push(vol);
    }
    // issue (published, dated as in the file)
    const ik = `${vol.id}/${r.issue}/${r.special}`;
    let issueId = issueCache.get(ik);
    if (!issueId) {
      const { data: found } = await supabase.from("issues").select("id, is_special").eq("volume_id", vol.id).eq("number", r.issue);
      const match = ((found ?? []) as { id: string; is_special: boolean }[]).find((i) => i.is_special === r.special);
      if (match) issueId = match.id;
      else {
        const { data, error } = await supabase.from("issues")
          .insert({ volume_id: vol.id, number: r.issue, is_special: r.special, status: "published", published_at: new Date(r.issue_date).toISOString() })
          .select("id").single();
        if (error) throw new Error(error.message);
        issueId = data.id as string;
      }
      issueCache.set(ik, issueId!);
    }
    const section = r.section
      ? ((sections ?? []) as { id: string; title: Record<string, string> }[]).find((s) => Object.values(s.title ?? {}).some((t) => t.trim().toLowerCase() === r.section.trim().toLowerCase()))
      : undefined;
    const { error } = await supabase.from("articles").insert({
      journal_id: jid, issue_id: issueId, section_id: section?.id ?? null,
      title: r.title.slice(0, 1000), title_i18n: Object.fromEntries(Object.entries({ ru: r.title_ru, en: r.title_en }).filter(([, v]) => v)),
      abstract: r.abstract, keywords: r.keywords.slice(0, 30), language: r.language || "uz",
      authors: r.authors.slice(0, 40), first_page: r.first_page, last_page: r.last_page, doi: isDoi(normalizeDoi(r.doi)) ? normalizeDoi(r.doi) : null,
      pdf_path: r.pdf_path, full_text: r.full_text?.slice(0, 200_000) || null,
      status: "published", published_at: new Date(r.issue_date).toISOString(),
    });
    if (error) throw new Error(error.message);
    added++;
  }
  done();
  return { added, skipped };
}

/* ---------- issue details: title, conference, cover, whole-issue PDF ---------- */

export async function saveIssue(id: string, input: {
  title: Record<string, string>; description: Record<string, string>; conference_id: string | null;
  cover_url?: string | null; pdf_path?: string | null;
}) {
  const { supabase } = await staff();
  const row: Record<string, unknown> = { title: input.title, description: input.description, conference_id: input.conference_id || null };
  if (input.cover_url !== undefined) row.cover_url = input.cover_url;
  if (input.pdf_path !== undefined) row.pdf_path = input.pdf_path;
  const { error } = await supabase.from("issues").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  done();
}

/* ---------- "For authors": guidance and sample PDF per publication type ---------- */

export async function saveAuthorKits(kits: Record<string, { guide: Record<string, string>; template: string | null }>) {
  const { supabase } = await staff();
  const { PUB_TYPES } = await import("@/lib/pubtypes");
  const clean = Object.fromEntries(PUB_TYPES.map((k) => [k, {
    guide: cleanI18nHtml(kits[k]?.guide ?? {}),
    template: kits[k]?.template || null,
  }]));
  const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
  const { error } = await supabase.from("journals").update({ author_kits: clean }).eq("id", j?.id ?? "");
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/for-authors", "page");
  done();
}

/** Sends one template, filled with sample details, to the signed-in editor — to check wording and delivery. */
export async function sendTestEmail(key: string, lang: "uz" | "ru" | "en", subject: string, body: string) {
  const { user } = await staff();
  const { emailConfigured, deliver } = await import("@/lib/email");
  const { fillTemplate, SAMPLE_VARS } = await import("@/lib/email-templates");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  if (!emailConfigured() || !user?.email) return { ok: false, reason: "not-configured" as const };
  const s = `[TEST] ${fillTemplate(subject, SAMPLE_VARS)}`;
  const r = await deliver(user.email, s, fillTemplate(body, SAMPLE_VARS), SAMPLE_VARS.journal);
  await createAdminClient()?.from("email_log").insert({
    key, to_email: user.email, subject: s, status: r.error ? "failed" : "sent", error: r.error ?? null, provider_id: r.id ?? null,
  });
  return r.error ? { ok: false, reason: "failed" as const, error: r.error } : { ok: true, to: user.email, lang };
}

/* ---------- simple publishing: one button ---------- */

type Db = Awaited<ReturnType<typeof staff>>["supabase"];
type SubRow = { id: string; journal_id: string; pub_type: string | null; conference_id: string | null; status: string; title: string };

/** This year's volume, created when missing (volumes are just "one per year" in the simple flow). */
async function volumeForYear(db: Db, journalId: string, year: number) {
  const { data: vols } = await db.from("volumes").select("id, number, year").eq("journal_id", journalId).order("number", { ascending: false });
  const list = (vols ?? []) as { id: string; number: number; year: number }[];
  const found = list.find((v) => v.year === year);
  if (found) return found.id;
  const { data, error } = await db.from("volumes").insert({ journal_id: journalId, number: (list[0]?.number ?? 0) + 1, year }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Next free issue number in a volume (regular and special issues are numbered separately). */
async function nextIssueNumber(db: Db, volumeId: string, special: boolean) {
  const { data } = await db.from("issues").select("number").eq("volume_id", volumeId).eq("is_special", special).order("number", { ascending: false }).limit(1);
  return ((data?.[0] as { number: number } | undefined)?.number ?? 0) + 1;
}

/**
 * The issue new work goes into: the newest issue of the right kind (journal issue, or the collection
 * of the submission's conference). Creates one for this year when there is none.
 */
async function currentIssueFor(db: Db, s: SubRow): Promise<string | "needs-conference"> {
  const thesis = s.pub_type === "local_conference" || s.pub_type === "international_conference";
  if (!thesis) {
    const { data } = await db.from("issues").select("id").is("conference_id", null).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return (data[0] as { id: string }).id;
    const vol = await volumeForYear(db, s.journal_id, new Date().getFullYear());
    const { data: created, error } = await db.from("issues").insert({ volume_id: vol, number: await nextIssueNumber(db, vol, false) }).select("id").single();
    if (error) throw new Error(error.message);
    return created.id as string;
  }
  if (s.conference_id) {
    const { data } = await db.from("issues").select("id").eq("conference_id", s.conference_id).order("created_at", { ascending: false }).limit(1);
    if (data?.[0]) return (data[0] as { id: string }).id;
    const { data: conf } = await db.from("conferences").select("title, start_date").eq("id", s.conference_id).single();
    const year = conf?.start_date ? Number(String(conf.start_date).slice(0, 4)) : new Date().getFullYear();
    const vol = await volumeForYear(db, s.journal_id, year);
    const { data: created, error } = await db.from("issues")
      .insert({ volume_id: vol, number: await nextIssueNumber(db, vol, true), is_special: true, conference_id: s.conference_id, title: conf?.title ?? {} })
      .select("id").single();
    if (error) throw new Error(error.message);
    return created.id as string;
  }
  // a thesis without a conference: the newest collection of the same kind
  const scope = s.pub_type === "international_conference" ? "international" : "local";
  const { data } = await db.from("issues").select("id, conferences!inner(scope)").eq("conferences.scope", scope).order("created_at", { ascending: false }).limit(1);
  return data?.[0] ? (data[0] as { id: string }).id : "needs-conference";
}

/** The author's latest PDF, copied to the public article files (used when no final PDF is attached). */
async function authorPdf(db: Db, submissionId: string): Promise<string | null> {
  const { data: files } = await db.from("submission_files").select("storage_path, file_name, mime_type, kind, version, created_at")
    .eq("submission_id", submissionId).in("kind", ["final_pdf", "revision", "manuscript"]).order("created_at", { ascending: false });
  const pdf = ((files ?? []) as { storage_path: string; file_name: string; mime_type: string | null }[])
    .find((f) => f.mime_type === "application/pdf" || /\.pdf$/i.test(f.file_name));
  if (!pdf) return null;
  const { IS_DEMO } = await import("@/lib/supabase/env");
  if (IS_DEMO) return pdf.storage_path; // the demo serves sample PDFs for any path
  const { data: blob, error } = await db.storage.from("manuscripts").download(pdf.storage_path);
  if (error || !blob) return null;
  const path = `${submissionId}/${Date.now()}-${pdf.file_name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
  const { error: up } = await db.storage.from("articles").upload(path, blob, { contentType: "application/pdf" });
  return up ? null : path;
}

/**
 * "Accept and publish" / "Publish now": accepts the manuscript if needed, puts it in the current issue
 * (making one if there is none), makes that issue live and publishes the article. The author gets one
 * email: "your article is published".
 */
export async function quickPublish(submissionId: string, opts: { pdfPath?: string | null; fullText?: string | null } = {}) {
  const { supabase, user } = await staff();
  const { data: s, error } = await supabase.from("submissions").select("id, journal_id, pub_type, conference_id, status, title").eq("id", submissionId).single();
  if (error || !s) return { error: "not-found" as const };
  const sub = s as SubRow;
  if (["published", "withdrawn"].includes(sub.status)) return { error: "already" as const };
  const { data: existing } = await supabase.from("articles").select("id").eq("submission_id", sub.id).maybeSingle();
  if (existing) return { articleId: (existing as { id: string }).id };

  const issueId = await currentIssueFor(supabase, sub);
  if (issueId === "needs-conference") return { error: "needs-conference" as const };
  if (sub.status !== "accepted") {
    const { error: e } = await supabase.from("submissions").update({ status: "accepted", editor_id: user!.id }).eq("id", sub.id);
    if (e) throw new Error(e.message);
  }
  const pdfPath = opts.pdfPath ?? (await authorPdf(supabase, sub.id));

  // the issue goes live first, so the article is published (not scheduled) and the author is emailed once
  const { data: issue } = await supabase.from("issues").select("status").eq("id", issueId).single();
  if (issue?.status !== "published") await setIssuePublished(issueId, true);
  const articleId = await publishSubmission({ submissionId: sub.id, issueId, firstPage: null, lastPage: null, doi: null, pdfPath, fullText: opts.fullText ?? null });
  return { articleId, issueId };
}

/** "Start a new issue": next number in this year's volume, one click. */
export async function startNewIssue() {
  const { supabase } = await staff();
  const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
  if (!j) throw new Error("No journal");
  const vol = await volumeForYear(supabase, j.id as string, new Date().getFullYear());
  const { error } = await supabase.from("issues").insert({ volume_id: vol, number: await nextIssueNumber(supabase, vol, false) });
  if (error) throw new Error(error.message);
  done();
}
