"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { extractPdfText } from "@/components/admin/extractPdfText";
import { celebrate } from "@/lib/celebrate";
import { quickPublish, setDecision } from "../../actions";

type Props = {
  submissionId: string;
  status: string;
  note: string | null;
  articleId: string | null;
  /** detailed forms (status dropdown, choose issue/pages/DOI), shown folded */
  manualStatus: ReactNode;
  advancedPublish: ReactNode;
};

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-4 border-t border-slate-200 pt-3">
      <summary className="cursor-pointer list-none text-sm text-slate-500 hover:text-slate-900">
        <span className="inline-block transition group-open:rotate-90">›</span> {label}
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

/** The editor's panel: three clear choices, then one "Publish now". Details stay folded. */
export default function DecisionPanel({ submissionId, status, note, articleId, manualStatus, advancedPublish }: Props) {
  const t = useTranslations("pt");
  const router = useRouter();
  const [open, setOpen] = useState<"revision" | "reject" | null>(null);
  const [text, setText] = useState(note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const publish = async (file?: File | null) => {
    setBusy(true); setError(null);
    try {
      let pdfPath: string | null = null, fullText: string | null = null;
      if (file?.size) [pdfPath, fullText] = await Promise.all([uploadArticlePdf(file), extractPdfText(file)]);
      const r = await quickPublish(submissionId, { pdfPath, fullText });
      if ("error" in r && r.error) { setError(r.error === "needs-conference" ? t("needsConference") : t("working")); setBusy(false); return; }
      celebrate();
      router.refresh();
    } catch { setError("error"); }
    setBusy(false);
  };

  const decide = async (next: "revision_required" | "rejected") => {
    setBusy(true); setError(null);
    const fd = new FormData();
    fd.set("id", submissionId); fd.set("status", next); fd.set("note", text);
    try { await setDecision(fd); setOpen(null); router.refresh(); } catch { setError("error"); }
    setBusy(false);
  };

  // done
  if (articleId) {
    return (
      <div className="card space-y-3 border-accent/60">
        <h2 className="text-lg">{t("stepPublished")} ✓</h2>
        <p className="text-sm text-slate-600">{t("publishedDone")}</p>
        <div className="flex flex-col gap-2">
          <Link href={`/article/${articleId}`} className="btn-primary w-full justify-center">{t("viewOnSite")}</Link>
          <Link href={`/admin/articles/${articleId}`} className="btn-secondary w-full justify-center">{t("editArticle")}</Link>
        </div>
      </div>
    );
  }
  if (status === "withdrawn") return null;

  // accepted: one button
  if (status === "accepted") {
    return (
      <div className="card space-y-3 border-accent/60">
        <h2 className="text-lg">{t("publishNowTitle")}</h2>
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{t("acceptedNotLive")}</p>
        <label className="block text-xs text-slate-500">
          {t("finalPdfOptional")}
          <input ref={fileRef} type="file" accept="application/pdf" className="input mt-1" />
        </label>
        {error && <p className="text-sm text-red-400" role="alert">{error === "error" ? "!" : error}</p>}
        <button type="button" className="btn-gold w-full justify-center py-3 text-base" disabled={busy} onClick={() => publish(fileRef.current?.files?.[0] ?? null)}>
          {busy ? t("working") : `🚀 ${t("publishNowBtn")}`}
        </button>
        <More label={t("moreOptions")}>
          <p className="text-xs text-slate-500">{t("advancedPublish")}</p>
          {advancedPublish}
          {manualStatus}
        </More>
      </div>
    );
  }

  // waiting for a decision
  return (
    <div className="card space-y-3">
      <h2 className="text-lg">{t("decisionTitle")}</h2>
      {status === "rejected" ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{t("rejectedNote")}</p>
      ) : open ? (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="input min-h-28" autoFocus
            placeholder={open === "revision" ? t("notePlaceholder") : t("rejectPlaceholder")} />
          <div className="flex gap-2">
            <button type="button" className={open === "reject" ? "btn-secondary flex-1 justify-center border-red-400/60 text-red-400" : "btn-primary flex-1 justify-center"}
              disabled={busy || (open === "revision" && !text.trim())} onClick={() => decide(open === "revision" ? "revision_required" : "rejected")}>
              {busy ? t("working") : open === "revision" ? t("confirmSendBack") : t("confirmReject")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(null)}>{t("cancel")}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button type="button" className="btn-gold w-full justify-center py-3 text-base" disabled={busy} onClick={() => publish(null)}>
            {busy ? t("working") : `✅ ${t("acceptPublish")}`}
          </button>
          <p className="px-1 text-xs text-slate-500">{t("acceptPublishHint")}</p>
          <button type="button" className="btn-secondary w-full justify-center" onClick={() => { setText(""); setOpen("revision"); }}>✏️ {t("sendBack")}</button>
          <button type="button" className="btn-secondary w-full justify-center text-red-400" onClick={() => { setText(""); setOpen("reject"); }}>✕ {t("reject")}</button>
        </div>
      )}
      {error && <p className="text-sm text-red-400" role="alert">{error === "error" ? "!" : error}</p>}
      <More label={t("moreOptions")}>
        <p className="text-xs text-slate-500">{t("otherStatus")}</p>
        {manualStatus}
      </More>
    </div>
  );
}
