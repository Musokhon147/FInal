import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import ArticleList, { ARTICLE_LIST_SELECT, type ListedArticle } from "@/components/public/ArticleList";
import { findSnippet, type Snippet } from "@/lib/snippet";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  const locale = await getLocale();
  return { title: t("title"), alternates: alternates(locale, "/search") };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  await initLocale(params);
  const t = await getTranslations("search");
  const tx = await getTranslations("x");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 200);

  let results: ListedArticle[] = [];
  const snippets: Record<string, Snippet> = {};
  if (q) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select(`${ARTICLE_LIST_SELECT}, abstract, full_text`)
      .eq("status", "published")
      .textSearch("search", q, { type: "websearch", config: "simple" })
      .order("published_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as unknown as (ListedArticle & { abstract: string; full_text: string | null })[];
    for (const r of rows) {
      // say where the words were found when it isn't the title
      const inTitle = findSnippet(`${r.title} ${Object.values(r.title_i18n ?? {}).join(" ")} ${r.keywords.join(" ")} ${r.authors.map((x) => x.name).join(" ")}`, q);
      if (inTitle) continue;
      const s = findSnippet(r.abstract, q, "abstract") ?? findSnippet(r.full_text ?? "", q, "text");
      if (s) snippets[r.id] = s;
    }
    results = rows; // extra fields are ignored by the list
  }

  return (
    <div className="card">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mb-4 mt-2 text-sm text-slate-500">{tx("searchHint")}</p>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("placeholder")} className="input" />
        <button className="btn-primary">{t("button")}</button>
      </form>
      {q && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-slate-500">
            {results.length ? t("results", { count: results.length }) : t("empty")}
          </p>
          {results.length > 0 && <ArticleList articles={results} snippets={snippets} />}
        </div>
      )}
    </div>
  );
}
