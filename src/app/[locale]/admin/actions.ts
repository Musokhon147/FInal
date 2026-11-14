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

export async function setArticlePdf(id: string, pdfPath: string) {
  const { supabase } = await staff();
  await supabase.from("articles").update({ pdf_path: pdfPath }).eq("id", id);
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
}) {
  const { supabase } = await staff();
  const row: Record<string, unknown> = { ...input };
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
