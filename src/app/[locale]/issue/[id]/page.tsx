import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { cleanHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr } from "@/lib/i18n-field";
import { issueLabel } from "@/lib/issue-label";
import ArticleList, { ARTICLE_LIST_SELECT, topicOf, type ListedArticle } from "@/components/public/ArticleList";
import IssueCover from "@/components/design/IssueCover";

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*, volumes(number, year)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/issue/[id]">): Promise<Metadata> {
  const { id } = await params;
  const issue = await load(id);
  if (!issue) return {};
  const t = await getTranslations();
  const locale = await getLocale();
  return { title: [issueLabel(t, issue), tr(issue.title, locale)].filter(Boolean).join(" — "), alternates: alternates(locale, `/issue/${id}`) };
}

export default async function IssuePage({ params }: PageProps<"/[locale]/issue/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const issue = await load(id);
  if (!issue) notFound();

  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select(ARTICLE_LIST_SELECT)
    .eq("issue_id", id)
    .eq("status", "published")
    .order("sort_order")
    .order("first_page");

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">{t("nav.home")}</Link> /{" "}
        <Link href="/archives" className="hover:text-slate-900">{t("nav.archives")}</Link> / {issueLabel(t, issue)}
      </nav>
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
      <div className="md:sticky md:top-28 md:self-start">
        <IssueCover id={issue.id} number={issue.number} isSpecial={issue.is_special} size="lg"
          volumeLabel={issue.volumes ? t("archives.volume", { n: issue.volumes.number, year: issue.volumes.year }) : ""}
          topic={topicOf((articles ?? []) as unknown as ListedArticle[])} />
      </div>
      <div className="card">
        <h1 className="text-3xl">{issueLabel(t, issue)}</h1>
        {tr(issue.title, locale) && <p className="mt-1 text-lg text-slate-700">{tr(issue.title, locale)}</p>}
        {issue.published_at && (
          <p className="mt-1 text-sm text-slate-500">
            {t("issue.published", { date: formatDate(issue.published_at, locale) })}
          </p>
        )}
        {tr(issue.description, locale) && (
          <div className="prose-content mt-4 text-slate-700" dangerouslySetInnerHTML={{ __html: cleanHtml(tr(issue.description, locale)) }} />
        )}
        <h2 className="mt-8 border-b border-slate-200 pb-2 text-xl">{t("issue.articles")}</h2>
        <ArticleList articles={(articles ?? []) as unknown as ListedArticle[]} />
      </div>
      </div>
    </div>
  );
}
