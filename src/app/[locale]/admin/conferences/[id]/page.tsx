import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import I18nFields from "@/components/admin/I18nFields";
import RichI18nFields from "@/components/admin/RichI18nFields";
import type { Conference } from "@/lib/types";
import { deleteConference, saveConference } from "../../actions";

export default async function EditConference({ params }: PageProps<"/[locale]/admin/conferences/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  let c: Conference | null = null;
  if (id !== "new") {
    const { data } = await supabase.from("conferences").select("*").eq("id", id).maybeSingle<Conference>();
    if (!data) notFound();
    c = data;
  }
  async function save(fd: FormData) {
    "use server";
    await saveConference(fd);
    redirect({ href: "/admin/conferences", locale });
  }
  async function remove() {
    "use server";
    if (c) await deleteConference(c.id);
    redirect({ href: "/admin/conferences", locale });
  }
  return (
    <div className="space-y-4">
      <Link href="/admin/conferences" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <form action={save} className="card space-y-4">
        <input type="hidden" name="id" value={c?.id ?? ""} />
        <I18nFields name="title" label={t("common.title")} value={c?.title} required />
        <I18nFields name="location" label={t("x.location")} value={c?.location} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className="label">{t("x.startDate")}</span><input type="date" name="start_date" defaultValue={c?.start_date ?? ""} className="input" required /></label>
          <label><span className="label">{t("x.endDate")}</span><input type="date" name="end_date" defaultValue={c?.end_date ?? ""} className="input" /></label>
          <label><span className="label">{t("x.regDeadline")}</span><input type="date" name="registration_deadline" defaultValue={c?.registration_deadline ?? ""} className="input" /></label>
        </div>
        <RichI18nFields name="description" label={t("admin.body")} value={c?.description} />
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary">{t("common.save")}</button>
          {c && <button formAction={remove} formNoValidate className="btn-secondary text-red-400">{t("common.delete")}</button>}
        </div>
      </form>
    </div>
  );
}
