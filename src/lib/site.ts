import { routing } from "@/i18n/routing";

/** Absolute site URL, used for the sitemap, canonical links and share previews. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** canonical + hreflang links for a page path (without the locale), e.g. "/archives". */
export function alternates(locale: string, path = "") {
  const p = path === "/" ? "" : path;
  return {
    canonical: `/${locale}${p}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${p}`])),
      "x-default": `/${routing.defaultLocale}${p}`,
    },
  };
}

/**
 * The one language version of an article that Google Scholar, Crossref and the indexes see:
 * the article's own language (uz / ru / en), else the default. The other two versions point to it.
 */
export function articleLocale(language: string | null | undefined): string {
  return (routing.locales as readonly string[]).includes(language ?? "") ? (language as string) : routing.defaultLocale;
}
export const articleUrl = (id: string, language?: string | null) => `${SITE_URL}/${articleLocale(language)}/article/${id}`;
