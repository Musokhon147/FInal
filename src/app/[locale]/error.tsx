"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("x");
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <h1 className="text-3xl">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-md text-slate-600">{t("errorText")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={reset} className="btn-primary">{t("retry")}</button>
        <Link href="/" className="btn-secondary">{t("goHome")}</Link>
      </div>
    </div>
  );
}
