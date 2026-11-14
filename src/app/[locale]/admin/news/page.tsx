import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate, tr } from "@/lib/i18n-field";
import type { NewsItem } from "@/lib/types";

export default async function AdminNews({ params }: PageProps<"/[locale]/admin/news">) {
  const locale = await initLocale(params);
  const t = await getTranslations("x");
  const { supabase } = await getSession();
  const { data } = await supabase.from("news").select("*").order("pinned", { ascending: false }).order("date", { ascending: false });
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t("news")}</h1>
        <Link href="/admin/news/new" className="btn-primary">+ {t("addNews")}</Link>
      </div>
      <ul className="divide-y divide-slate-200">
        {((data ?? []) as NewsItem[]).map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-4 py-3">
            <Link href={`/admin/news/${n.id}`} className="font-medium text-brand-700 hover:underline">{tr(n.title, locale)}</Link>
            <span className="shrink-0 text-xs text-slate-500">{n.pinned ? "★ " : ""}{formatDate(n.date, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
