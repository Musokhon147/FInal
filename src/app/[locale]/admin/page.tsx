import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { countryOf, getJournalNumbers } from "@/lib/data";
import { BarChart, Donut, HBars } from "@/components/admin/Charts";

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  const locale = await initLocale(params);
  const tx = await getTranslations();
  const t = await getTranslations("admin");
  const { supabase } = await getSession();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };

  const [fresh, review, accepted, articles, users] = await Promise.all([
    count(supabase.from("submissions").select("id", head).in("status", ["submitted", "desk_review"])),
    count(supabase.from("submissions").select("id", head).in("status", ["under_review", "revision_required"])),
    count(supabase.from("submissions").select("id", head).eq("status", "accepted")),
    count(supabase.from("articles").select("id", head).eq("status", "published")),
    count(supabase.from("profiles").select("id", head)),
  ]);

  const stats = [
    [t("statNew"), fresh, "/admin/submissions?status=submitted"],
    [t("statReview"), review, "/admin/submissions?status=under_review"],
    [t("statAccepted"), accepted, "/admin/submissions?status=accepted"],
    [t("statArticles"), articles, "/admin/articles"],
    [t("statUsers"), users, "/admin/users"],
  ] as const;

  // charts
  const [{ data: subs }, { data: arts }, numbers] = await Promise.all([
    supabase.from("submissions").select("status, submitted_at, created_at").neq("status", "draft"),
    supabase.from("articles").select("authors").eq("status", "published"),
    getJournalNumbers(locale),
  ]);
  const subRows = (subs ?? []) as { status: string; submitted_at: string | null; created_at: string }[];
  const [nowY, nowM] = (() => { const d = new Date(Math.max(...subRows.map((s) => Date.parse(s.submitted_at || s.created_at)), Date.parse("2026-01-01"))); return [d.getFullYear(), d.getMonth()]; })();
  const perMonth: [string, number][] = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(nowY, nowM - 5 + k, 1);
    const label = locale === "uz" ? UZ_MONTHS[d.getMonth()] : new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { month: "short" }).format(d);
    return [label, subRows.filter((s) => { const x = new Date(s.submitted_at || s.created_at); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); }).length];
  });
  const st: Record<string, number> = {};
  subRows.forEach((s) => (st[s.status] = (st[s.status] || 0) + 1));
  const byStatus = Object.entries(st).map(([k, v]) => [tx(`status.${k}` as "status.draft"), v] as [string, number]);
  const cc: Record<string, [string, number]> = {};
  ((arts ?? []) as { authors: { affiliation?: string }[] }[]).forEach((a) => {
    const c = countryOf(a.authors[0]?.affiliation, locale);
    if (c) { cc[c.key] = cc[c.key] || [c.label, 0]; cc[c.key][1]++; }
  });
  const byCountry = Object.values(cc).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div>
      <h1 className="mb-6 text-3xl">{t("dashboard")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, n, href]) => (
          <Link key={label} href={href} className="card hover:border-brand-600">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 font-serif text-4xl text-slate-900">{n}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="card"><h2 className="mb-4 text-lg">{tx("x.perMonth")}</h2><BarChart rows={perMonth} /></section>
        <section className="card">
          <h2 className="mb-4 text-lg">{tx("x.byStatus")}</h2><Donut rows={byStatus} />
          <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">{tx("x.reviewTime")}: <span className="font-serif text-2xl text-slate-900">{numbers.days}</span> {tx("x.days")}</p>
        </section>
        <section className="card xl:col-span-2"><h2 className="mb-4 text-lg">{tx("x.byCountry")}</h2><HBars rows={byCountry} /></section>
      </div>
    </div>
  );
}
