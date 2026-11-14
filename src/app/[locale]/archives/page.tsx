import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";
import IssueCover from "@/components/design/IssueCover";
import { topicOf } from "@/components/public/ArticleList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("archives");
  const locale = await getLocale();
  return { title: t("title"), alternates: alternates(locale, "/archives") };
}

type Row = {
  id: string; number: number; year: number;
  issues: { id: string; number: number; is_special: boolean; title: I18nText; published_at: string | null; status: string; articles: { keywords: string[] }[] }[];
};

export default async function ArchivesPage({ params }: PageProps<"/[locale]/archives">) {
  const locale = await initLocale(params);
  const t = await getTranslations("archives");
  const supabase = await createClient();
  const { data } = await supabase
    .from("volumes")
    .select("id, number, year, issues(id, number, is_special, title, published_at, status, articles(keywords))")
    .order("number", { ascending: false });
  const volumes = ((data ?? []) as Row[])
    .map((v) => ({ ...v, issues: v.issues.filter((i) => i.status === "published").sort((a, b) => b.number - a.number || Number(a.is_special) - Number(b.is_special)) }))
    .filter((v) => v.issues.length);

  return (
    <div>
      <h1 className="text-4xl font-light sm:text-5xl">{t("title")}</h1>
      {!volumes.length && <p className="mt-6 text-slate-500">{t("empty")}</p>}
      <div className="mt-12 space-y-14">
        {volumes.map((v) => (
          <section key={v.id}>
            <h2 className="mb-6 border-b border-slate-200 pb-3 text-xl">{t("volume", { n: v.number, year: v.year })}</h2>
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {v.issues.map((i) => (
                <li key={i.id}>
                  <Link href={`/issue/${i.id}`} className="group block">
                    <IssueCover id={i.id} number={i.number} isSpecial={i.is_special} volumeLabel={t("volume", { n: v.number, year: v.year })} topic={topicOf(i.articles ?? [])} />
                    <p className="mt-3 text-sm font-semibold text-slate-900">{i.is_special ? `${t("special")} ${i.number}` : t("issue", { n: i.number })}</p>
                    {tr(i.title, locale) && <p className="text-xs text-slate-500">{tr(i.title, locale)}</p>}
                    <p className="text-xs text-slate-500">{formatDate(i.published_at, locale)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
