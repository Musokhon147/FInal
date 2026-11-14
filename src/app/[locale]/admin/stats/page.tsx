import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { countryOf } from "@/lib/data";
import { trExact } from "@/lib/i18n-field";
import { computeStats, perMonth, reportWindow } from "@/lib/stats";
import { BarChart, Donut, HBars } from "@/components/admin/Charts";

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

export default async function StatsPage({ params, searchParams }: PageProps<"/[locale]/admin/stats">) {
  const locale = await initLocale(params);
  const t = await getTranslations("adm");
  const tx = await getTranslations();
  const { p } = await searchParams;
  const period = p === "all" ? "all" : "12m";
  const { supabase } = await getSession();

  const [{ data: subs }, { data: events }, { data: reviews }, { data: arts }, { data: people }] = await Promise.all([
    supabase.from("submissions").select("id, title, status, submitted_at, created_at").neq("status", "draft"),
    supabase.from("submission_events").select("submission_id, to_status, created_at"),
    supabase.from("review_assignments").select("reviewer_id, status, created_at, completed_at, due_at"),
    supabase.from("articles").select("id, title, title_i18n, authors, views, downloads, published_at").eq("status", "published"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const subRows = (subs ?? []) as Parameters<typeof computeStats>[0];
  const { latest, since } = reportWindow(subRows.map((x) => x.submitted_at || x.created_at), period);
  const s = computeStats(subRows, (events ?? []) as Parameters<typeof computeStats>[1], (reviews ?? []) as Parameters<typeof computeStats>[2], since);

  const fmtMonth = (d: Date) => locale === "uz" ? UZ_MONTHS[d.getMonth()] : new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { month: "short" }).format(d);
  const months = perMonth(subRows.map((x) => x.submitted_at || x.created_at), latest, 12, fmtMonth);

  type A = { id: string; title: string; title_i18n: Record<string, string>; authors: { name: string; affiliation?: string }[]; views: number; downloads: number; published_at: string | null };
  const articles = ((arts ?? []) as A[]).filter((a) => !a.published_at || Date.parse(a.published_at) >= since);
  const allArticles = (arts ?? []) as A[];
  const top = [...allArticles].sort((a, b) => b.views - a.views).slice(0, 8);
  const views = allArticles.reduce((n, a) => n + (a.views || 0), 0), downloads = allArticles.reduce((n, a) => n + (a.downloads || 0), 0);
  const cc: Record<string, [string, number]> = {};
  allArticles.forEach((a) => a.authors.forEach((au) => { const c = countryOf(au.affiliation, locale); if (c) { cc[c.key] ??= [c.label, 0]; cc[c.key][1]++; } }));
  const countries = Object.values(cc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const name = (id: string) => { const u = (people ?? []).find((x: { id: string }) => x.id === id) as { full_name?: string; email?: string } | undefined; return u?.full_name || u?.email || "—"; };
  const dash = (v: number | null, suffix = "") => (v === null ? "—" : `${v}${suffix}`);

  const kpis: [string, string, string?][] = [
    [t("kReceived"), String(s.received)],
    [t("kAcceptance"), dash(s.acceptanceRate, "%"), t("kAcceptanceHint")],
    [t("kFirstDecision"), dash(s.firstDecisionDays), s.firstDecisionDays === null ? undefined : t("days")],
    [t("kReviewTime"), dash(s.reviewDays), s.reviewDays === null ? undefined : t("days")],
    [t("kInviteAccept"), dash(s.inviteAcceptRate, "%")],
    [t("kPublished"), String(articles.length)],
    [t("kViews"), views.toLocaleString(locale)],
    [t("kDownloads"), downloads.toLocaleString(locale)],
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">{t("stats")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex rounded-full border border-slate-200 p-1 text-sm" aria-label={t("stats")}>
            {(["12m", "all"] as const).map((k) => (
              <Link key={k} href={k === "12m" ? "/admin/stats" : "/admin/stats?p=all"} aria-current={period === k ? "page" : undefined}
                className={`rounded-full px-3 py-1 ${period === k ? "bg-slate-900 text-slate-50" : "text-slate-600 hover:text-slate-900"}`}>
                {k === "12m" ? t("period12") : t("periodAll")}
              </Link>
            ))}
          </nav>
          <a href={`/api/admin/export?p=${period}`} className="btn-secondary text-sm">{t("exportCsv")}</a>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, hint]) => (
          <div key={label} className="card p-5">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5"><span className="font-serif text-3xl text-slate-900">{value}</span>{hint && <span className="text-xs text-slate-500">{hint}</span>}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card xl:col-span-2"><h2 className="mb-4 text-lg">{t("perMonth")}</h2><BarChart rows={months} /></section>
        <section className="card">
          <h2 className="mb-4 text-lg">{t("decisions")}</h2>
          {s.received ? <Donut rows={[[tx("status.accepted"), s.outcome.accepted], [tx("status.revision_required"), s.outcome.revision], [tx("status.rejected"), s.outcome.rejected], [tx("status.under_review"), s.outcome.open]]} /> : <p className="text-sm text-slate-500">{t("noData")}</p>}
        </section>
        <section className="card">
          <h2 className="mb-4 text-lg">{t("reviewSpeed")}</h2>
          <HBars rows={[[t("b2w"), s.buckets[0]], [t("b4w"), s.buckets[1]], [t("b8w"), s.buckets[2]], [t("bmore"), s.buckets[3]]]} />
        </section>

        <section className="card overflow-x-auto xl:col-span-2">
          <h2 className="mb-4 text-lg">{t("topArticles")}</h2>
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2 font-medium">{t("title")}</th><th className="py-2 text-right font-medium">{t("kViews")}</th><th className="py-2 text-right font-medium">{t("kDownloads")}</th></tr></thead>
            <tbody>
              {top.map((a) => (
                <tr key={a.id} className="border-b border-slate-200/60 last:border-0">
                  <td className="py-2.5 pr-4"><Link href={`/article/${a.id}`} className="text-slate-900 hover:text-brand-700">{trExact(a.title_i18n, locale) || a.title}</Link></td>
                  <td className="py-2.5 text-right tabular-nums">{a.views}</td><td className="py-2.5 text-right tabular-nums">{a.downloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-x-auto">
          <h2 className="mb-4 text-lg">{t("reviewers")}</h2>
          {s.reviewers.length ? (
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-2 font-medium">{tx("admin.reviewer")}</th><th className="py-2 text-right font-medium">{t("invited")}</th><th className="py-2 text-right font-medium">{t("completed")}</th><th className="py-2 text-right font-medium">{t("avgDays")}</th><th className="py-2 text-right font-medium">{t("onTime")}</th></tr></thead>
              <tbody>
                {s.reviewers.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200/60 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-900">{name(r.id)}</td><td className="py-2.5 text-right tabular-nums">{r.invited}</td><td className="py-2.5 text-right tabular-nums">{r.completed}</td>
                    <td className="py-2.5 text-right tabular-nums">{dash(r.avgDays)}</td><td className="py-2.5 text-right tabular-nums">{dash(r.onTimePct, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-500">{t("noData")}</p>}
        </section>
        <section className="card"><h2 className="mb-4 text-lg">{t("byCountry")}</h2>{countries.length ? <HBars rows={countries} /> : <p className="text-sm text-slate-500">{t("noData")}</p>}</section>
      </div>
    </div>
  );
}
