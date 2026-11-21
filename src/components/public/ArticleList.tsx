import { getLocale, getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { Link } from "@/i18n/navigation";
import { tr, trExact, type I18nText } from "@/lib/i18n-field";
import { pagesRange } from "@/lib/data";
import type { Article } from "@/lib/types";
import { isDoi } from "@/lib/identifiers";

export type ListedArticle = Pick<
  Article,
  "id" | "title" | "title_i18n" | "authors" | "first_page" | "last_page" | "doi" | "pdf_path" | "keywords"
> & { sections?: { title: I18nText } | null; views?: number; downloads?: number };

/** `snippets` (search results): a short passage around the match, keyed by article id. */
export default async function ArticleList({ articles, snippets }: { articles: ListedArticle[]; snippets?: Record<string, { before: string; hit: string; after: string; where: "text" | "abstract" }> }) {
  const t = await getTranslations();
  const locale = await getLocale();
  if (!articles.length) return <p className="p-4 text-slate-500">{t("issue.empty")}</p>;
  return (
    <ul className="divide-y divide-slate-200">
      {articles.map((a) => {
        const range = pagesRange(a.first_page, a.last_page);
        return (
          <li key={a.id} className="p-4">
            {a.sections && <p className="mb-1 text-xs font-medium text-accent">{tr(a.sections.title, locale)}</p>}
            <Link href={`/article/${a.id}`} className="text-lg font-semibold leading-snug text-slate-900 transition hover:text-brand-700">
              <ViewTransition name={`title-${a.id.replace(/[^a-z0-9]/gi, "")}`} share="morph" default="none">
                <span className="inline-block">{trExact(a.title_i18n, locale) || a.title}</span>
              </ViewTransition>
            </Link>
            <p className="mt-1 text-sm text-slate-600">{a.authors.map((au) => au.name).join(", ")}</p>
            {snippets?.[a.id] && (
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                <span className="mr-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{t(snippets[a.id].where === "text" ? "x.foundInText" : "x.foundInAbstract")}</span>
                …{snippets[a.id].before}<mark className="rounded bg-accent/25 px-0.5 text-slate-900">{snippets[a.id].hit}</mark>{snippets[a.id].after}…
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {range && <span className="text-slate-500">{t("issue.pages", { range })}</span>}
              {isDoi(a.doi) && <a href={`https://doi.org/${a.doi}`} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">DOI: {a.doi}</a>}
              {a.pdf_path && <a href={`/api/download/${a.id}`} className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700 hover:bg-brand-100">PDF</a>}
              {typeof a.views === "number" && (
                <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                  <span title={t("article.views")} className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg><span className="sr-only">{t("article.views")}: </span>{a.views}</span>
                  <span title={t("article.downloads")} className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" /></svg><span className="sr-only">{t("article.downloads")}: </span>{a.downloads ?? 0}</span>
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const ARTICLE_LIST_SELECT =
  "id, title, title_i18n, authors, first_page, last_page, doi, pdf_path, keywords, views, downloads, sections(title)";

/** Most frequent keyword among an issue's articles (shown on its cover). */
export function topicOf(articles: { keywords: string[] }[]) {
  const count: Record<string, number> = {};
  articles.forEach((a) => a.keywords.forEach((k) => (count[k] = (count[k] || 0) + 1)));
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
