import { getTranslations } from "next-intl/server";
import { PUB_TYPES, isPubType } from "@/lib/pubtypes";
import type { PubType } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import StatusBadge from "@/components/panel/StatusBadge";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/types";

export default async function AdminSubmissions({ params, searchParams }: PageProps<"/[locale]/admin/submissions">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { status, type } = await searchParams;
  const typeFilter = isPubType(type) ? type : null;
  const filter = SUBMISSION_STATUSES.includes(status as SubmissionStatus) ? (status as SubmissionStatus) : null;
  const { supabase } = await getSession();

  let q = supabase
    .from("submissions")
    .select("id, title, status, pub_type, submitted_at, updated_at, profiles!submissions_submitter_id_fkey(full_name, email)")
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filter) q = q.eq("status", filter);
  if (typeFilter) q = q.eq("pub_type", typeFilter);
  const qs = (x: { status?: string | null; type?: string | null }) => {
    const p = new URLSearchParams();
    const st = x.status === undefined ? filter : x.status, ty = x.type === undefined ? typeFilter : x.type;
    if (st) p.set("status", st);
    if (ty) p.set("type", ty);
    return `/admin/submissions${p.size ? `?${p}` : ""}`;
  };
  const { data } = await q;
  const rows = (data ?? []) as unknown as {
    id: string; title: string; status: SubmissionStatus; pub_type: PubType; submitted_at: string | null; updated_at: string;
    profiles: { full_name: string; email: string } | null;
  }[];

  return (
    <div className="card">
      <h1 className="mb-4 text-2xl">{t("admin.submissions")}</h1>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link href={qs({ type: null })} className={`rounded-full border px-3 py-1 ${!typeFilter ? "border-slate-900 bg-slate-900 text-slate-50" : "border-slate-200"}`}>{t("admin.filterAll")}</Link>
        {PUB_TYPES.map((k) => (
          <Link key={k} href={qs({ type: k })} className={`rounded-full border px-3 py-1 ${typeFilter === k ? "border-slate-900 bg-slate-900 text-slate-50" : "border-slate-200"}`}>{t(`pt.${k}`)}</Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={qs({ status: null })} className={`rounded-full px-3 py-1 ${!filter ? "bg-brand-600 text-ink" : "bg-slate-100"}`}>
          {t("admin.filterAll")}
        </Link>
        {SUBMISSION_STATUSES.filter((s) => s !== "draft").map((s) => (
          <Link key={s} href={qs({ status: s })}
            className={`rounded-full px-3 py-1 ${filter === s ? "bg-brand-600 text-ink" : "bg-slate-100"}`}>
            {t(`status.${s}`)}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>{t("common.title")}</th><th>{t("admin.author")}</th><th>{t("common.status")}</th><th>{t("common.date")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/submissions/${r.id}`} className="text-brand-700 hover:underline">{r.title}</Link>
                  <span className={`mt-1 block w-fit rounded px-1.5 py-0.5 text-[11px] ${r.pub_type === "journal" ? "bg-slate-200 text-slate-600" : "bg-accent/15 text-accent"}`}>{t(`pt.${r.pub_type ?? "journal"}`)}</span>
                </td>
                <td className="text-slate-600">{r.profiles?.full_name}<br /><span className="text-xs">{r.profiles?.email}</span></td>
                <td><StatusBadge status={r.status} /></td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(r.submitted_at ?? r.updated_at, locale)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="text-slate-500">{t("common.none")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
