import type { Article } from "@/lib/types";

export type RelatedCandidate = Pick<Article, "id" | "title" | "title_i18n" | "authors" | "keywords" | "published_at" | "section_id">;

/**
 * Articles that share the most keywords with this one. Exact keyword matches count most;
 * keywords that share a word ("digital economy" ~ "digital policy") count a little, so small journals still get suggestions.
 */
export function relatedArticles(keywords: string[], all: RelatedCandidate[], limit = 3, sectionId?: string | null) {
  const mine = keywords.map((k) => k.toLowerCase().trim());
  const words = new Set(mine.flatMap((k) => k.split(/[\s-]+/)).filter((w) => w.length > 3));
  return all
    .map((a) => {
      const theirs = a.keywords.map((k) => k.toLowerCase().trim());
      const shared = a.keywords.filter((_, i) => mine.includes(theirs[i]));
      const near = theirs.flatMap((k) => k.split(/[\s-]+/)).filter((w) => words.has(w)).length;
      return { ...a, shared, score: shared.length * 3 + near };
    })
    // with few keyword matches, fill up with the same section, then the newest articles
    .map((a) => ({ ...a, rank: a.score * 10 + (sectionId && a.section_id === sectionId ? 1 : 0) }))
    .sort((x, y) => y.rank - x.rank || String(y.published_at).localeCompare(String(x.published_at)))
    .slice(0, limit);
}
