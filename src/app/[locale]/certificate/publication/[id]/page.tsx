import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { getJournal, pagesRange } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import { issueLabel } from "@/lib/issue-label";
import { certNumber, chiefEditorName } from "@/lib/certificates";
import { SITE_URL } from "@/lib/site";
import type { Article } from "@/lib/types";
import Certificate from "@/components/design/Certificate";
import PrintButton from "@/components/fx/PrintButton";

export const metadata: Metadata = { robots: { index: false } };

export default async function PublicationCertificate({ params }: PageProps<"/[locale]/certificate/publication/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("articles")
    .select("*, issues(id, number, is_special, volumes(number, year))")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle<Article & { issues: { id: string; number: number; is_special: boolean; volumes: { number: number; year: number } | null } | null }>();
  if (!a) notFound();
  const [journal, chief] = await Promise.all([getJournal(), chiefEditorName(locale)]);
  const jt = tr(journal?.title, locale);
  const range = pagesRange(a.first_page, a.last_page);
  const details = [a.issues ? issueLabel(t, a.issues) : "", range ? t("issue.pages", { range }) : "", a.doi ? `DOI: ${a.doi}` : ""].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/article/${a.id}`} className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
        <PrintButton label={t("x.certPrint")} />
      </div>
      <Certificate
        journal={jt}
        heading={t("x.certPublication")}
        certifies={t("x.certCertifies")}
        names={a.authors.map((x) => x.name).join(", ")}
        body={t("x.certPubText", { title: a.title, journal: jt })}
        details={details}
        number={certNumber("PUB", a.id)}
        numberLabel={t("x.certNo")}
        verifyLabel={t("x.certVerify")}
        verifyUrl={`${SITE_URL}/${locale}/certificate/publication/${a.id}`}
        issuedLabel={t("x.certIssued")}
        issued={formatDate(a.published_at, locale)}
        signer={chief}
        signerRole={t("x.certEditor")}
      />
    </div>
  );
}
