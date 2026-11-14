import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { dateRange } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import type { Conference } from "@/lib/types";

export default async function AdminConferences({ params }: PageProps<"/[locale]/admin/conferences">) {
  const locale = await initLocale(params);
  const t = await getTranslations("x");
  const { supabase } = await getSession();
  const { data } = await supabase.from("conferences").select("*").order("start_date", { ascending: false });
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t("conferences")}</h1>
        <Link href="/admin/conferences/new" className="btn-primary">+ {t("addConference")}</Link>
      </div>
      <ul className="divide-y divide-slate-200">
        {((data ?? []) as Conference[]).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <Link href={`/admin/conferences/${c.id}`} className="font-medium text-brand-700 hover:underline">{tr(c.title, locale)}</Link>
            <span className="text-xs text-slate-500">{dateRange(c.start_date, c.end_date, locale)} · {tr(c.location, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
