import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { getJournal } from "@/lib/data";
import { formatDate, tr, type I18nText } from "@/lib/i18n-field";
import I18nFields from "@/components/admin/I18nFields";
import { createIssue, createVolume } from "../actions";
import IssueToggle from "./IssueToggle";

type Vol = {
  id: string; number: number; year: number;
  issues: { id: string; number: number; is_special: boolean; title: I18nText; status: string; published_at: string | null; articles: { count: number }[] }[];
};

export default async function AdminIssues({ params }: PageProps<"/[locale]/admin/issues">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { supabase } = await getSession();
  const journal = await getJournal();
  const { data } = await supabase
    .from("volumes")
    .select("id, number, year, issues(id, number, is_special, title, status, published_at, articles(count))")
    .order("number", { ascending: false });
  const volumes = (data ?? []) as Vol[];
  const nextVol = (volumes[0]?.number ?? 0) + 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">{t("admin.issues")}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={createVolume} className="card space-y-3">
          <h2 className="text-lg">{t("admin.newVolume")}</h2>
          <input type="hidden" name="journal_id" value={journal?.id ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            <label><span className="label">{t("admin.number")}</span><input name="number" type="number" defaultValue={nextVol} className="input" required /></label>
            <label><span className="label">{t("admin.year")}</span><input name="year" type="number" defaultValue={new Date().getFullYear()} className="input" required /></label>
          </div>
          <button className="btn-primary">{t("common.create")}</button>
        </form>

        {volumes.length > 0 && (
          <form action={createIssue} className="card space-y-3">
            <h2 className="text-lg">{t("admin.newIssue")}</h2>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="label">{t("admin.volume")}</span>
                <select name="volume_id" className="input">
                  {volumes.map((v) => <option key={v.id} value={v.id}>{t("archives.volume", { n: v.number, year: v.year })}</option>)}
                </select>
              </label>
              <label><span className="label">{t("admin.number")}</span><input name="number" type="number" min={1} defaultValue={1} className="input" required /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_special" /> {t("admin.special")}</label>
            <I18nFields name="title" label={t("common.title")} />
            <button className="btn-primary">{t("common.create")}</button>
          </form>
        )}
      </div>

      {volumes.map((v) => (
        <div key={v.id} className="card">
          <h2 className="mb-3 text-xl">{t("archives.volume", { n: v.number, year: v.year })}</h2>
          <table className="table">
            <tbody>
              {[...v.issues].sort((a, b) => b.number - a.number).map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">
                    {i.is_special ? `${t("archives.special")} ${i.number}` : t("archives.issue", { n: i.number })}
                    {tr(i.title, locale) && <span className="block text-xs font-normal text-slate-500">{tr(i.title, locale)}</span>}
                  </td>
                  <td>
                    <Link href={`/admin/articles?issue=${i.id}`} className="text-brand-600 hover:underline">
                      {i.articles?.[0]?.count ?? 0} {t("admin.articles").toLowerCase()}
                    </Link>
                  </td>
                  <td>
                    <span className={i.status === "published" ? "text-emerald-700" : "text-slate-500"}>
                      {i.status === "published" ? t("admin.isPublished") : "Draft"}
                    </span>
                    {i.published_at && <span className="block text-xs text-slate-400">{formatDate(i.published_at, locale)}</span>}
                  </td>
                  <td className="text-right"><IssueToggle id={i.id} published={i.status === "published"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
