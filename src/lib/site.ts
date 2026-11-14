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
