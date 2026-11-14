import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { tr } from "@/lib/i18n-field";
import type { CmsPage } from "@/lib/types";

export default async function AdminPages({ params }: PageProps<"/[locale]/admin/pages">) {
  const locale = await initLocale(params);
  const t = await getTranslations("admin");
  const { supabase } = await getSession();
  const { data } = await supabase.from("pages").select("*").order("sort_order");
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">{t("pages")}</h1>
        <Link href="/admin/pages/new" className="btn-primary">+ {t("newPage")}</Link>
      </div>
      <table className="table">
        <tbody>
          {((data ?? []) as CmsPage[]).map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/pages/${p.id}`} className="text-brand-700 hover:underline">{tr(p.title, locale)}</Link></td>
              <td className="text-slate-500">/p/{p.slug}</td>
              <td className="text-xs text-slate-500">
                {p.is_published ? t("isPublished") : "Draft"}{p.show_in_menu && ` · ${t("showInMenu")}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
