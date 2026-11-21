import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { getJournal } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { crossrefConfigured, crossrefTest } from "@/lib/crossref";
import { isDoi, isDoiPrefix, isIssn } from "@/lib/identifiers";
import CopyField from "./CopyField";
import DoiActions from "./DoiActions";

type Row = { id: string; title: string; doi: string | null; doi_status: string; doi_message: string | null; published_at: string | null };
type Dep = { id: number; file_name: string; article_ids: string[]; test: boolean; status: string; success: number; failure: number; message: string | null; created_at: string };
type RowState = "noDoi" | "bad" | "other" | "none" | "queued" | "registered" | "failed";

function Pill({ ok, partly, children }: { ok: boolean; partly?: boolean; children: React.ReactNode }) {
  const cls = ok ? "bg-accent/15 text-accent" : partly ? "bg-brand-600/15 text-brand-700" : "bg-slate-200 text-slate-600";
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Step({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-accent text-ink" : "border border-slate-300 text-slate-500"}`}>
        {done ? "✓" : ""}
      </span>
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold text-slate-900">{title}</p>
        <div className="text-slate-600">{children}</div>
      </div>
    </li>
  );
}

const ext = "text-brand-700 hover:underline";

export default async function IndexingPage({ params }: PageProps<"/[locale]/admin/indexing">) {
  const locale = await initLocale(params);
  const t = await getTranslations("ix");
  const { supabase, profile } = await getSession();
  const admin = profile?.role === "admin";
  const journal = await getJournal();
  const [{ data: arts }, { data: deps }] = await Promise.all([
    supabase.from("articles").select("id, title, doi, doi_status, doi_message, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(1000),
    supabase.from("crossref_deposits").select("id, file_name, article_ids, test, status, success, failure, message, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  const rows = (arts ?? []) as Row[];
  const deposits = (deps ?? []) as Dep[];

  const prefix = isDoiPrefix(journal?.doi_prefix) ? journal!.doi_prefix! : null;
  const connected = crossrefConfigured();
  const test = connected && crossrefTest();
  const issns = [
    isIssn(journal?.issn_online) ? { n: journal!.issn_online!, kind: t("issnOnline") } : null,
    isIssn(journal?.issn_print) ? { n: journal!.issn_print!, kind: t("issnPrint") } : null,
  ].filter(Boolean) as { n: string; kind: string }[];

  const state = (r: Row): RowState => {
    if (!r.doi) return "noDoi";
    if (!isDoi(r.doi)) return "bad";
    if (prefix && !r.doi.toLowerCase().startsWith(`${prefix.toLowerCase()}/`)) return "other";
    return (r.doi_status as RowState) || "none";
  };
  const counts = rows.reduce((m, r) => { const s = state(r); m[s] = (m[s] ?? 0) + 1; return m; }, {} as Partial<Record<RowState, number>>);
  const own = rows.filter((r) => ["none", "queued", "registered", "failed"].includes(state(r))).length;
  const registered = counts.registered ?? 0;
  const host = new URL(SITE_URL).host;
  const oai = `${SITE_URL}/oai`;
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "uz-Latn-UZ", { dateStyle: "short", timeStyle: "short" });
  const stCls: Record<RowState, string> = {
    noDoi: "text-slate-500", bad: "text-red-400", other: "text-slate-500", none: "text-slate-600",
    queued: "text-brand-700", registered: "text-accent", failed: "text-red-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("intro")}</p>
      </div>

      {/* ---------------------------------------------------------- Google Scholar */}
      <section className="card space-y-4" aria-labelledby="ix-scholar">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ix-scholar" className="text-xl">{t("scholarTitle")}</h2>
          <Pill ok>{t("on")}</Pill>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">{t("scholarText")}</p>
        <ul className="space-y-1.5 text-sm">
          <li>{t("scholarArticles", { count: rows.length })}</li>
          <li><a className={ext} href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noreferrer">{t("scholarSitemap")} ↗</a></li>
          <li><a className={ext} href={`https://scholar.google.com/scholar?q=site%3A${encodeURIComponent(host)}`} target="_blank" rel="noreferrer">{t("scholarCheck")} ↗</a></li>
          <li><a className={ext} href="https://search.google.com/search-console" target="_blank" rel="noreferrer">{t("scholarConsole")} ↗</a></li>
        </ul>
      </section>

      {/* ---------------------------------------------------------- OAI-PMH indexes */}
      <section className="card space-y-4" aria-labelledby="ix-oai">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ix-oai" className="text-xl">{t("oaiTitle")}</h2>
          <Pill ok>{t("on")}</Pill>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">{t("oaiText")}</p>
        <div>
          <p className="label">{t("oaiAddress")}</p>
          <CopyField value={oai} copy={t("copy")} copied={t("copied")} />
          <a className={`mt-1 inline-block text-xs ${ext}`} href={`${oai}?verb=Identify`} target="_blank" rel="noreferrer">{t("oaiTest")} ↗</a>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li><a className={ext} href="https://www.base-search.net/about/en/suggest.php" target="_blank" rel="noreferrer">BASE ↗</a> {t("base")}</li>
          <li><a className={ext} href="https://core.ac.uk/benefits#join-core" target="_blank" rel="noreferrer">CORE ↗</a> {t("core")}</li>
          <li><a className={ext} href="https://provide.openaire.eu" target="_blank" rel="noreferrer">OpenAIRE ↗</a> {t("openaire")}</li>
          <li><a className={ext} href="https://doaj.org/apply/guide" target="_blank" rel="noreferrer">DOAJ ↗</a> {t("doaj")}</li>
          <li className="text-slate-500">{t("auto")}</li>
        </ul>
      </section>

      {/* ---------------------------------------------------------- ISSN */}
      <section className="card space-y-4" aria-labelledby="ix-issn">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ix-issn" className="text-xl">ISSN</h2>
          <Pill ok={!!issns.length}>{issns.length ? t("on") : t("notYet")}</Pill>
        </div>
        {issns.length ? (
          <ul className="space-y-1.5 text-sm text-slate-700">
            {issns.map((x) => (
              <li key={x.n}>
                {t("issnHave", { issn: x.n, kind: x.kind })}{" "}
                <a className={ext} href={`https://portal.issn.org/resource/ISSN/${x.n}`} target="_blank" rel="noreferrer">{t("issnCheck")} ↗</a>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="max-w-2xl text-sm text-slate-600">{t("issnNone")}</p>
            <ol className="space-y-4">
              <Step done={rows.length > 0} title={t("issnS1")}>{t("issnS1Text")}</Step>
              <Step done={false} title={t("issnS2")}>
                <p>{t("issnS2Text")}</p>
                <a className={ext} href="https://my.gov.uz/uz/service/762" target="_blank" rel="noreferrer">{t("issnApply")} ↗</a>
              </Step>
              <Step done={false} title={t("issnS3")}>{t("issnS3Text")}</Step>
              <Step done={false} title={t("issnS4")}>
                {admin ? <Link className={ext} href="/admin/settings">{t("toSettings")}</Link> : t("issnS4Text")}
              </Step>
            </ol>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------- DOI */}
      <section className="card space-y-5" aria-labelledby="ix-doi">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ix-doi" className="text-xl">{t("doiTitle")}</h2>
          <Pill ok={!!prefix && connected && !test} partly={!!prefix || connected}>
            {prefix && connected && !test ? t("on") : prefix || connected ? t("partly") : t("notYet")}
          </Pill>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">{t("doiText")}</p>
        <ol className="space-y-4">
          <Step done={!!prefix} title={t("s1")}>
            <p>{t("s1Text")}</p>
            <a className={ext} href="https://www.crossref.org/membership/" target="_blank" rel="noreferrer">{t("s1Link")} ↗</a>
          </Step>
          <Step done={!!prefix} title={t("s2")}>
            {prefix ? t("s2Done", { prefix }) : admin ? <Link className={ext} href="/admin/settings">{t("s2Text")}</Link> : t("s2Text")}
          </Step>
          <Step done={connected} title={t("s3")}>
            {connected
              ? <p className={test ? "text-brand-700" : "text-accent"}>{test ? t("s3Test") : t("s3Done")}</p>
              : <p>{t.rich("s3Text", { code: (c) => <code className="rounded bg-slate-100 px-1 text-slate-900">{c}</code> })}</p>}
          </Step>
          <Step done={!!prefix && connected && registered > 0} title={t("s4")}>{t("s4Text")}</Step>
        </ol>

        {rows.length > 0 && (
          <>
            <DoiActions withoutDoi={prefix ? counts.noDoi ?? 0 : 0} waiting={(counts.none ?? 0) + (counts.failed ?? 0)} withDoi={own}
              prefix={!!prefix} connected={connected} openFiles={deposits.filter((d) => d.status === "submitted").length} />
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-4 py-2.5 font-medium">{t("colArticle")}</th>
                  <th className="px-4 py-2.5 font-medium">DOI</th>
                  <th className="px-4 py-2.5 font-medium">{t("colStatus")}</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 200).map((r) => {
                    const s = state(r);
                    return (
                      <tr key={r.id} className="border-b border-slate-200/60 align-top last:border-0">
                        <td className="px-4 py-2.5"><Link href={`/admin/articles/${r.id}`} className="text-slate-900 hover:text-brand-700 hover:underline">{r.title}</Link></td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {isDoi(r.doi) && s === "registered"
                            ? <a className={ext} href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.doi}</a>
                            : r.doi ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={stCls[s]}>{t(`st_${s}`)}</span>
                          {s === "failed" && r.doi_message && <span className="block max-w-xs text-xs text-slate-500">{r.doi_message}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!rows.length && <p className="text-sm text-slate-500">{t("noArticles")}</p>}

        {deposits.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">{t("deposits")}</summary>
            <ul className="mt-2 space-y-2">
              {deposits.map((d) => (
                <li key={d.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <span className="tabular-nums text-slate-500">{fmt.format(new Date(d.created_at))}</span>{" "}
                  <span className="text-slate-900">{t("depLine", { count: d.article_ids.length })}</span>{" "}
                  <span className={d.status === "completed" ? "text-accent" : d.status === "failed" ? "text-red-400" : "text-brand-700"}>{t(`dep_${d.status}` as "dep_completed", { ok: d.success, bad: d.failure })}</span>
                  {d.test && <span className="ml-2 rounded bg-slate-200 px-1.5 text-xs text-slate-600">{t("depTest")}</span>}
                  {d.message && d.status !== "submitted" && <span className="mt-1 block whitespace-pre-line text-xs text-slate-500">{d.message}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
