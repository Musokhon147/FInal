import { notFound } from "next/navigation";
import { scopeOf } from "@/lib/pubtypes";
import type { PubType } from "@/lib/types";
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
import { assignReviewer, setDecision, setSimilarity } from "../../actions";
import { SCORE_KEYS } from "@/lib/types";
import PublishForm from "./PublishForm";
import CancelReviewButton from "./CancelReviewButton";

const DECISIONS = ["desk_review", "under_review", "revision_required", "accepted", "rejected"] as const;

type IssueChoice = { id: string; number: number; is_special: boolean; status: string; conference_id: string | null; volumes: { number: number; year: number } | null; conferences: { scope: "local" | "international"; title: I18nText } | null };

/** Issues that fit the submission's type: journal issues for articles, collections of the matching conference type for theses (its own conference first). */
function issuesFor(type: PubType, conferenceId: string | null, all: IssueChoice[]) {
  const scope = scopeOf(type);
  const fit = all.filter((i) => (scope ? i.conferences?.scope === scope : !i.conference_id));
  const list = fit.length ? fit : all; // nothing set up yet: let the editor choose any issue
  return [...list].sort((a, b) => Number(b.conference_id === conferenceId && !!conferenceId) - Number(a.conference_id === conferenceId && !!conferenceId));
}

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
      supabase.from("issues").select("id, number, is_special, status, conference_id, title, volumes(number, year), conferences(scope, title)").order("created_at", { ascending: false }).limit(60),
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
              <span className={`rounded px-1.5 py-0.5 text-[11px] ${s.pub_type === "journal" ? "bg-slate-200 text-slate-600" : "bg-accent/15 text-accent"}`}>{t(`pt.${s.pub_type ?? "journal"}`)}</span>
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
                    {r.scores && Object.keys(r.scores).length > 0 && (
                      <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                        {SCORE_KEYS.filter((k) => r.scores[k]).map((k) => (
                          <div key={k} className="flex items-center gap-3 text-xs">
                            <span className="w-28 shrink-0 text-slate-500">{t(`x.s_${k}`)}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${(r.scores[k]! / 5) * 100}%` }} /></span>
                            <span className="w-4 tabular-nums text-slate-700">{r.scores[k]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {r.comments_to_author && (
                      <p className="mt-1 whitespace-pre-line"><span className="text-slate-500">{t("review.toAuthor")}:</span> {r.comments_to_author}</p>
                    )}
                    {r.comments_to_editor && (
                      <p className="mt-1 whitespace-pre-line text-accent"><span className="text-slate-500">{t("review.toEditor")}:</span> {r.comments_to_editor}</p>
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
          <form action={setSimilarity} className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg">{t("x.similarity")}</h2>
              {s.similarity_percent !== null && s.similarity_percent !== undefined ? (
                <span className={`badge ${s.similarity_percent < 15 ? "b-accepted" : s.similarity_percent <= 30 ? "b-under_review" : "b-rejected"}`}>
                  {s.similarity_percent}% · {t(s.similarity_percent < 15 ? "x.simLow" : s.similarity_percent <= 30 ? "x.simMid" : "x.simHigh")}
                </span>
              ) : <span className="text-xs text-slate-500">{t("x.similarityNone")}</span>}
            </div>
            <input type="hidden" name="id" value={s.id} />
            <label className="block"><span className="label">{t("x.similarityPercent")}</span>
              <input name="similarity_percent" type="number" min={0} max={100} step="0.1" defaultValue={s.similarity_percent ?? ""} className="input" /></label>
            <label className="block"><span className="label">{t("x.similarityNote")}</span>
              <input name="similarity_note" defaultValue={s.similarity_note ?? ""} className="input" /></label>
            <button className="btn-secondary w-full">{t("common.save")}</button>
          </form>

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
              issues={issuesFor(s.pub_type ?? "journal", s.conference_id ?? null, (issues ?? []) as unknown as IssueChoice[]).map((i) => ({
                id: i.id,
                label: `${issueLabel(t, i)}${i.conferences ? ` · ${tr(i.conferences.title, locale)}` : ""}${i.status === "draft" ? " (draft)" : ""}`,
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
