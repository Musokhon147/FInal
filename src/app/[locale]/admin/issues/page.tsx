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
  issues: { id: string; number: number; is_special: boolean; title: I18nText; status: string; published_at: string | null; pdf_path?: string | null; articles: { count: number }[] }[];
};

export default async function AdminIssues({ params }: PageProps<"/[locale]/admin/issues">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { supabase } = await getSession();
  const journal = await getJournal();
  const { data } = await supabase
    .from("volumes")
    .select("id, number, year, issues(id, number, is_special, title, status, published_at, pdf_path, articles(count))")
    .order("number", { ascending: false });
  const volumes = (data ?? []) as Vol[];
  const { data: confs } = await supabase.from("conferences").select("id, title").order("start_date", { ascending: false });
  const conferences = (confs ?? []) as { id: string; title: I18nText }[];
  const nextVol = (volumes[0]?.number ?? 0) + 1;
  // accepted manuscripts not yet published: shown on top so the next step is obvious
  const { data: waiting } = await supabase.from("submissions").select("id, title").eq("status", "accepted").order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">{t("admin.issues")}</h1>
      {(waiting ?? []).length > 0 && (
        <div className="card border-accent/60">
          <h2 className="text-lg">{t("pt.waitingPublish")}</h2>
          <ul className="mt-3 divide-y divide-slate-200/70">
            {((waiting ?? []) as { id: string; title: string }[]).map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-slate-900">{w.title}</span>
                <Link href={`/admin/submissions/${w.id}`} className="btn-secondary text-sm">{t("pt.publishNow")} →</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            {conferences.length > 0 && (
              <label className="block"><span className="label">{t("x.conference")}</span>
                <select name="conference_id" className="input" defaultValue="">
                  <option value="">{t("x.noConference")}</option>
                  {conferences.map((c) => <option key={c.id} value={c.id}>{tr(c.title, locale)}</option>)}
                </select>
              </label>
            )}
            <I18nFields name="title" label={t("common.title")} />
            <button className="btn-primary">{t("common.create")}</button>
          </form>
        )}
      </div>

      {volumes.map((v) => (
        <div key={v.id} className="card">
          <h2 className="mb-3 text-xl">{t("archives.volume", { n: v.number, year: v.year })}</h2>
          {v.issues.length === 0 && (
            <form action={createIssue} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-4">
              <p className="text-sm text-slate-600">{t("pt.noIssuesInVolume")}</p>
              <input type="hidden" name="volume_id" value={v.id} />
              <input type="hidden" name="number" value="1" />
              <button className="btn-primary">+ {t("pt.addIssueN", { n: 1 })}</button>
            </form>
          )}
          <table className="table">
            <tbody>
              {[...v.issues].sort((a, b) => b.number - a.number).map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">
                    {i.is_special ? `${t("archives.special")} ${i.number}` : t("archives.issue", { n: i.number })}
                    {tr(i.title, locale) && <span className="block text-xs font-normal text-slate-500">{tr(i.title, locale)}</span>}
                    {i.pdf_path && <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[11px] text-brand-700">PDF</span>}
                  </td>
                  <td>
                    <Link href={`/admin/articles?issue=${i.id}`} className="text-brand-600 hover:underline">
                      {i.articles?.[0]?.count ?? 0} {t("admin.articles").toLowerCase()}
                    </Link>
                  </td>
                  <td>
                    <span className={i.status === "published" ? "text-brand-700" : "text-slate-500"}>
                      {i.status === "published" ? t("admin.isPublished") : "Draft"}
                    </span>
                    {i.published_at && <span className="block text-xs text-slate-400">{formatDate(i.published_at, locale)}</span>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`/admin/issues/${i.id}`} className="mr-3 text-sm text-brand-700 hover:underline">{t("pt.editIssue")}</Link>
                    <IssueToggle id={i.id} published={i.status === "published"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
