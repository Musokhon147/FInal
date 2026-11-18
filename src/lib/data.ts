import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { CmsPage, Journal } from "./types";
import { formatDate } from "./i18n-field";

export const getJournal = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journals")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle<Journal>();
  return data;
});

/** Where a CMS page lives. The author guidelines page is shown inside "For authors" (with the per-type samples). */
export const pageHref = (slug: string) => (slug === AUTHOR_PAGE ? "/for-authors" : `/p/${slug}`);
export const AUTHOR_PAGE = "author-guidelines";

export const getMenuPages = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, slug, title, sort_order")
    .eq("show_in_menu", true)
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as Pick<CmsPage, "id" | "slug" | "title" | "sort_order">[];
});

export function pagesRange(first: number | null, last: number | null) {
  if (!first) return "";
  return last && last !== first ? `${first}–${last}` : String(first);
}

/* ---------- countries: merge spellings in Uzbek / Russian / English */
const COUNTRIES: Record<string, { uz: string; ru: string; en: string; a: string[] }> = {
  UZ: { uz: "O'zbekiston", ru: "Узбекистан", en: "Uzbekistan", a: ["o'zbekiston", "uzbekistan", "узбекистан", "ўзбекистон"] },
  KZ: { uz: "Qozog'iston", ru: "Казахстан", en: "Kazakhstan", a: ["qozog'iston", "kazakhstan", "казахстан"] },
  KG: { uz: "Qirg'iziston", ru: "Кыргызстан", en: "Kyrgyzstan", a: ["qirg'iziston", "kyrgyzstan", "кыргызстан", "киргизия"] },
  TJ: { uz: "Tojikiston", ru: "Таджикистан", en: "Tajikistan", a: ["tojikiston", "tajikistan", "таджикистан"] },
  TM: { uz: "Turkmaniston", ru: "Туркменистан", en: "Turkmenistan", a: ["turkmaniston", "turkmenistan", "туркменистан"] },
  RU: { uz: "Rossiya", ru: "Россия", en: "Russia", a: ["rossiya", "russia", "россия"] },
  TR: { uz: "Turkiya", ru: "Турция", en: "Türkiye", a: ["turkiya", "turkey", "türkiye", "турция"] },
  KR: { uz: "Koreya", ru: "Корея", en: "Korea", a: ["koreya", "korea", "south korea", "корея"] },
  DE: { uz: "Germaniya", ru: "Германия", en: "Germany", a: ["germaniya", "germany", "германия"] },
};
/** Approximate centre of each country, for the authors globe. */
export const COUNTRY_LATLON: Record<string, [number, number]> = {
  UZ: [41.4, 64.6], KZ: [48.0, 67.0], KG: [41.2, 74.8], TJ: [38.9, 71.3], TM: [39.0, 59.6],
  RU: [56.0, 60.0], TR: [39.0, 35.2], KR: [36.5, 127.8], DE: [51.2, 10.4],
};

export function countryOf(aff: string | null | undefined, locale: string) {
  const raw = (aff || "").split(",").pop()?.trim();
  if (!raw) return null;
  const low = raw.toLowerCase().replace(/[ʻʼ‘’`]/g, "'");
  for (const [code, c] of Object.entries(COUNTRIES)) if (c.a.includes(low)) return { key: code, label: c[locale as "uz"] ?? c.en };
  return { key: low, label: raw };
}

/** Public figures for "the journal in numbers", all computed from the data. */
export const getJournalNumbers = cache(async (locale: string) => {
  const supabase = await createClient();
  const [{ data: arts }, { data: rpc }] = await Promise.all([
    supabase.from("articles").select("authors").eq("status", "published"),
    supabase.rpc("journal_numbers"),
  ]);
  const list = (arts ?? []) as { authors: { affiliation?: string }[] }[];
  const countries = new Set<string>();
  list.forEach((a) => a.authors.forEach((au) => { const c = countryOf(au.affiliation, locale); if (c) countries.add(c.key); }));
  const row = (Array.isArray(rpc) ? rpc[0] : rpc) as { decision_days: number; acceptance_rate: number } | null;
  return {
    articles: list.length,
    countries: countries.size,
    days: Number(row?.decision_days ?? 0),
    rate: Number(row?.acceptance_rate ?? 0),
  };
});

/** Call-for-papers window: end of the deadline day, and whether it is still open. */
export function cfpWindow(deadline: string | null | undefined) {
  if (!deadline) return null;
  const end = new Date(deadline + "T23:59:59");
  return { end, open: end.getTime() > Date.now() };
}

/* ---------- conferences */
export function dateRange(start: string, end: string | null | undefined, locale: string) {
  const f = (d: string) => formatDate(d, locale);
  return end && end !== start ? `${f(start)} – ${f(end)}` : f(start);
}
/** Split into upcoming (soonest first) and past (latest first). */
export function splitConferences<T extends { start_date: string; end_date: string | null }>(list: T[]) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = list.filter((c) => (c.end_date ?? c.start_date) >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = list.filter((c) => (c.end_date ?? c.start_date) < today).sort((a, b) => b.start_date.localeCompare(a.start_date));
  return { upcoming, past };
}
/** Conferences authors can still send theses to: upcoming ones, plus those that ended in the last 60 days (proceedings still being collected). */
export function upcomingConferences<T extends { start_date: string; end_date: string | null }>(list: T[]) {
  const cutoff = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  return list.filter((c) => (c.end_date ?? c.start_date) >= cutoff).sort((a, b) => a.start_date.localeCompare(b.start_date));
}
export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const d = Math.ceil((Date.parse(date + "T23:59:59") - Date.now()) / 864e5);
  return d >= 0 ? d : null;
}

/** True once a due date has passed (used for reviews). */
export function isOverdue(due: string) {
  return Date.parse(due) < Date.now();
}
