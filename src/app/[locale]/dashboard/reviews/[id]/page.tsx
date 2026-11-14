import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import FileList from "@/components/panel/FileList";
import type { ReviewAssignment, Submission, SubmissionFile } from "@/lib/types";
import ReviewForm from "./ReviewForm";
import InviteButtons from "./InviteButtons";

export default async function ReviewPage({ params }: PageProps<"/[locale]/dashboard/reviews/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase, user } = await getSession();

  const { data: r } = await supabase
    .from("review_assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle<ReviewAssignment>();
  if (!r || r.reviewer_id !== user?.id) notFound();

  // Reviewers see title, abstract and files — not the author list (blind review)
  const [{ data: s }, { data: files }] = await Promise.all([
    supabase.from("submissions").select("id, title, abstract, keywords, language").eq("id", r.submission_id).single<
      Pick<Submission, "id" | "title" | "abstract" | "keywords" | "language">
    >(),
    supabase.from("submission_files").select("*").eq("submission_id", r.submission_id)
      .in("kind", ["manuscript", "revision"]).order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">← {t("common.back")}</Link>
      <div className="card">
        <p className="text-sm text-slate-500">
          {t("review.title")} · {t(`reviewStatus.${r.status}`)}
          {r.due_at && ` · ${t("review.due", { date: formatDate(r.due_at, locale) })}`}
        </p>
        <h1 className="mt-1 text-2xl">{s?.title}</h1>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{s?.abstract}</p>
        {s?.keywords?.length ? <p className="mt-3 text-sm text-slate-500">{t("article.keywords")}: {s.keywords.join(", ")}</p> : null}
      </div>

      {r.status !== "invited" && r.status !== "declined" && (
        <div className="card">
          <h2 className="mb-3 text-lg">{t("submission.files")}</h2>
          <FileList supabase={supabase} files={(files ?? []) as SubmissionFile[]} />
        </div>
      )}

      {r.status === "invited" && <InviteButtons id={r.id} />}
      {r.status === "accepted" && <ReviewForm id={r.id} />}
      {r.status === "completed" && (
        <div className="card bg-green-50">
          <p className="font-medium text-green-800">{t("review.thanks")}</p>
          <p className="mt-2 text-sm">{t("review.recommendation")}: {r.recommendation && t(`rec.${r.recommendation}`)}</p>
          {r.comments_to_author && <p className="mt-2 whitespace-pre-line text-sm">{r.comments_to_author}</p>}
        </div>
      )}
    </div>
  );
}
