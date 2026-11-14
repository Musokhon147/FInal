import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { CmsPage, Journal } from "./types";

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
