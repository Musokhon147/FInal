"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const t = useTranslations("langs");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label="Language"
      className="rounded border border-white/30 bg-transparent px-2 py-1 text-sm text-white [&>option]:text-slate-900"
      value={locale}
      disabled={pending}
      onChange={(e) =>
        start(() => {
          router.replace(pathname, { locale: e.target.value as (typeof routing.locales)[number] });
        })
      }
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {t(l)}
        </option>
      ))}
    </select>
  );
}
