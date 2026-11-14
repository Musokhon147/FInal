import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import I18nFields from "@/components/admin/I18nFields";
import RichI18nFields from "@/components/admin/RichI18nFields";
import type { NewsItem } from "@/lib/types";
import { deleteNews, saveNews } from "../../actions";

export default async function EditNews({ params }: PageProps<"/[locale]/admin/news/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  let item: NewsItem | null = null;
  if (id !== "new") {
    const { data } = await supabase.from("news").select("*").eq("id", id).maybeSingle<NewsItem>();
    if (!data) notFound();
    item = data;
  }
  async function save(fd: FormData) {
    "use server";
    await saveNews(fd);
    redirect({ href: "/admin/news", locale });
  }
  async function remove() {
    "use server";
    if (item) await deleteNews(item.id);
    redirect({ href: "/admin/news", locale });
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <Link href="/admin/news" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <form action={save} className="card space-y-4">
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">{t("x.date")}</span><input type="date" name="date" defaultValue={item?.date ?? today} className="input" required /></label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="pinned" defaultChecked={item?.pinned} /> {t("x.pinned")}</label>
        </div>
        <I18nFields name="title" label={t("common.title")} value={item?.title} required />
        <RichI18nFields name="body" label={t("admin.body")} value={item?.body} />
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary">{t("common.save")}</button>
          {item && <button formAction={remove} formNoValidate className="btn-secondary text-red-400">{t("common.delete")}</button>}
        </div>
      </form>
    </div>
  );
}
