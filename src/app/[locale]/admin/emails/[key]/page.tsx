import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { DEFAULT_EMAILS, EMAIL_KEYS, EMAIL_VARS, SAMPLE_VARS, type EmailKey } from "@/lib/email-templates";
import EmailEditor from "./EmailEditor";

export default async function EmailEditPage({ params }: PageProps<"/[locale]/admin/emails/[key]">) {
  await initLocale(params);
  const { key } = await params;
  if (!(EMAIL_KEYS as readonly string[]).includes(key)) notFound();
  const k = key as EmailKey;
  const t = await getTranslations("adm");
  const { supabase } = await getSession();
  const { data } = await supabase.from("email_templates").select("subject, body").eq("key", k).maybeSingle();
  const saved = data as { subject: Record<string, string>; body: Record<string, string> } | null;
  const d = DEFAULT_EMAILS[k];
  const pick = (s: Record<string, string> | undefined, l: "uz" | "ru" | "en", def: string) => s?.[l]?.trim() || def;
  const initial = {
    subject: { uz: pick(saved?.subject, "uz", d.subject.uz), ru: pick(saved?.subject, "ru", d.subject.ru), en: pick(saved?.subject, "en", d.subject.en) },
    body: { uz: pick(saved?.body, "uz", d.body.uz), ru: pick(saved?.body, "ru", d.body.ru), en: pick(saved?.body, "en", d.body.en) },
  };
  return (
    <div>
      <Link href="/admin/emails" className="text-sm text-brand-700 hover:underline">← {t("emails")}</Link>
      <h1 className="mt-3 text-3xl">{t(`e_${k}`)}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(`ed_${k}`)}</p>
      <EmailEditor emailKey={k} initial={initial} defaults={d} vars={EMAIL_VARS[k]} sample={SAMPLE_VARS} customised={!!saved} />
    </div>
  );
}
