import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import ArticleList, { ARTICLE_LIST_SELECT, type ListedArticle } from "@/components/public/ArticleList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  return { title: t("title") };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  await initLocale(params);
  const t = await getTranslations("search");
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 200);

  let results: ListedArticle[] = [];
  if (q) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select(ARTICLE_LIST_SELECT)
      .eq("status", "published")
      .textSearch("search", q, { type: "websearch", config: "simple" })
      .order("published_at", { ascending: false })
      .limit(50);
    results = (data ?? []) as unknown as ListedArticle[];
  }

  return (
    <div className="card">
      <h1 className="mb-4 text-3xl">{t("title")}</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("placeholder")} className="input" />
        <button className="btn-primary">{t("button")}</button>
      </form>
      {q && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-slate-500">
            {results.length ? t("results", { count: results.length }) : t("empty")}
          </p>
          {results.length > 0 && <ArticleList articles={results} />}
        </div>
      )}
    </div>
  );
}
