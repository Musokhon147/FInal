"use server";

import { revalidatePath } from "next/cache";
import { getSession, isStaff } from "@/lib/auth";
import type { AppRole, SubmissionStatus } from "@/lib/types";
import { cleanI18nHtml } from "@/lib/sanitize";

async function staff() {
  const s = await getSession();
  if (!s.user || !isStaff(s.profile)) throw new Error("Forbidden");
  return s;
}
const done = () => revalidatePath("/[locale]", "layout");
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => (str(f, k) ? Number.parseInt(str(f, k), 10) : null);
const i18n = (f: FormData, k: string) => ({ uz: str(f, `${k}_uz`), ru: str(f, `${k}_ru`), en: str(f, `${k}_en`) });

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
  const { error } = await supabase.from("review_assignments").insert({
    submission_id,
    reviewer_id: str(formData, "reviewer_id"),
    round: int(formData, "round") ?? prev?.round ?? 1,
    due_at: str(formData, "due_at") || null,
  });
  if (error) throw new Error(error.message);
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
  const { supabase } = await staff();
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
      doi: input.doi || null,
      pdf_path: input.pdfPath,
      full_text: input.fullText?.slice(0, 200_000) || null,
      status: live ? "published" : "scheduled",
      published_at: live ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("submissions").update({ status: "published" }).eq("id", s.id);
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
  const { supabase } = await staff();
  const now = new Date().toISOString();
  const { data: issue } = await supabase.from("issues").select("published_at").eq("id", id).single();
  await supabase
    .from("issues")
    .update({ status: publish ? "published" : "draft", published_at: publish ? issue?.published_at ?? now : issue?.published_at })
    .eq("id", id);
  // articles follow their issue
  if (publish) {
    await supabase.from("articles").update({ status: "published", published_at: now })
      .eq("issue_id", id).eq("status", "scheduled");
  } else {
    await supabase.from("articles").update({ status: "scheduled" }).eq("issue_id", id);
  }
  done();
}

/* ---------- articles ---------- */

export async function updateArticle(formData: FormData) {
  const { supabase } = await staff();
  const id = str(formData, "id");
  const { error } = await supabase
    .from("articles")
    .update({
      title: str(formData, "title"),
      title_i18n: i18n(formData, "title"),
      abstract: str(formData, "abstract"),
      abstract_i18n: i18n(formData, "abstract"),
      keywords: str(formData, "keywords").split(",").map((k) => k.trim()).filter(Boolean),
      references: str(formData, "references"),
      first_page: int(formData, "first_page"),
      last_page: int(formData, "last_page"),
      doi: str(formData, "doi") || null,
      issue_id: str(formData, "issue_id") || null,
      sort_order: int(formData, "sort_order") ?? 0,
      authors: JSON.parse(str(formData, "authors") || "[]"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
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
  title: Record<string, string>; description: Record<string, string>; issn_online: string; publisher: string;
  contact_email: string; indexes: string[]; cfp_deadline: string | null; cfp_text: Record<string, string>; logo_url?: string | null;
}) {
  const { supabase, profile } = await staff();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  const { data: j } = await supabase.from("journals").select("id").eq("is_active", true).order("sort_order").limit(1).single();
  const row: Record<string, unknown> = { ...input };
  if (input.logo_url === undefined) delete row.logo_url;
  const { error } = await supabase.from("journals").update(row).eq("id", j!.id);
  if (error) throw new Error(error.message);
  done();
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
      authors: r.authors.slice(0, 40), first_page: r.first_page, last_page: r.last_page, doi: r.doi || null,
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
