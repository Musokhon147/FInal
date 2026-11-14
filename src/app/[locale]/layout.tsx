import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getJournal } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const journal = await getJournal();
  const name = tr(journal?.title, locale) || "Journal";
  return {
    title: { default: name, template: `%s | ${name}` },
    description: tr(journal?.description, locale),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const td = await getTranslations("demo");

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          {IS_DEMO && (
            <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">{td("banner")}</div>
          )}
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
