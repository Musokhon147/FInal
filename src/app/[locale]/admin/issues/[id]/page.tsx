import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { tr, type I18nText } from "@/lib/i18n-field";
import { publicFileUrl } from "@/lib/supabase/env";
import IssueForm from "./IssueForm";

export default async function EditIssue({ params }: PageProps<"/[locale]/admin/issues/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  const [{ data: issue }, { data: confs }] = await Promise.all([
    supabase.from("issues").select("id, number, is_special, title, description, cover_url, pdf_path, conference_id, volumes(number, year)").eq("id", id).maybeSingle(),
    supabase.from("conferences").select("id, title, scope, start_date").order("start_date", { ascending: false }),
  ]);
  if (!issue) notFound();
  const i = issue as unknown as { id: string; number: number; is_special: boolean; title: I18nText; description: I18nText; cover_url: string | null; pdf_path: string | null; conference_id: string | null; volumes: { number: number; year: number } | null };
  return (
    <div className="space-y-4">
      <Link href="/admin/issues" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <h1 className="text-2xl">
        {t("pt.editIssue")}: {i.volumes ? t("archives.volume", { n: i.volumes.number, year: i.volumes.year }) : ""}, {i.is_special ? `${t("archives.special")} ${i.number}` : t("archives.issue", { n: i.number })}
      </h1>
      <IssueForm
        issue={{ ...i, pdf_url: i.pdf_path ? publicFileUrl("articles", i.pdf_path) : null }}
        conferences={((confs ?? []) as { id: string; title: I18nText; scope: "local" | "international" }[]).map((c) => ({ id: c.id, label: `${tr(c.title, locale)} (${t(`pt.${c.scope}`)})` }))}
      />
    </div>
  );
}
