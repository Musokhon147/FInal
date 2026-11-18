import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { fillTemplate, resolveEmail, type EmailKey, type Lang } from "@/lib/email-templates";

/**
 * Journal emails, sent through Resend (https://resend.com).
 * Needs on the server: RESEND_API_KEY, EMAIL_FROM ("Journal <noreply@your-domain>") and SUPABASE_SERVICE_ROLE_KEY.
 * Every attempt is written to public.email_log. Failures never break the editor's action.
 */
export const emailConfigured = () =>
  !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM && !!createAdminClient();

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Plain text → simple branded HTML (links clickable, line breaks kept). */
function toHtml(text: string, journal: string) {
  const body = esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1d4ed8">$1</a>')
    .split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f3f4f8;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a1d5c;color:#e8b13a;padding:16px 24px;font-size:15px;font-weight:bold">${esc(journal)}</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${body}</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Sends through the Resend API. One idempotency key per message, reused on retries, so a retry can never
 * create a second email. Retries only network errors, 5xx and 429 (as Resend recommends).
 */
export async function deliver(to: string, subject: string, text: string, journal: string, idempotencyKey?: string): Promise<{ id?: string; error?: string }> {
  const key = idempotencyKey ?? `msg/${crypto.randomUUID()}`;
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key.slice(0, 256) },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: toHtml(text, journal) }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok) return { id: json.id };
      last = json.message || `HTTP ${res.status}`;
      if (res.status !== 429 && res.status < 500) return { error: last }; // bad request, wrong key, unverified domain: retrying won't help
    } catch (e) {
      last = e instanceof Error ? e.message : String(e); // network error: retry
    }
  }
  return { error: last };
}

const langOf = (l?: string | null): Lang => (l === "ru" || l === "en" ? l : "uz");
const fmtDate = (d: string | null | undefined, lang: Lang) =>
  d ? new Intl.DateTimeFormat(lang === "uz" ? "uz-Latn-UZ" : lang === "ru" ? "ru-RU" : "en-GB", { dateStyle: "long" }).format(new Date(d)) : "";

type Ctx = { submissionId: string; reviewId?: string; articleId?: string };

/**
 * Sends one journal email (template `key`) about a submission, to the right person:
 * the reviewer for review_invite / review_reminder, otherwise the author.
 * Skips duplicates sent in the last 10 minutes (e.g. a double click).
 */
export async function sendJournalEmail(key: EmailKey, ctx: Ctx): Promise<"sent" | "failed" | "skipped"> {
  const db = createAdminClient();
  if (!db || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return "skipped";
  try {
    const { data: s } = await db.from("submissions")
      .select("id, title, decision_note, submitter_id, journal_id, profiles!submissions_submitter_id_fkey(full_name, email, preferred_locale)")
      .eq("id", ctx.submissionId).single();
    if (!s) return "skipped";
    const author = s.profiles as unknown as { full_name: string; email: string | null; preferred_locale: string } | null;

    let to = author?.email ?? null, name = author?.full_name ?? "", lang = langOf(author?.preferred_locale), due: string | null = null;
    if (key === "review_invite" || key === "review_reminder") {
      const { data: r } = await db.from("review_assignments")
        .select("id, due_at, profiles!review_assignments_reviewer_id_fkey(full_name, email, preferred_locale)")
        .eq("id", ctx.reviewId ?? "").single();
      const rev = r?.profiles as unknown as { full_name: string; email: string | null; preferred_locale: string } | null;
      to = rev?.email ?? null; name = rev?.full_name ?? ""; lang = langOf(rev?.preferred_locale); due = r?.due_at ?? null;
    }
    if (!to) return "skipped";

    // no duplicates within 10 minutes
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    let dup = db.from("email_log").select("id", { count: "exact", head: true })
      .eq("key", key).eq("submission_id", s.id).eq("to_email", to).eq("status", "sent").gte("created_at", since);
    if (ctx.reviewId) dup = dup.eq("review_id", ctx.reviewId);
    const { count } = await dup;
    if (count) return "skipped";

    const [{ data: journal }, { data: saved }, article] = await Promise.all([
      db.from("journals").select("title").eq("id", s.journal_id).single(),
      db.from("email_templates").select("subject, body").eq("key", key).maybeSingle(),
      ctx.articleId
        ? db.from("articles").select("doi, issues(number, is_special, volumes(number, year))").eq("id", ctx.articleId).single().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    const jt = (journal?.title ?? {}) as Record<string, string>;
    const journalName = jt[lang] || jt.uz || jt.en || "Journal";
    const iss = (article as unknown as { doi: string | null; issues: { number: number; is_special: boolean; volumes: { number: number; year: number } | null } | null } | null);
    const link =
      key === "review_invite" || key === "review_reminder" ? `${SITE_URL}/${lang}/dashboard/reviews/${ctx.reviewId}`
      : key === "article_published" && ctx.articleId ? `${SITE_URL}/${lang}/article/${ctx.articleId}`
      : `${SITE_URL}/${lang}/dashboard/submissions/${s.id}`;
    const vars: Record<string, string> = {
      author_name: author?.full_name || "", reviewer_name: name, title: s.title, journal: journalName, link,
      due_date: fmtDate(due, lang), editor_note: s.decision_note ?? "",
      issue: iss?.issues ? `Vol. ${iss.issues.volumes?.number ?? ""} (${iss.issues.volumes?.year ?? ""}), No. ${iss.issues.number}` : "",
      doi: iss?.doi ?? "—",
    };
    const tpl = resolveEmail(key, lang, saved as { subject?: Record<string, string>; body?: Record<string, string> } | null);
    const subject = fillTemplate(tpl.subject, vars);
    const text = fillTemplate(tpl.body, vars).replace(/\n{3,}/g, "\n\n"); // an empty note leaves a gap
    const r = await deliver(to, subject, text, journalName, `journal/${key}/${s.id}/${ctx.reviewId ?? ctx.articleId ?? "-"}/${crypto.randomUUID()}`);
    await db.from("email_log").insert({
      key, to_email: to, subject, submission_id: s.id, review_id: ctx.reviewId ?? null,
      status: r.error ? "failed" : "sent", error: r.error ?? null, provider_id: r.id ?? null,
    });
    return r.error ? "failed" : "sent";
  } catch (e) {
    console.error("journal email failed", key, e);
    return "failed";
  }
}
