export type I18nText = Partial<Record<"uz" | "ru" | "en", string>> | null | undefined;

/** Pick the right language from a {"uz","ru","en"} jsonb field, with fallbacks. */
export function tr(value: I18nText, locale: string): string {
  if (!value) return "";
  const v = value as Record<string, string | undefined>;
  return v[locale] || v.uz || v.en || v.ru || Object.values(v).find(Boolean) || "";
}

export function formatDate(d: string | null | undefined, locale: string) {
  if (!d) return "";
  const tag = locale === "uz" ? "uz-Latn-UZ" : locale === "ru" ? "ru-RU" : "en-GB";
  return new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(d),
  );
}

/** Only the exact language, no fallback — for optional translations of an original text. */
export function trExact(value: I18nText, locale: string): string {
  return (value as Record<string, string | undefined> | null | undefined)?.[locale] ?? "";
}
