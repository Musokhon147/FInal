import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("archives");
  return { title: t("title") };
}

type Row = {
  id: string;
  number: number;
  year: number;
  issues: { id: string; number: number; is_special: boolean; title: I18nText; published_at: string | null; status: string }[];
};

export default async function ArchivesPage({ params }: PageProps<"/[locale]/archives">) {
  const locale = await initLocale(params);
  const t = await getTranslations("archives");
  const supabase = await createClient();
  const { data } = await supabase
    .from("volumes")
    .select("id, number, year, issues(id, number, is_special, title, published_at, status)")
    .order("number", { ascending: false });

  const volumes = ((data ?? []) as Row[])
    .map((v) => ({
      ...v,
      issues: v.issues
        .filter((i) => i.status === "published")
        .sort((a, b) => b.number - a.number || Number(a.is_special) - Number(b.is_special)),
    }))
    .filter((v) => v.issues.length);

  return (
    <div>
      <h1 className="mb-6 text-3xl">{t("title")}</h1>
      {!volumes.length && <p className="text-slate-500">{t("empty")}</p>}
      <div className="space-y-4">
        {volumes.map((v, idx) => (
          <details key={v.id} className="card" open={idx === 0}>
            <summary className="cursor-pointer font-serif text-xl text-brand-900">
              {t("volume", { n: v.number, year: v.year })}
            </summary>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {v.issues.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/issue/${i.id}`}
                    className="block rounded-md border border-slate-200 p-4 hover:border-brand-600 hover:bg-brand-50"
                  >
                    <span className="font-medium text-brand-700">
                      {i.is_special ? `${t("special")} ${i.number}` : t("issue", { n: i.number })}
                    </span>
                    {tr(i.title, locale) && <span className="block text-sm text-slate-600">{tr(i.title, locale)}</span>}
                    {i.published_at && (
                      <span className="block text-xs text-slate-500">{formatDate(i.published_at, locale)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
