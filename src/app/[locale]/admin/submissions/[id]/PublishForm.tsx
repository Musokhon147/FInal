"use client";

import { celebrate } from "@/lib/celebrate";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { extractPdfText } from "@/components/admin/extractPdfText";
import { publishSubmission } from "../../actions";
import { DOI_PATTERN } from "@/lib/identifiers";
import PdfInput from "@/components/admin/PdfInput";

export default function PublishForm({ submissionId, issues }: { submissionId: string; issues: { id: string; label: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const file = f.get("pdf") as File | null;
      const [pdfPath, fullText] = file?.size ? await Promise.all([uploadArticlePdf(file), extractPdfText(file)]) : [null, null];
      const num = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
      const articleId = await publishSubmission({
        submissionId,
        issueId: String(f.get("issue_id")),
        firstPage: num("first_page"),
        lastPage: num("last_page"),
        doi: String(f.get("doi") || "") || null,
        pdfPath,
        fullText,
      });
      celebrate();
      router.push(`/admin/articles/${articleId}`);
    } catch (err) {
      setError(err instanceof Error && err.message === "bad-doi" ? t("ix.badDoi") : err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  if (!issues.length) {
    return (
      <div className="card space-y-3 border-accent/60">
        <h2 className="text-lg">{t("admin.publish")}</h2>
        <p className="text-sm text-slate-600">{t("pt.noIssuesYet")}</p>
        <Link href="/admin/issues" className="btn-primary w-full justify-center">{t("pt.createIssue")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-brand-600/50">
      <h2 className="text-lg">{t("admin.publish")}</h2>
      <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{t("pt.acceptedNotLive")}</p>
      <div>
        <label className="label">{t("admin.selectIssue")}</label>
        <select name="issue_id" className="input" required>
          {issues.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">{t("pt.issueDraftHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">{t("admin.firstPage")}</label><input name="first_page" type="number" min={1} className="input" /></div>
        <div><label className="label">{t("admin.lastPage")}</label><input name="last_page" type="number" min={1} className="input" /></div>
      </div>
      <div>
        <label className="label">{t("admin.doi")}</label>
        <input name="doi" className="input" placeholder="10.xxxxx/xxxx" pattern={DOI_PATTERN} title={t("ix.badDoi")} />
        <p className="mt-1 text-xs text-slate-500">{t("ix.doiInputHint")}</p>
      </div>
      <div><label className="label">{t("admin.finalPdf")}</label><PdfInput name="pdf" className="input" /></div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !issues.length}>{busy ? t("common.loading") : t("admin.publish")}</button>
    </form>
  );
}
