import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { cfpWindow, getJournal } from "@/lib/data";
import { formatDate } from "@/lib/i18n-field";
import { tr } from "@/lib/i18n-field";
import type { Section } from "@/lib/types";
import SubmitForm from "./SubmitForm";

export default async function SubmitPage({ params }: PageProps<"/[locale]/dashboard/submit">) {
  const locale = await initLocale(params);
  const t = await getTranslations("submit");
  const tx = await getTranslations("x");
  const { supabase, user, profile } = await getSession();
  if (!user) redirect({ href: "/login?next=/dashboard/submit", locale });
  const journal = await getJournal();
  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("journal_id", journal?.id ?? "")
    .order("sort_order");

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
