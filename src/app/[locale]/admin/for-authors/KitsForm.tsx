"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import RichI18nFields from "@/components/admin/RichI18nFields";
import { i18nOf } from "@/components/admin/forms";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { PUB_TYPES } from "@/lib/pubtypes";
import type { I18nText } from "@/lib/i18n-field";
import type { PubType } from "@/lib/types";
import { saveAuthorKits } from "../actions";

type Kit = { guide: I18nText; template: string | null; templateUrl: string | null };

export default function KitsForm({ initial }: { initial: Record<string, Kit> }) {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<PubType>("journal");
  const [kits, setKits] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "pdf">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setStatus("idle");
    try {
      const next: Record<string, { guide: Record<string, string>; template: string | null }> = {};
      for (const k of PUB_TYPES) {
        const file = fd.get(`template_${k}`) as File | null;
        if (file?.size && file.type && file.type !== "application/pdf") { setStatus("pdf"); setBusy(false); return; }
        next[k] = { guide: i18nOf(fd, `guide_${k}`), template: file?.size ? await uploadArticlePdf(file) : kits[k].template };
      }
      await saveAuthorKits(next);
      setStatus("saved");
      router.refresh();
    } catch { setStatus("error"); }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist">
        {PUB_TYPES.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`pub-type card p-3 text-left text-sm font-semibold text-slate-900 ${tab === k ? "is-on" : ""}`}>
            {t(`pt.${k}`)}
          </button>
        ))}
      </div>
      {/* all three panels stay in the form so one Save stores everything */}
      {PUB_TYPES.map((k) => (
        <div key={k} hidden={tab !== k} className="space-y-5" role="tabpanel">
          <RichI18nFields name={`guide_${k}`} label={`${t("pt.guide")}: ${t(`pt.${k}`)}`} value={kits[k].guide} />
          <div className="rounded-xl border border-slate-200 p-4">
            <label className="block">
              <span className="label">{t("pt.sample")}</span>
              <input name={`template_${k}`} type="file" accept="application/pdf" className="input" />
            </label>
            {kits[k].template ? (
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-500">{t("pt.currentFile")}:</span>
                <a href={kits[k].templateUrl ?? "#"} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">{kits[k].template!.split("/").pop()}</a>
                <button type="button" className="text-red-400 hover:underline" onClick={() => setKits({ ...kits, [k]: { ...kits[k], template: null, templateUrl: null } })}>{t("pt.removePdf")}</button>
              </p>
            ) : <p className="mt-2 text-sm text-slate-500">{t("pt.noSample")}</p>}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
        {status === "saved" && <span className="text-sm text-accent" role="status">{t("adm.saved")} ✓</span>}
        {status === "error" && <span className="text-sm text-red-400" role="alert">{t("common.error")}</span>}
        {status === "pdf" && <span className="text-sm text-red-400" role="alert">{t("pt.pdfOnly")}</span>}
      </div>
    </form>
  );
}
