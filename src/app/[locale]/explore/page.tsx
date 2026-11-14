import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { trExact } from "@/lib/i18n-field";
import type { Article } from "@/lib/types";
import ArticleNetwork, { type NetEdge, type NetNode } from "@/components/fx/ArticleNetwork";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("x");
  return { title: t("explore"), description: t("exploreText"), alternates: alternates(await getLocale(), "/explore") };
}

export default async function ExplorePage({ params }: PageProps<"/[locale]/explore">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const supabase = await createClient();
  const { data } = await supabase.from("articles").select("id, title, title_i18n, keywords, authors").eq("status", "published");
  const arts = (data ?? []) as Pick<Article, "id" | "title" | "title_i18n" | "keywords" | "authors">[];
  const nodes: NetNode[] = arts.map((a) => ({
    id: a.id, title: trExact(a.title_i18n, locale) || a.title, authors: a.authors.map((x) => x.name).join(", "),
    keywords: a.keywords.map((k) => k.toLowerCase().trim()),
  }));
  // join articles that share keywords; if a journal has few overlaps, also join by shared first author word
  const edges: NetEdge[] = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const shared = nodes[i].keywords.filter((k) => nodes[j].keywords.includes(k));
    if (shared.length) edges.push([i, j, shared]);
  }
  // keep isolated articles near the rest: link each to its most similar article by keyword words
  nodes.forEach((n, i) => {
    if (edges.some(([a, b]) => a === i || b === i)) return;
    const words = new Set(n.keywords.flatMap((k) => k.split(/\s+/)));
    let best = -1, score = 0;
    nodes.forEach((m, j) => {
      if (i === j) return;
      const s = m.keywords.flatMap((k) => k.split(/\s+/)).filter((w) => w.length > 3 && words.has(w)).length;
      if (s > score) { score = s; best = j; }
    });
    if (best >= 0) edges.push([Math.min(i, best), Math.max(i, best), []]);
  });

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-light sm:text-5xl">{t("x.explore")}</h1>
        <p className="mt-4 text-slate-600">{t("x.exploreText")}</p>
      </div>
      <ArticleNetwork nodes={nodes} edges={edges} />
      <Link href="/archives" className="text-sm font-semibold text-brand-700 hover:underline">{t("nav.archives")}</Link>
    </div>
  );
}
