import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession, isStaff } from "@/lib/auth";
import { getJournal } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import { certNumber, chiefEditorName } from "@/lib/certificates";
import { SITE_URL } from "@/lib/site";
import type { Profile, ReviewAssignment } from "@/lib/types";
import Certificate from "@/components/design/Certificate";
import PrintButton from "@/components/fx/PrintButton";

export const metadata: Metadata = { robots: { index: false } };

export default async function ReviewCertificate({ params }: PageProps<"/[locale]/certificate/review/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase, user, profile } = await getSession();
  const { data: r } = await supabase.from("review_assignments").select("*").eq("id", id).maybeSingle<ReviewAssignment>();
  // only the reviewer (or an editor) can open it, and only for finished reviews
  if (!r || r.status !== "completed" || (r.reviewer_id !== user?.id && !isStaff(profile))) notFound();
  const { data: reviewer } = await supabase.from("profiles").select("full_name, affiliation").eq("id", r.reviewer_id).maybeSingle<Pick<Profile, "full_name" | "affiliation">>();
  const [journal, chief] = await Promise.all([getJournal(), chiefEditorName(locale)]);
  const jt = tr(journal?.title, locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/reviews/${r.id}`} className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
        <PrintButton label={t("x.certPrint")} />
      </div>
      <Certificate
        journal={jt}
        heading={t("x.certReview")}
        certifies={t("x.certCertifies")}
        names={reviewer?.full_name ?? ""}
        body={t("x.certRevText", { journal: jt })}
        details={reviewer?.affiliation ? [reviewer.affiliation] : []}
        number={certNumber("REV", r.id)}
        numberLabel={t("x.certNo")}
        verifyLabel={t("x.certVerify")}
        verifyUrl={`${SITE_URL}/${locale}/certificate/review/${r.id}`}
        issuedLabel={t("x.certIssued")}
        issued={formatDate(r.completed_at, locale)}
        signer={chief}
        signerRole={t("x.certEditor")}
      />
    </div>
  );
}
