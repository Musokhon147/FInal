import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import StatusBadge from "@/components/panel/StatusBadge";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/types";

export default async function AdminSubmissions({ params, searchParams }: PageProps<"/[locale]/admin/submissions">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { status } = await searchParams;
  const filter = SUBMISSION_STATUSES.includes(status as SubmissionStatus) ? (status as SubmissionStatus) : null;
  const { supabase } = await getSession();

  let q = supabase
    .from("submissions")
    .select("id, title, status, submitted_at, updated_at, profiles!submissions_submitter_id_fkey(full_name, email)")
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const rows = (data ?? []) as unknown as {
    id: string; title: string; status: SubmissionStatus; submitted_at: string | null; updated_at: string;
    profiles: { full_name: string; email: string } | null;
  }[];

  return (
    <div className="card">
      <h1 className="mb-4 text-2xl">{t("admin.submissions")}</h1>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/submissions" className={`rounded-full px-3 py-1 ${!filter ? "bg-brand-600 text-ink" : "bg-slate-100"}`}>
          {t("admin.filterAll")}
        </Link>
        {SUBMISSION_STATUSES.filter((s) => s !== "draft").map((s) => (
          <Link key={s} href={`/admin/submissions?status=${s}`}
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
                <td><Link href={`/admin/submissions/${r.id}`} className="text-brand-700 hover:underline">{r.title}</Link></td>
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
