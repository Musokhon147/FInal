import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import { DEFAULT_EMAILS, EMAIL_KEYS, type Lang } from "@/lib/email-templates";

export default async function EmailsPage({ params }: PageProps<"/[locale]/admin/emails">) {
  const locale = await initLocale(params);
  const t = await getTranslations("adm");
  const { supabase } = await getSession();
  const { data } = await supabase.from("email_templates").select("key, updated_at");
  const saved = new Map(((data ?? []) as { key: string; updated_at: string }[]).map((r) => [r.key, r.updated_at]));
  return (
    <div>
      <h1 className="text-3xl">{t("emails")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("emailsIntro")}</p>
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
    </div>
  );
}
