import { getLocale, getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { Link } from "@/i18n/navigation";
import { tr, trExact, type I18nText } from "@/lib/i18n-field";
import { pagesRange } from "@/lib/data";
import type { Article } from "@/lib/types";

export type ListedArticle = Pick<
  Article,
  "id" | "title" | "title_i18n" | "authors" | "first_page" | "last_page" | "doi" | "pdf_path" | "keywords"
> & { sections?: { title: I18nText } | null };

export default async function ArticleList({ articles }: { articles: ListedArticle[] }) {
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
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {range && <span className="text-slate-500">{t("issue.pages", { range })}</span>}
              {a.doi && <a href={`https://doi.org/${a.doi}`} className="text-brand-700 hover:underline" target="_blank" rel="noreferrer">DOI: {a.doi}</a>}
              {a.pdf_path && <a href={`/api/download/${a.id}`} className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700 hover:bg-brand-100">PDF</a>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const ARTICLE_LIST_SELECT =
  "id, title, title_i18n, authors, first_page, last_page, doi, pdf_path, keywords, sections(title)";

/** Most frequent keyword among an issue's articles (shown on its cover). */
export function topicOf(articles: { keywords: string[] }[]) {
  const count: Record<string, number> = {};
  articles.forEach((a) => a.keywords.forEach((k) => (count[k] = (count[k] || 0) + 1)));
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
