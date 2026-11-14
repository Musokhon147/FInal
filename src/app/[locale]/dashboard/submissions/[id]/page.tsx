import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import StatusBadge from "@/components/panel/StatusBadge";
import FileList from "@/components/panel/FileList";
import Timeline, { type TimelineEvent } from "@/components/panel/Timeline";
import type { ReviewRec, Submission, SubmissionAuthor, SubmissionFile } from "@/lib/types";
import RevisionUpload from "./RevisionUpload";
import WithdrawButton from "./WithdrawButton";

export default async function MySubmissionPage({ params }: PageProps<"/[locale]/dashboard/submissions/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase, user } = await getSession();

  const { data: s } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle<Submission>();
  if (!s || s.submitter_id !== user?.id) notFound();

  const [{ data: authors }, { data: files }, { data: events }, { data: reviews }] = await Promise.all([
    supabase.from("submission_authors").select("*").eq("submission_id", id).order("sort_order"),
    supabase.from("submission_files").select("*").eq("submission_id", id).neq("kind", "review_attachment").order("created_at"),
    supabase.from("submission_events").select("id, to_status, note, created_at").eq("submission_id", id).order("id"),
    supabase.rpc("reviews_for_author", { sid: id }),
  ]);
  const fileList = (files ?? []) as SubmissionFile[];
  const reviewList = (reviews ?? []) as { round: number; recommendation: ReviewRec; comments_to_author: string | null; completed_at: string }[];
  const canWithdraw = !["published", "rejected", "withdrawn"].includes(s.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">← {t("common.back")}</Link>
        <div className="card">
          <div className="mb-2"><StatusBadge status={s.status} /></div>
          <h1 className="text-2xl">{s.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {((authors ?? []) as SubmissionAuthor[]).map((a) => a.full_name).join(", ")}
          </p>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{s.abstract}</p>
          {s.keywords.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">{t("article.keywords")}: {s.keywords.join(", ")}</p>
          )}
        </div>

        {s.decision_note && (
          <div className="card border-amber-200 bg-amber-50">
            <h2 className="mb-1 text-lg">{t("submission.editorNote")}</h2>
            <p className="whitespace-pre-line text-sm">{s.decision_note}</p>
          </div>
        )}

        {s.status === "revision_required" && (
          <RevisionUpload
            submissionId={s.id}
            nextVersion={Math.max(1, ...fileList.map((f) => f.version)) + 1}
          />
        )}

        <div className="card">
          <h2 className="mb-3 text-lg">{t("submission.reviews")}</h2>
          {!reviewList.length ? (
            <p className="text-sm text-slate-500">{t("submission.noReviews")}</p>
          ) : (
            <ul className="space-y-4">
              {reviewList.map((r, i) => (
                <li key={i} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium">
                    {t("submission.round", { n: r.round })} · {t(`rec.${r.recommendation}`)}
                    <span className="ml-2 font-normal text-slate-500">{formatDate(r.completed_at, locale)}</span>
                  </p>
                  {r.comments_to_author && <p className="mt-2 whitespace-pre-line text-sm">{r.comments_to_author}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-lg">{t("submission.files")}</h2>
          <FileList supabase={supabase} files={fileList} />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card">
          <h2 className="mb-4 text-lg">{t("submission.timeline")}</h2>
          <Timeline events={(events ?? []) as TimelineEvent[]} />
        </div>
        {canWithdraw && <WithdrawButton id={s.id} />}
      </aside>
    </div>
  );
}
