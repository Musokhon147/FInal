import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { IS_DEMO } from "@/lib/supabase/env";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SceneCanvas from "@/components/fx/SceneCanvas";
import Effects from "@/components/fx/Effects";
import NavProgress from "@/components/fx/NavProgress";
import ClickSparks from "@/components/fx/ClickSparks";
import Delight from "@/components/fx/Delight";
import Intro from "@/components/fx/Intro";
import ShootingStars from "@/components/fx/ShootingStars";
import { Suspense, ViewTransition } from "react";
import { THEME_SCRIPT } from "@/components/fx/ThemeToggle";
import { getJournal } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const journal = await getJournal();
  const name = tr(journal?.title, locale) || "Journal";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: name, template: `%s | ${name}` },
    description: tr(journal?.description, locale),
    openGraph: { siteName: name, type: "website", locale: locale === "uz" ? "uz_UZ" : locale === "ru" ? "ru_RU" : "en_GB" },
    twitter: { card: "summary_large_image" },
    // Google Search Console "HTML tag" verification, pasted in Settings
    verification: journal?.google_verification ? { google: journal.google_verification } : undefined,
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const td = await getTranslations("demo");

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* set the saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        <Intro />
        <NextIntlClientProvider>
          <Suspense fallback={null}><NavProgress /></Suspense>
          <SceneCanvas />
          <ClickSparks />
          <Delight />
          <ShootingStars />
          <Effects />
          <div className="relative z-10 flex min-h-screen flex-col">
            {IS_DEMO && (
              <div className="border-b border-accent/20 bg-accent/10 px-4 py-1.5 text-center text-xs text-accent print:hidden">{td("banner")}</div>
            )}
            <Header />
            <main className="flex-1"><ViewTransition name="page" default="page-star"><div id="page" className="mx-auto w-full max-w-7xl px-5 py-10">{children}</div></ViewTransition></main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
