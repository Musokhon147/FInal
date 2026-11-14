import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import I18nFields from "@/components/admin/I18nFields";
import type { CmsPage } from "@/lib/types";
import { savePage } from "../../actions";

export default async function EditPage({ params }: PageProps<"/[locale]/admin/pages/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  const isNew = id === "new";
  let page: CmsPage | null = null;
  if (!isNew) {
    const { data } = await supabase.from("pages").select("*").eq("id", id).maybeSingle<CmsPage>();
    if (!data) notFound();
    page = data;
  }

  async function save(formData: FormData) {
    "use server";
    await savePage(formData);
    redirect({ href: "/admin/pages", locale });
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/pages" className="text-sm text-brand-600 hover:underline">← {t("common.back")}</Link>
      <form action={save} className="card space-y-4">
        <input type="hidden" name="id" value={page?.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className="label">{t("admin.slug")}</span><input name="slug" defaultValue={page?.slug} className="input" required /></label>
          <label><span className="label">Sort</span><input name="sort_order" type="number" defaultValue={page?.sort_order ?? 0} className="input" /></label>
          <div className="flex items-end gap-4 pb-2 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" name="is_published" defaultChecked={page?.is_published ?? true} /> {t("admin.isPublished")}</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="show_in_menu" defaultChecked={page?.show_in_menu ?? false} /> {t("admin.showInMenu")}</label>
          </div>
        </div>
        <I18nFields name="title" label={t("common.title")} value={page?.title} required />
        <I18nFields name="body" label={t("admin.body")} value={page?.body} multiline />
        <button className="btn-primary">{t("common.save")}</button>
      </form>
    </div>
  );
}
