import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";
import { publicFileUrl } from "@/lib/supabase/env";
import IssueCover from "@/components/design/IssueCover";
import { topicOf } from "@/components/public/ArticleList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pt");
  return { title: t("currentConference"), alternates: alternates(await getLocale(), "/current/conferences") };
}

type Row = {
  id: string; number: number; is_special: boolean; title: I18nText; published_at: string | null; cover_url: string | null; pdf_path: string | null;
  conferences: { id: string; title: I18nText; scope: "local" | "international"; start_date: string; location: I18nText } | null;
  articles: { id: string; title: string; title_i18n: I18nText; authors: { name: string }[]; keywords: string[] }[];
};

/** The newest collection of theses for each kind of conference. */
export default async function CurrentConferences({ params }: PageProps<"/[locale]/current/conferences">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id, number, is_special, title, published_at, cover_url, pdf_path, conferences(id, title, scope, start_date, location), articles(id, title, title_i18n, authors, keywords)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.conferences);
  const latest = (["local", "international"] as const).map((scope) => ({ scope, issue: rows.find((r) => r.conferences!.scope === scope) }));

  return (
    <div>
      <h1 className="text-4xl font-light sm:text-5xl">{t("pt.currentConference")}</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {latest.map(({ scope, issue }) => (
          <section key={scope} className="card p-6 sm:p-8" aria-labelledby={`cur-${scope}`}>
            <h2 id={`cur-${scope}`} className="text-sm font-semibold text-accent">{t(scope === "local" ? "pt.localShort" : "pt.internationalShort")}</h2>
            {!issue ? (
              <p className="mt-4 text-slate-500">{t("pt.noCollections")}</p>
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-[160px_1fr]">
                <Link href={`/issue/${issue.id}`} className="block">
                  <IssueCover id={issue.id} number={issue.number} isSpecial={issue.is_special} volumeLabel={tr(issue.conferences!.title, locale)}
                    topic={topicOf(issue.articles)} coverUrl={issue.cover_url} hasPdf={!!issue.pdf_path} />
                </Link>
                <div className="min-w-0">
                  <p className="font-serif text-2xl leading-snug text-slate-900">{tr(issue.conferences!.title, locale)}</p>
                  {tr(issue.title, locale) && <p className="mt-1 text-slate-700">{tr(issue.title, locale)}</p>}
                  <p className="mt-2 text-sm text-slate-500">
                    {[formatDate(issue.conferences!.start_date, locale), tr(issue.conferences!.location, locale)].filter(Boolean).join(" · ")}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {issue.articles.slice(0, 4).map((a) => (
                      <li key={a.id}>
                        <Link href={`/article/${a.id}`} className="font-medium text-slate-900 hover:text-brand-700">{tr(a.title_i18n, locale) || a.title}</Link>
                        <span className="block text-xs text-slate-500">{a.authors.map((x) => x.name).join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={`/issue/${issue.id}`} className="btn-primary">{t("pt.openCollection")} ({t("pt.papers", { n: issue.articles.length })})</Link>
                    {issue.pdf_path && <a href={publicFileUrl("articles", issue.pdf_path)} className="btn-secondary" download>{t("pt.fullPdf")}</a>}
                  </div>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/conferences" className="font-semibold text-brand-700 hover:underline">{t("nav.conferences")}</Link>
        <Link href="/archives?type=local" className="font-semibold text-brand-700 hover:underline">{t("pt.localShort")}</Link>
        <Link href="/archives?type=international" className="font-semibold text-brand-700 hover:underline">{t("pt.internationalShort")}</Link>
      </p>
    </div>
  );
}
