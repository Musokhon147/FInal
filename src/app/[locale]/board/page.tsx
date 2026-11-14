import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n-field";
import type { BoardMember } from "@/lib/types";
import { COUNTRY_LATLON, countryOf } from "@/lib/data";
import AuthorsGlobe, { type GlobePoint } from "@/components/fx/AuthorsGlobe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("board");
  const locale = await getLocale();
  return { title: t("title"), alternates: alternates(locale, "/board") };
}

function Avatar({ m, size, locale }: { m: BoardMember; size: number; locale: string }) {
  const name = tr(m.full_name, locale);
  if (m.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.photo_url} alt="" className="shrink-0 rounded-full object-cover ring-2 ring-accent/60" style={{ width: size, height: size }} />;
  }
  return (
    <span className="relative flex shrink-0 items-center justify-center rounded-full p-[2px]" aria-hidden="true"
      style={{ width: size, height: size, background: "conic-gradient(from 200deg, rgb(var(--acc)), rgb(var(--b600)), rgb(var(--acc)))" }}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 font-serif text-slate-900" style={{ fontSize: size * 0.36 }}>
        {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
      </span>
    </span>
  );
}

export default async function BoardPage({ params }: PageProps<"/[locale]/board">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const supabase = await createClient();
  const { data } = await supabase.from("editorial_board").select("*").order("sort_order");
  const list = (data ?? []) as BoardMember[];
  // where our authors work: every author of every published article
  const { data: arts } = await supabase.from("articles").select("authors").eq("status", "published");
  const byCountry: Record<string, GlobePoint> = {};
  ((arts ?? []) as { authors: { affiliation?: string }[] }[]).forEach((a) => a.authors.forEach((au) => {
    const c = countryOf(au.affiliation, locale);
    const ll = c && COUNTRY_LATLON[c.key];
    if (!c || !ll) return;
    byCountry[c.key] = byCountry[c.key] || { label: c.label, lat: ll[0], lon: ll[1], count: 0 };
    byCountry[c.key].count++;
  }));
  const points = Object.values(byCountry).sort((a, b) => b.count - a.count);
  const grp = (k: BoardMember["position_type"]) => list.filter((m) => (m.position_type || "member") === k);
  const person = (m: BoardMember) => (
    <li key={m.id} className="card flex items-center gap-4 p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-600/60">
      <Avatar m={m} size={60} locale={locale} />
      <div>
        <p className="font-semibold text-slate-900">{tr(m.full_name, locale)}</p>
        <p className="text-sm text-accent">{tr(m.position, locale)}</p>
        <p className="text-sm text-slate-500">{tr(m.affiliation, locale)}</p>
      </div>
    </li>
  );
  return (
    <div>
      <h1 className="text-4xl font-light sm:text-5xl">{t("board.title")}</h1>
      {grp("chief").map((m) => (
        <section key={m.id} className="card mt-10 flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center">
          <Avatar m={m} size={112} locale={locale} />
          <div>
            <p className="text-sm text-accent">{t("x.g_chief")}</p>
            <p className="mt-1 font-serif text-3xl text-slate-900">{tr(m.full_name, locale)}</p>
            <p className="mt-2 text-slate-500">{tr(m.affiliation, locale)}</p>
          </div>
        </section>
      ))}
      {grp("deputy").length > 0 && <><h2 className="mt-12 text-xl">{t("x.g_deputy")}</h2><ul className="mt-5 grid gap-4 sm:grid-cols-2">{grp("deputy").map(person)}</ul></>}
      {grp("member").length > 0 && <><h2 className="mt-12 text-xl">{t("x.g_member")}</h2><ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{grp("member").map(person)}</ul></>}

      {points.length > 0 && (
        <section data-reveal className="card mt-16 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_280px] lg:items-center">
          <AuthorsGlobe points={points} />
          <div>
            <h2 className="text-2xl">{t("x.authorsWorld")}</h2>
            <p className="mt-3 text-sm text-slate-600">{t("x.authorsWorldText")}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {points.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />{p.label}</span>
                  <span className="tabular-nums text-slate-500">{p.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
