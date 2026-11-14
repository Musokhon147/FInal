import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { getJournal } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import type { Section } from "@/lib/types";
import SubmitForm from "./SubmitForm";

export default async function SubmitPage({ params }: PageProps<"/[locale]/dashboard/submit">) {
  const locale = await initLocale(params);
  const t = await getTranslations("submit");
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
