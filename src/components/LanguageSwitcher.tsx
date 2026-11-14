"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <div className="flex rounded-full border border-slate-200 p-0.5" role="group" aria-label="Language">
      {routing.locales.map((l) => (
        <button
          key={l}
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => start(() => router.replace(pathname, { locale: l as Locale }))}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${l === locale ? "bg-slate-900 text-ink" : "text-slate-600 hover:text-slate-900"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
