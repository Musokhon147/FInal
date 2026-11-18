import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import { DEFAULT_EMAILS, EMAIL_KEYS, type Lang } from "@/lib/email-templates";
import { emailConfigured } from "@/lib/email";

export default async function EmailsPage({ params }: PageProps<"/[locale]/admin/emails">) {
  const locale = await initLocale(params);
  const t = await getTranslations("adm");
  const { supabase } = await getSession();
  const [{ data }, { data: log }] = await Promise.all([
    supabase.from("email_templates").select("key, updated_at"),
    supabase.from("email_log").select("id, key, to_email, subject, status, error, created_at").order("created_at", { ascending: false }).limit(25),
  ]);
  const on = emailConfigured();
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : locale === "en" ? "en-GB" : "uz-Latn-UZ", { dateStyle: "short", timeStyle: "short" });
  const saved = new Map(((data ?? []) as { key: string; updated_at: string }[]).map((r) => [r.key, r.updated_at]));
  return (
    <div>
      <h1 className="text-3xl">{t("emails")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("emailsIntro")}</p>
      <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${on ? "bg-accent/15 text-accent" : "bg-red-500/10 text-red-400"}`} role="status">
        {on ? `✓ ${t("sendingOn")}` : t("sendingOff")}
      </p>
      <ul className="mt-6 space-y-3">
        {EMAIL_KEYS.map((k) => (
          <li key={k}>
            <Link href={`/admin/emails/${k}`} className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-5 transition hover:border-brand-600/50">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{t(`e_${k}`)}</span>
                <span className="block text-sm text-slate-500">{t(`ed_${k}`)}</span>
                <span className="mt-1 block truncate text-sm text-slate-600">{DEFAULT_EMAILS[k].subject[locale as Lang]}</span>
              </span>
              {saved.has(k)
                ? <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{t("customised")} · {formatDate(saved.get(k)!, locale)}</span>
                : <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs text-slate-600">{t("default")}</span>}
              <span className="text-sm font-semibold text-brand-700">{t("edit")}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl">{t("recentEmails")}</h2>
      {!(log ?? []).length ? <p className="mt-3 text-sm text-slate-500">{t("noEmails")}</p> : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-2.5 font-medium">{t("when")}</th><th className="px-4 py-2.5 font-medium">{t("to")}</th>
              <th className="px-4 py-2.5 font-medium">{t("subject")}</th><th className="px-4 py-2.5 font-medium">{t("status")}</th>
            </tr></thead>
            <tbody>
              {((log ?? []) as { id: number; key: string; to_email: string; subject: string | null; status: "sent" | "failed" | "skipped"; error: string | null; created_at: string }[]).map((r) => (
                <tr key={r.id} className="border-b border-slate-200/60 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500">{fmt.format(new Date(r.created_at))}</td>
                  <td className="px-4 py-2.5 text-slate-700">{r.to_email}</td>
                  <td className="px-4 py-2.5 text-slate-900">{r.subject}</td>
                  <td className="px-4 py-2.5">
                    <span className={r.status === "sent" ? "text-accent" : r.status === "failed" ? "text-red-400" : "text-slate-500"}>{t(`st_${r.status}`)}</span>
                    {r.error && <span className="block text-xs text-slate-500">{r.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
