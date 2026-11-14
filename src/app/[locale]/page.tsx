import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { getJournal } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import { issueLabel } from "@/lib/issue-label";
import ArticleList, { ARTICLE_LIST_SELECT, type ListedArticle } from "@/components/public/ArticleList";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const supabase = await createClient();
  const journal = await getJournal();

  const { data: issue } = await supabase
    .from("issues")
    .select("id, number, is_special, title, cover_url, published_at, volumes(number, year)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: articles } = issue
    ? await supabase
        .from("articles")
        .select(ARTICLE_LIST_SELECT)
        .eq("issue_id", issue.id)
        .eq("status", "published")
        .order("sort_order")
        .order("first_page")
        .limit(10)
    : { data: [] };

  return (
    <div className="space-y-10">
      <section className="card flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <h1 className="text-3xl">{tr(journal?.title, locale)}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{tr(journal?.description, locale)}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/submit" className="btn-primary">{t("home.cta")}</Link>
            <Link href="/p/author-guidelines" className="btn-secondary">{t("nav.forAuthors")}</Link>
          </div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3 md:w-80 md:grid-cols-1">
          {journal?.issn_online && (
            <div><dt className="text-slate-500">ISSN (online)</dt><dd className="font-medium">{journal.issn_online}</dd></div>
          )}
          {journal?.issn_print && (
            <div><dt className="text-slate-500">ISSN (print)</dt><dd className="font-medium">{journal.issn_print}</dd></div>
          )}
          {journal?.publisher && (
            <div><dt className="text-slate-500">{t("home.publisher")}</dt><dd className="font-medium">{journal.publisher}</dd></div>
          )}
        </dl>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(["openAccess", "peerReview", "languagesTitle"] as const).map((k) => (
          <div key={k} className="card">
            <h3 className="text-lg">{t(`home.${k}`)}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {t(`home.${k === "languagesTitle" ? "languagesText" : `${k}Text`}` as "home.openAccessText")}
            </p>
          </div>
        ))}
      </section>

      {issue && (
        <section className="card">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">{t("home.currentIssue")}</h2>
            <Link href={`/issue/${issue.id}`} className="text-sm text-brand-600 hover:underline">
              {t("home.viewIssue")} →
            </Link>
          </div>
          <p className="text-slate-600">
            {issueLabel(t, issue as never)}
            {tr(issue.title, locale) && ` — ${tr(issue.title, locale)}`}
            {issue.published_at && ` · ${formatDate(issue.published_at, locale)}`}
          </p>
          <ArticleList articles={(articles ?? []) as unknown as ListedArticle[]} />
        </section>
      )}
    </div>
  );
}
