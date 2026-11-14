import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import StatusBadge from "@/components/panel/StatusBadge";
import type { ReviewStatus, Submission } from "@/lib/types";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { supabase, user, profile } = await getSession();
  if (!user) redirect({ href: "/login", locale });

  const [{ data: subs }, { data: reviews }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, title, status, updated_at, created_at")
      .eq("submitter_id", user!.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("review_assignments")
      .select("id, status, due_at, round, submissions(title)")
      .eq("reviewer_id", user!.id)
      .in("status", ["invited", "accepted", "completed"])
      .order("created_at", { ascending: false }),
  ]);
  const submissions = (subs ?? []) as Pick<Submission, "id" | "title" | "status" | "updated_at">[];
  const assignments = (reviews ?? []) as unknown as {
    id: string; status: ReviewStatus; due_at: string | null; round: number; submissions: { title: string } | null;
  }[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">{t("dashboard.title")}</h1>
          <p className="text-slate-600">{profile?.full_name} · {user!.email}</p>
        </div>
        <Link href="/dashboard/submit" className="btn-primary">+ {t("dashboard.new")}</Link>
      </div>

      <section className="card">
        <h2 className="mb-4 text-xl">{t("dashboard.submissions")}</h2>
        {!submissions.length ? (
          <p className="text-slate-500">{t("dashboard.noSubmissions")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>{t("common.title")}</th><th>{t("common.status")}</th><th>{t("dashboard.updated")}</th></tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/dashboard/submissions/${s.id}`} className="text-brand-700 hover:underline">{s.title}</Link>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="whitespace-nowrap text-slate-500">{formatDate(s.updated_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {(profile?.is_reviewer || assignments.length > 0) && (
        <section className="card">
          <h2 className="mb-4 text-xl">{t("dashboard.reviews")}</h2>
          {!assignments.length ? (
            <p className="text-slate-500">{t("dashboard.noReviews")}</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>{t("common.title")}</th><th>{t("common.status")}</th><th>{t("admin.dueDate")}</th></tr>
              </thead>
              <tbody>
                {assignments.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/dashboard/reviews/${r.id}`} className="text-brand-700 hover:underline">
                        {r.submissions?.title}
                      </Link>
                    </td>
                    <td>{t(`reviewStatus.${r.status}`)}</td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(r.due_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
