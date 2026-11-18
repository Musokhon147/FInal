import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";
import { ARCHIVE_TABS, PUB_TYPES, scopeOf, tabToType } from "@/lib/pubtypes";
import type { PubType } from "@/lib/types";
import IssueCover from "@/components/design/IssueCover";
import { topicOf } from "@/components/public/ArticleList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("archives");
  const locale = await getLocale();
  return { title: t("title"), alternates: alternates(locale, "/archives") };
}

type IssueRow = {
  id: string; number: number; is_special: boolean; title: I18nText; published_at: string | null; status: string;
  cover_url: string | null; pdf_path: string | null; conference_id: string | null;
  volumes: { id: string; number: number; year: number } | null;
  conferences: { id: string; title: I18nText; scope: "local" | "international"; start_date: string; location: I18nText } | null;
  articles: { keywords: string[] }[];
};

const typeOfIssue = (i: IssueRow): PubType =>
  !i.conferences ? "journal" : i.conferences.scope === "international" ? "international_conference" : "local_conference";

export default async function ArchivesPage({ params, searchParams }: PageProps<"/[locale]/archives">) {
  const locale = await initLocale(params);
  const t = await getTranslations("archives");
  const tx = await getTranslations("x");
  const tp = await getTranslations("pt");
  const { type } = await searchParams;
  const active = tabToType(type);
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id, number, is_special, title, published_at, status, cover_url, pdf_path, conference_id, volumes(id, number, year), conferences(id, title, scope, start_date, location), articles(keywords)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const all = (data ?? []) as unknown as IssueRow[];
  const count = (k: PubType) => all.filter((i) => typeOfIssue(i) === k).length;
  const issues = all.filter((i) => typeOfIssue(i) === active);

  // journal: shelves by volume; conferences: shelves by conference
  const groups = new Map<string, { key: string; heading: string; sub?: string; items: IssueRow[] }>();
  for (const i of issues) {
    const g = active === "journal"
      ? { key: i.volumes?.id ?? "-", heading: i.volumes ? t("volume", { n: i.volumes.number, year: i.volumes.year }) : "", sort: i.volumes?.number ?? 0 }
      : { key: i.conferences!.id, heading: tr(i.conferences!.title, locale), sub: [formatDate(i.conferences!.start_date, locale), tr(i.conferences!.location, locale)].filter(Boolean).join(" · ") };
    if (!groups.has(g.key)) groups.set(g.key, { key: g.key, heading: g.heading, sub: "sub" in g ? g.sub : undefined, items: [] });
    groups.get(g.key)!.items.push(i);
  }
  const shelves = [...groups.values()];
  if (active === "journal") shelves.forEach((s) => s.items.sort((a, b) => b.number - a.number || Number(a.is_special) - Number(b.is_special)));

  const tabLabel = (k: PubType) => tp(k === "journal" ? "journalShort" : k === "local_conference" ? "localShort" : "internationalShort");
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-light sm:text-5xl">{t("title")}</h1>
        <Link href="/explore" className="btn-secondary">{tx("exploreLink")}</Link>
      </div>

      <nav className="archive-tabs mt-8 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 p-1" aria-label={tp("catalog")}>
        {PUB_TYPES.map((k) => (
          <Link key={k} href={k === "journal" ? "/archives" : `/archives?type=${ARCHIVE_TABS[k]}`} scroll={false}
            aria-current={active === k ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition sm:flex-1 sm:justify-center ${active === k ? "bg-slate-900 text-slate-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
            {tabLabel(k)}
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${active === k ? "bg-slate-50/20" : "bg-slate-200"}`}>{count(k)}</span>
          </Link>
        ))}
      </nav>

      {!shelves.length && <p className="mt-10 text-slate-500">{active === "journal" ? t("empty") : tp("noCollections")}</p>}
      <div className="mt-12 space-y-14">
        {shelves.map((g) => (
          <section key={g.key}>
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-xl">{g.heading}</h2>
              {g.sub && <p className="mt-1 text-sm text-slate-500">{g.sub}</p>}
            </div>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-10 px-2 sm:grid-cols-3 lg:grid-cols-5">
              {g.items.map((i) => {
                const vol = i.volumes ? t("volume", { n: i.volumes.number, year: i.volumes.year }) : "";
                const name = tr(i.title, locale) || (i.is_special ? `${t("special")} ${i.number}` : t("issue", { n: i.number }));
                return (
                  <li key={i.id}>
                    <Link href={`/issue/${i.id}`} className="group block">
                      <IssueCover id={i.id} number={i.number} isSpecial={i.is_special} volumeLabel={scopeOf(active) ? tr(i.conferences?.title ?? {}, locale) : vol}
                        topic={topicOf(i.articles ?? [])} coverUrl={i.cover_url} hasPdf={!!i.pdf_path} />
                      <p className="mt-3 text-sm font-semibold text-slate-900">{active === "journal" ? (i.is_special ? `${t("special")} ${i.number}` : t("issue", { n: i.number })) : name}</p>
                      {active === "journal" && tr(i.title, locale) && <p className="text-xs text-slate-500">{tr(i.title, locale)}</p>}
                      <p className="text-xs text-slate-500">{formatDate(i.published_at, locale)} · {tp("papers", { n: i.articles?.length ?? 0 })}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="shelf mt-4" aria-hidden="true" />
          </section>
        ))}
      </div>
    </div>
  );
}
