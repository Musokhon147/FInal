import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { cleanHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { dateRange, daysUntil } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import type { Conference } from "@/lib/types";
import IssueCover from "@/components/design/IssueCover";
import ArticleList, { ARTICLE_LIST_SELECT, topicOf, type ListedArticle } from "@/components/public/ArticleList";
import Countdown from "@/components/fx/Countdown";

type Proc = { id: string; number: number; is_special: boolean; status: string; volumes: { number: number; year: number } | null };

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("conferences").select("*").eq("id", id).maybeSingle<Conference>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/conferences/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await load(id);
  const locale = await getLocale();
  return c ? { title: tr(c.title, locale), description: tr(c.location, locale), alternates: alternates(locale, `/conferences/${id}`) } : {};
}

export default async function ConferencePage({ params }: PageProps<"/[locale]/conferences/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const c = await load(id);
  if (!c) notFound();
  const supabase = await createClient();
  const { data: issues } = await supabase.from("issues").select("id, number, is_special, status, volumes(number, year)").eq("conference_id", c.id).eq("status", "published");
  const procs = (issues ?? []) as unknown as Proc[];
  const { data: arts } = procs.length
    ? await supabase.from("articles").select(ARTICLE_LIST_SELECT).in("issue_id", procs.map((p) => p.id)).eq("status", "published").order("first_page")
    : { data: [] };
  const articles = (arts ?? []) as unknown as ListedArticle[];
  const regLeft = daysUntil(c.registration_deadline);

  return (
    <div className="space-y-10">
      <Link href="/conferences" className="text-sm text-brand-700 hover:underline">← {t("x.conferences")}</Link>
      <header className="card relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm text-accent">{t("x.conference")}</p>
            <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{tr(c.title, locale)}</h1>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
              <div><dt className="text-slate-500">{t("x.dates")}</dt><dd className="mt-1 text-slate-900">{dateRange(c.start_date, c.end_date, locale)}</dd></div>
              <div><dt className="text-slate-500">{t("x.location")}</dt><dd className="mt-1 text-slate-900">{tr(c.location, locale)}</dd></div>
              {c.registration_deadline && <div><dt className="text-slate-500">{t("x.regDeadline")}</dt><dd className="mt-1 text-slate-900">{formatDate(c.registration_deadline, locale)}</dd></div>}
            </dl>
          </div>
          {regLeft !== null && c.registration_deadline && (
            <div className="flex flex-col items-start gap-4 lg:items-end">
              <Countdown until={new Date(c.registration_deadline + "T23:59:59").toISOString()} />
              <Link href="/dashboard/submit" className="btn-gold px-7 py-3">{t("x.submitToConference")}</Link>
            </div>
          )}
        </div>
      </header>

      {tr(c.description, locale) && (
        <article className="card p-8">
          <div className="prose-content max-w-[70ch]" dangerouslySetInnerHTML={{ __html: cleanHtml(tr(c.description, locale)) }} />
        </article>
      )}

      <section>
        <h2 className="mb-6 text-2xl">{t("x.proceedings")}</h2>
        {!procs.length ? <p className="text-slate-500">{t("x.proceedingsSoon")}</p> : (
          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            <div className="space-y-4">
              {procs.map((p) => (
                <Link key={p.id} href={`/issue/${p.id}`} className="block">
                  <IssueCover id={p.id} number={p.number} isSpecial={p.is_special} size="lg"
                    volumeLabel={p.volumes ? t("archives.volume", { n: p.volumes.number, year: p.volumes.year }) : ""} topic={topicOf(articles)} />
                </Link>
              ))}
            </div>
            <div className="card p-2 sm:p-4"><ArticleList articles={articles} /></div>
          </div>
        )}
      </section>
    </div>
  );
}
