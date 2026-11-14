import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";
import StatusBadge from "@/components/panel/StatusBadge";
import FileList from "@/components/panel/FileList";
import Timeline, { type TimelineEvent } from "@/components/panel/Timeline";
import { issueLabel } from "@/lib/issue-label";
import type { Profile, ReviewAssignment, Submission, SubmissionAuthor, SubmissionFile } from "@/lib/types";
import { assignReviewer, setDecision } from "../../actions";
import PublishForm from "./PublishForm";
import CancelReviewButton from "./CancelReviewButton";

const DECISIONS = ["desk_review", "under_review", "revision_required", "accepted", "rejected"] as const;

export default async function AdminSubmission({ params }: PageProps<"/[locale]/admin/submissions/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();

  const { data: s } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_submitter_id_fkey(full_name, email, affiliation), sections(title)")
    .eq("id", id)
    .maybeSingle<Submission & { profiles: Pick<Profile, "full_name" | "email" | "affiliation">; sections: { title: I18nText } | null }>();
  if (!s) notFound();

  const [{ data: authors }, { data: files }, { data: events }, { data: reviews }, { data: reviewers }, { data: issues }, { data: article }] =
    await Promise.all([
      supabase.from("submission_authors").select("*").eq("submission_id", id).order("sort_order"),
      supabase.from("submission_files").select("*").eq("submission_id", id).order("created_at"),
      supabase.from("submission_events").select("id, to_status, note, created_at").eq("submission_id", id).order("id"),
      supabase.from("review_assignments").select("*, profiles(full_name, email)").eq("submission_id", id).order("round").order("created_at"),
      supabase.from("profiles").select("id, full_name, email").eq("is_reviewer", true).order("full_name"),
      supabase.from("issues").select("id, number, is_special, status, volumes(number, year)").order("created_at", { ascending: false }).limit(30),
      supabase.from("articles").select("id").eq("submission_id", id).maybeSingle(),
    ]);
  const reviewList = (reviews ?? []) as (ReviewAssignment & { profiles: { full_name: string; email: string } | null })[];
  const maxRound = Math.max(1, ...reviewList.map((r) => r.round));

  return (
    <div className="space-y-6">
      <Link href="/admin/submissions" className="text-sm text-brand-600 hover:underline">← {t("common.back")}</Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card">
            <div className="mb-2 flex items-center gap-3">
              <StatusBadge status={s.status} />
              {s.sections && <span className="text-xs uppercase text-accent">{tr(s.sections.title, locale)}</span>}
              <span className="text-xs text-slate-500">{t(`langs.${s.language as "uz"}`)}</span>
            </div>
            <h1 className="text-2xl">{s.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {t("admin.author")}: {s.profiles?.full_name} ({s.profiles?.email})
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {((authors ?? []) as SubmissionAuthor[]).map((a) => (
                <li key={a.id}>
                  <span className="font-medium">{a.full_name}</span>
                  {a.is_corresponding && " ✉"}
                  {a.affiliation && <span className="text-slate-500"> — {a.affiliation}</span>}
                  {a.email && <span className="text-slate-500"> · {a.email}</span>}
                  {a.orcid && <span className="text-slate-500"> · ORCID {a.orcid}</span>}
                </li>
              ))}
            </ul>
            <h2 className="mt-5 text-lg">{t("article.abstract")}</h2>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{s.abstract}</p>
            <p className="mt-3 text-sm text-slate-500">{t("article.keywords")}: {s.keywords.join(", ")}</p>
            {s.cover_letter && (
              <>
                <h2 className="mt-5 text-lg">{t("submit.coverLetter")}</h2>
                <p className="mt-1 whitespace-pre-line text-sm">{s.cover_letter}</p>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 text-lg">{t("submission.files")}</h2>
            <FileList supabase={supabase} files={(files ?? []) as SubmissionFile[]} />
          </div>

          <div className="card">
            <h2 className="mb-3 text-lg">{t("dashboard.reviews")}</h2>
            {reviewList.length ? (
              <ul className="space-y-3">
                {reviewList.map((r) => (
                  <li key={r.id} className="rounded-md border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-medium">{r.profiles?.full_name}</span>
                        <span className="text-slate-500"> · {t("submission.round", { n: r.round })} · {t(`reviewStatus.${r.status}`)}</span>
                        {r.due_at && <span className="text-slate-500"> · {formatDate(r.due_at, locale)}</span>}
                      </span>
                      {["invited", "accepted"].includes(r.status) && <CancelReviewButton id={r.id} />}
                    </div>
                    {r.recommendation && <p className="mt-2 font-medium">{t(`rec.${r.recommendation}`)}</p>}
                    {r.comments_to_author && (
                      <p className="mt-1 whitespace-pre-line"><span className="text-slate-500">{t("review.toAuthor")}:</span> {r.comments_to_author}</p>
                    )}
                    {r.comments_to_editor && (
                      <p className="mt-1 whitespace-pre-line text-amber-800"><span className="text-slate-500">{t("review.toEditor")}:</span> {r.comments_to_editor}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">{t("submission.noReviews")}</p>
            )}

            {!["published", "rejected", "withdrawn"].includes(s.status) && (
              <form action={assignReviewer} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_150px_80px_auto]">
                <input type="hidden" name="submission_id" value={s.id} />
                {reviewers?.length ? (
                  <>
                    <select name="reviewer_id" className="input" required aria-label={t("admin.reviewer")}>
                      {(reviewers as Pick<Profile, "id" | "full_name" | "email">[]).map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                    <input type="date" name="due_at" className="input" aria-label={t("admin.dueDate")} />
                    <input type="number" name="round" min={1} defaultValue={maxRound} className="input" aria-label="Round" />
                    <button className="btn-primary">{t("admin.assign")}</button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 sm:col-span-4">{t("admin.noReviewers")}</p>
                )}
              </form>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {!["published", "withdrawn"].includes(s.status) && (
            <form action={setDecision} className="card space-y-3">
              <h2 className="text-lg">{t("admin.changeStatus")}</h2>
              <input type="hidden" name="id" value={s.id} />
              <select name="status" className="input" defaultValue={s.status}>
                {DECISIONS.map((d) => <option key={d} value={d}>{t(`status.${d}`)}</option>)}
              </select>
              <textarea name="note" className="input min-h-24" placeholder={t("admin.note")} defaultValue={s.decision_note ?? ""} />
              <button className="btn-primary w-full">{t("admin.apply")}</button>
            </form>
          )}

          {s.status === "accepted" && !article && (
            <PublishForm
              submissionId={s.id}
              issues={((issues ?? []) as unknown as { id: string; number: number; is_special: boolean; status: string; volumes: { number: number; year: number } | null }[]).map((i) => ({
                id: i.id,
                label: `${issueLabel(t, i)}${i.status === "draft" ? " (draft)" : ""}`,
              }))}
            />
          )}
          {article && (
            <Link href={`/admin/articles/${article.id}`} className="btn-secondary w-full">{t("admin.articles")} →</Link>
          )}

          <div className="card">
            <h2 className="mb-4 text-lg">{t("submission.timeline")}</h2>
            <Timeline events={(events ?? []) as TimelineEvent[]} />
          </div>
        </aside>
      </div>
    </div>
  );
}
