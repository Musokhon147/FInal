import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/** Read the [locale] param and enable static rendering helpers for next-intl. */
export async function initLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return locale as Locale;
}
