import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { cfpWindow, dateRange, getJournal, upcomingConferences } from "@/lib/data";
import { isPubType } from "@/lib/pubtypes";
import { formatDate } from "@/lib/i18n-field";
import { tr, type I18nText } from "@/lib/i18n-field";
import type { Section } from "@/lib/types";
import SubmitForm from "./SubmitForm";

export default async function SubmitPage({ params, searchParams }: PageProps<"/[locale]/dashboard/submit">) {
  const locale = await initLocale(params);
  const t = await getTranslations("submit");
  const tx = await getTranslations("x");
  const { supabase, user, profile } = await getSession();
  if (!user) redirect({ href: "/login?next=/dashboard/submit", locale });
  const journal = await getJournal();
  const [{ data: sections }, { data: confs }] = await Promise.all([
    supabase.from("sections").select("*").eq("journal_id", journal?.id ?? "").order("sort_order"),
    supabase.from("conferences").select("id, title, scope, start_date, end_date").order("start_date", { ascending: false }),
  ]);
  const { type } = await searchParams;
  // conferences still ahead (or within the last 60 days, while proceedings are collected)
  const conferences = upcomingConferences((confs ?? []) as { id: string; title: I18nText; scope: "local" | "international"; start_date: string; end_date: string | null }[])
    .map((c) => ({ id: c.id, title: tr(c.title, locale), scope: c.scope, dates: dateRange(c.start_date, c.end_date, locale) }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl">{t("title")}</h1>
      {(() => {
        const c = cfpWindow(journal?.cfp_deadline);
        return c?.open ? (
          <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 p-4 text-sm">
            <span className="text-slate-700">{tx("cfpTitle")}</span>
            <span className="font-semibold text-accent">{tx("cfpDeadline")}: {formatDate(c.end.toISOString(), locale)}</span>
          </div>
        ) : null;
      })()}
      <SubmitForm
        journalId={journal?.id ?? ""}
        userId={user!.id}
        sections={((sections ?? []) as Section[]).map((s) => ({ id: s.id, title: tr(s.title, locale) }))}
        conferences={conferences}
        initialType={isPubType(type) ? type : "journal"}
        me={{
          full_name: profile?.full_name ?? "",
          email: user!.email ?? "",
          affiliation: profile?.affiliation ?? "",
          orcid: profile?.orcid ?? "",
        }}
      />
    </div>
  );
}
