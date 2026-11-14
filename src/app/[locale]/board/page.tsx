import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n-field";
import type { BoardMember } from "@/lib/types";

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
    </div>
  );
}
