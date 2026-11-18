"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import I18nFields from "@/components/admin/I18nFields";
import { i18nOf } from "@/components/admin/forms";
import { uploadImage } from "@/components/admin/uploadImage";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { pdfCover } from "@/components/admin/pdfCover";
import type { I18nText } from "@/lib/i18n-field";
import { saveIssue } from "../../actions";

type Props = {
  issue: { id: string; title: I18nText; description: I18nText; cover_url: string | null; pdf_path: string | null; pdf_url: string | null; conference_id: string | null };
  conferences: { id: string; label: string }[];
};

export default function IssueForm({ issue, conferences }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cover, setCover] = useState(issue.cover_url);
  const [pdf, setPdf] = useState<{ path: string | null; url: string | null }>({ path: issue.pdf_path, url: issue.pdf_url });
  const [removeCover, setRemoveCover] = useState(false);
  const [removePdf, setRemovePdf] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const pdfFile = fd.get("pdf") as File | null, coverFile = fd.get("cover") as File | null;
      let pdf_path: string | null | undefined = removePdf ? null : undefined;
      let cover_url: string | null | undefined = removeCover ? null : undefined;
      if (pdfFile?.size) {
        if (pdfFile.type && pdfFile.type !== "application/pdf") throw new Error("pdf-only");
        pdf_path = await uploadArticlePdf(pdfFile);
      }
      if (coverFile?.size) cover_url = await uploadImage(coverFile, "issues");
      // no cover yet: use the first page of the PDF
      else if (pdfFile?.size && (!cover || removeCover)) {
        const img = await pdfCover(pdfFile, `issue-${issue.id}`);
        if (img) cover_url = await uploadImage(img, "issues");
      }
      await saveIssue(issue.id, {
        title: i18nOf(fd, "title"), description: i18nOf(fd, "description"),
        conference_id: String(fd.get("conference_id") || "") || null, cover_url, pdf_path,
      });
      router.push("/admin/issues");
      router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m === "too-big" ? t("x.logoHint") : m === "pdf-only" ? t("pt.pdfOnly") : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <I18nFields name="title" label={t("common.title")} value={issue.title} />
      <I18nFields name="description" label={t("x.description")} value={issue.description} />
      <label className="block">
        <span className="label">{t("x.conference")}</span>
        <select name="conference_id" defaultValue={issue.conference_id ?? ""} className="input">
          <option value="">{t("pt.noConference")}</option>
          {conferences.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <label className="block">
            <span className="label">{t("pt.issuePdf")}</span>
            <input name="pdf" type="file" accept="application/pdf" className="input" onChange={() => setRemovePdf(false)} />
            <span className="mt-1 block text-xs text-slate-500">{t("pt.issuePdfHint")}</span>
          </label>
          {pdf.path && !removePdf && (
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-500">{t("pt.currentFile")}:</span>
              <a href={pdf.url ?? "#"} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">{pdf.path.split("/").pop()}</a>
              <button type="button" className="text-red-400 hover:underline" onClick={() => { setRemovePdf(true); setPdf({ path: null, url: null }); }}>{t("pt.removePdf")}</button>
            </p>
          )}
          <label className="block">
            <span className="label">{t("pt.cover")}</span>
            <input name="cover" type="file" accept="image/*" className="input" onChange={() => setRemoveCover(false)} />
          </label>
        </div>
        <div>
          {cover && !removeCover ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="aspect-[3/4] w-full rounded-lg object-cover shadow-lg ring-1 ring-slate-200" />
              <button type="button" className="mt-2 text-xs text-red-400 hover:underline" onClick={() => { setRemoveCover(true); setCover(null); }}>{t("pt.removeCover")}</button>
            </figure>
          ) : <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">{t("pt.cover")}</div>}
        </div>
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
    </form>
  );
}
