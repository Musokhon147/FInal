import { getLocale, getTranslations } from "next-intl/server";
import { getJournal } from "@/lib/data";
import { tr } from "@/lib/i18n-field";

export default async function Footer() {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const journal = await getJournal();
  return (
    <footer className="mt-16 bg-brand-900 py-8 text-sm text-white/70">
      <div className="mx-auto max-w-6xl space-y-2 px-4">
        <p className="font-serif text-base text-white">{tr(journal?.title, locale)}</p>
        {journal?.publisher && <p>{journal.publisher}</p>}
        <p>{t("license")}</p>
        <p>© {new Date().getFullYear()} {t("rights")}</p>
      </div>
    </footer>
  );
}
