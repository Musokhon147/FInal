import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { routing } from "@/i18n/routing";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL, articleLocale } from "@/lib/site";
import { pageHref } from "@/lib/data";

// built on every request (a few small queries), so search engines always see the current articles
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const supabase = createPublicClient();
  const [{ data: issues }, { data: articles }, { data: news }, { data: pages }, { data: conferences }] = await Promise.all([
    supabase.from("issues").select("id, published_at").eq("status", "published"),
    supabase.from("articles").select("id, language, published_at, updated_at").eq("status", "published"),
    supabase.from("news").select("id, date"),
    supabase.from("pages").select("slug, updated_at").eq("is_published", true),
    supabase.from("conferences").select("id, updated_at"),
  ]);
  const entry = (path: string, lastModified?: string | null, priority = 0.6, locale: string = routing.defaultLocale): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  });
  return [
    entry("", null, 1),
    entry("/archives", null, 0.8),
    entry("/board", null, 0.5),
    entry("/news", null, 0.5),
    entry("/conferences", null, 0.6),
    entry("/explore", null, 0.4),
    entry("/current", null, 0.7),
    entry("/current/conferences", null, 0.6),
    ...((issues ?? []) as { id: string; published_at: string | null }[]).map((i) => entry(`/issue/${i.id}`, i.published_at, 0.7)),
    // each article under its own language: the address Google Scholar and the DOI use
    ...((articles ?? []) as { id: string; language: string; published_at: string | null; updated_at?: string }[])
      .map((a) => entry(`/article/${a.id}`, a.updated_at ?? a.published_at, 0.9, articleLocale(a.language))),
    ...((news ?? []) as { id: string; date: string }[]).map((n) => entry(`/news/${n.id}`, n.date, 0.4)),
    ...((pages ?? []) as { slug: string; updated_at?: string }[]).map((p) => entry(pageHref(p.slug), p.updated_at, 0.5)),
    ...((conferences ?? []) as { id: string; updated_at?: string }[]).map((c) => entry(`/conferences/${c.id}`, c.updated_at, 0.6)),
  ];
}
