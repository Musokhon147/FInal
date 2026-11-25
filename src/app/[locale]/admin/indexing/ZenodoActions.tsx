"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sendToZenodo } from "./actions";

/** "Get DOIs from Zenodo" with a count, plus how many articles still need a PDF. */
export default function ZenodoActions({ ready, needPdf, connected }: { ready: number; needPdf: number; connected: boolean }) {
  const t = useTranslations("ix");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = () => start(async () => {
    setMsg(null);
    try {
      const r = await sendToZenodo();
      if (r.error && !r.sent) {
        const known = ["not-configured", "nothing-ready", "not-zenodo"].includes(r.error);
        setMsg({ ok: false, text: known ? t(`zErr_${r.error}` as "zErr_not-configured") : `${t("zErr")} ${r.error}` });
      } else {
        setMsg({ ok: !r.failed, text: [t("zRes", { count: r.sent ?? 0 }), r.failed ? t("zResFail", { count: r.failed }) : ""].filter(Boolean).join(" ") });
      }
      router.refresh();
    } catch {
      setMsg({ ok: false, text: t("err_generic") });
    }
  });

  return (
    <div className="space-y-3">
      {connected && ready > 0 && (
        <button type="button" className="btn-primary" disabled={pending} onClick={send}>{t("zSend", { count: ready })}</button>
      )}
      {pending && <p className="text-sm text-slate-500" role="status">{t("zWorking")}</p>}
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-accent/15 text-accent" : "bg-red-500/10 text-red-400"}`} role="status">{msg.text}</p>}
      {needPdf > 0 && <p className="text-sm text-slate-500">{t("zNoPdf", { count: needPdf })}</p>}
    </div>
  );
}
