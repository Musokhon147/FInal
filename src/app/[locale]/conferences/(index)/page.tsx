import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, splitConferences } from "@/lib/data";
import type { Conference } from "@/lib/types";
import ConferenceCard from "@/components/design/ConferenceCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("x");
  return { title: t("conferences"), alternates: alternates(await getLocale(), "/conferences") };
}

export default async function ConferencesPage({ params }: PageProps<"/[locale]/conferences">) {
  const locale = await initLocale(params);
  const t = await getTranslations("x");
  const tp = await getTranslations("pt");
  const supabase = await createClient();
  const { data } = await supabase.from("conferences").select("*").order("start_date", { ascending: false });
  const { upcoming, past } = splitConferences((data ?? []) as Conference[]);
  return (
    <div>
      <h1 className="text-4xl font-light sm:text-5xl">{t("conferences")}</h1>
      {!upcoming.length && !past.length && <p className="mt-8 text-slate-500">{t("noConferences")}</p>}
      {upcoming.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-xl">{t("upcoming")}</h2>
          <ul className="grid gap-5 md:grid-cols-2">
            {upcoming.map((c) => {
              const n = daysUntil(c.registration_deadline);
              return <ConferenceCard key={c.id} c={c} locale={locale} scopeLabel={tp(c.scope ?? "local")} note={n !== null ? t("daysLeft", { n }) : undefined} />;
            })}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-xl">{t("past")}</h2>
          <ul className="grid gap-5 md:grid-cols-2">{past.map((c) => <ConferenceCard key={c.id} c={c} locale={locale} scopeLabel={tp(c.scope ?? "local")} />)}</ul>
        </section>
      )}
    </div>
  );
}
