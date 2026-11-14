import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { cfpWindow, getJournal, getJournalNumbers } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import { issueLabel } from "@/lib/issue-label";
import type { NewsItem } from "@/lib/types";
import ArticleList, { ARTICLE_LIST_SELECT, topicOf, type ListedArticle } from "@/components/public/ArticleList";
import IssueCover from "@/components/design/IssueCover";
import Countdown from "@/components/fx/Countdown";
import NewsCard from "@/components/design/NewsCard";
import FoldTitle from "@/components/design/FoldTitle";
import HeroTiles from "@/components/design/HeroTiles";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  return { alternates: alternates(locale, "") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const supabase = await createClient();
  const [journal, numbers] = await Promise.all([getJournal(), getJournalNumbers(locale)]);

  const [{ data: issue }, { data: newsRows }] = await Promise.all([
    supabase.from("issues").select("id, number, is_special, title, published_at, volumes(number, year)")
      .eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("news").select("*").order("pinned", { ascending: false }).order("date", { ascending: false }).limit(3),
  ]);
  const { data: arts } = issue
    ? await supabase.from("articles").select(ARTICLE_LIST_SELECT).eq("issue_id", issue.id).eq("status", "published").order("sort_order").order("first_page")
    : { data: [] };
  const articles = (arts ?? []) as unknown as ListedArticle[];
  const steps = t.raw("x.steps") as [string, string][];
  const cfp = cfpWindow(journal?.cfp_deadline);
  const cfpEnd = cfp?.end ?? null;
  const cfpOpen = cfp?.open ?? false;
  const news = (newsRows ?? []) as NewsItem[];
  const vol = issue?.volumes as unknown as { number: number; year: number } | null;
  const figures: [number, string, string][] = [
    [numbers.articles, "", t("x.nArticles")],
    [numbers.countries, "", t("x.nCountries")],
    [numbers.days, "", t("x.nDays")],
    [numbers.rate, "%", t("x.nRate")],
  ];

  return (
    <div className="-mt-10 space-y-6">
      {/* hero — the particle star sits to the right on wide screens */}
      <section className="relative isolate flex min-h-[calc(100vh-7rem)] items-center pb-16 pt-10">
        <HeroTiles />
        <div className="max-w-2xl">
          <FoldTitle text={tr(journal?.title, locale)} delay={0.3}
            className="font-serif text-[clamp(2.75rem,7vw,5.75rem)] font-light leading-[0.98] tracking-[-0.03em] text-slate-900" />
          <p className="reveal mt-7 max-w-xl text-lg leading-relaxed text-slate-600" style={{ animationDelay: ".55s" }}>{tr(journal?.description, locale)}</p>
          <div className="reveal mt-9 flex flex-wrap gap-3" style={{ animationDelay: ".7s" }}>
            <Link href="/dashboard/submit" data-magnetic className="btn-gold px-7 py-3 text-base">{t("home.cta")}</Link>
            {issue && <Link href={`/issue/${issue.id}`} data-magnetic className="btn-secondary px-7 py-3 text-base">{t("nav.current")}</Link>}
          </div>
          <dl className="reveal mt-14 flex flex-wrap gap-x-10 gap-y-4 text-sm" style={{ animationDelay: ".9s" }}>
            <div><dt className="text-slate-500">{t("x.langsLabel")}</dt><dd className="mt-1 text-slate-900">O&apos;zbek, Русский, English</dd></div>
            <div><dt className="text-slate-500">{t("x.published")}</dt><dd className="mt-1 text-slate-900">{numbers.articles}</dd></div>
            {journal?.issn_online && <div><dt className="text-slate-500">ISSN</dt><dd className="mt-1 text-slate-900">{journal.issn_online}</dd></div>}
          </dl>
        </div>
      </section>

      {!!journal?.indexes?.length && (
        <section data-reveal className="py-6">
          <h2 className="text-sm font-medium text-slate-500">{t("x.indexedIn")}</h2>
          <ul className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
            {journal.indexes.map((n) => <li key={n} className="font-serif text-lg text-slate-600 transition hover:text-slate-900 sm:text-xl">{n}</li>)}
          </ul>
        </section>
      )}

      {issue && (
        <section data-reveal id="current" className="scroll-mt-24 py-12">
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Link href={`/issue/${issue.id}`} className="block">
                <IssueCover id={issue.id} number={issue.number} isSpecial={issue.is_special} size="lg"
                  volumeLabel={vol ? t("archives.volume", { n: vol.number, year: vol.year }) : ""} topic={topicOf(articles)} />
              </Link>
              <h2 className="mt-6 text-2xl">{t("home.currentIssue")}</h2>
              <p className="mt-2 text-sm text-slate-500">{issueLabel(t, issue as never)}<br />{formatDate(issue.published_at, locale)}</p>
              <Link href={`/issue/${issue.id}`} className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">{t("home.viewIssue")}</Link>
            </div>
            <div className="card p-2 sm:p-4"><ArticleList articles={articles} /></div>
          </div>
        </section>
      )}

      {cfpEnd && (
        <section data-reveal className="py-6">
          <div className="card relative overflow-hidden border-accent/40 p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-3xl">{cfpOpen ? t("x.cfpTitle") : t("x.cfpClosed")}</h2>
                <p className="mt-3 text-slate-600">{tr(journal?.cfp_text, locale)}</p>
                <p className="mt-3 text-sm text-accent">{t("x.cfpDeadline")}: {formatDate(cfpEnd.toISOString(), locale)}</p>
              </div>
              {cfpOpen && (
                <div className="flex flex-col items-start gap-5 lg:items-end">
                  <Countdown until={cfpEnd.toISOString()} />
                  <Link href="/dashboard/submit" className="btn-gold px-7 py-3">{t("home.cta")}</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section data-reveal className="py-12">
        <h2 className="text-3xl sm:text-4xl">{t("x.numbersTitle")}</h2>
        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {figures.map(([n, suf, label]) => (
            <div key={label} className="border-t border-slate-200 pt-5">
              <dt className="sr-only">{label}</dt>
              <dd className="font-serif text-5xl font-light tabular-nums text-slate-900"><span data-count={n}>{n}</span>{suf}</dd>
              <dd className="mt-2 text-sm text-slate-500">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section data-reveal className="py-12">
        <h2 className="max-w-xl text-3xl leading-tight sm:text-4xl">{t("x.howTitle")}</h2>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([h, p], i) => (
            <li key={h} className="step bg-slate-50/85 p-7 backdrop-blur" style={{ transitionDelay: `${i * 140}ms` }}>
              <span className="step-num font-serif text-4xl font-light text-accent">{i + 1}</span>
              <h3 className="mt-6 text-lg">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{p}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/dashboard/submit" className="btn-primary px-6 py-3">{t("home.cta")}</Link>
          <Link href="/p/author-guidelines" className="text-sm font-semibold text-brand-700 hover:underline">{t("nav.forAuthors")}</Link>
        </div>
      </section>

      {news.length > 0 && (
        <section data-reveal className="py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-3xl sm:text-4xl">{t("x.news")}</h2>
            <Link href="/news" className="text-sm font-semibold text-brand-700 hover:underline">{t("x.allNews")}</Link>
          </div>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">{news.map((n) => <NewsCard key={n.id} item={n} locale={locale} />)}</ul>
        </section>
      )}
    </div>
  );
}
