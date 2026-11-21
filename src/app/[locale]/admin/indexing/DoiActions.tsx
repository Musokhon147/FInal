"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { checkCrossref, giveMissingDois, sendToCrossref } from "./actions";

type Props = { withoutDoi: number; waiting: number; withDoi: number; prefix: boolean; connected: boolean; openFiles: number };

/** The buttons above the DOI table. Each says what it will do, with a count. */
export default function DoiActions({ withoutDoi, waiting, withDoi, prefix, connected, openFiles }: Props) {
  const t = useTranslations("ix");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ error?: string } & Record<string, unknown>>, ok: (r: Record<string, unknown>) => string) => start(async () => {
    setMsg(null);
    try {
      const r = await fn();
      if (r.error) {
        const known = ["no-prefix", "not-configured", "nothing-ready"].includes(r.error);
        setMsg({ ok: false, text: known ? t(`err_${r.error}` as "err_no-prefix") : `${t("err_crossref")} ${r.error}` });
      } else setMsg({ ok: true, text: ok(r) });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: t("err_generic") });
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {prefix && withoutDoi > 0 && (
          <button type="button" className="btn-primary" disabled={pending}
            onClick={() => run(giveMissingDois, (r) => t("res_given", { count: Number(r.count ?? 0) }))}>
            {t("giveDois", { count: withoutDoi })}
          </button>
        )}
        {connected && waiting > 0 && (
          <button type="button" className="btn-primary" disabled={pending}
            onClick={() => run(() => sendToCrossref("waiting"), (r) => t("res_sent", { count: Number(r.sent ?? 0) }))}>
            {t("send", { count: waiting })}
          </button>
        )}
        {connected && openFiles > 0 && (
          <button type="button" className="btn-secondary" disabled={pending}
            onClick={() => run(checkCrossref, (r) => t("res_checked", { registered: Number(r.registered ?? 0), failed: Number(r.failed ?? 0) }))}>
            {t("check")}
          </button>
        )}
        {connected && withDoi > 0 && (
          <button type="button" className="btn-secondary" disabled={pending} title={t("resendHint")}
            onClick={() => run(() => sendToCrossref("all"), (r) => t("res_sent", { count: Number(r.sent ?? 0) }))}>
            {t("resend")}
          </button>
        )}
        {prefix && withDoi > 0 && (
          <a href="/api/admin/crossref-xml" className="btn-secondary" download>{t("xml")}</a>
        )}
      </div>
      {pending && <p className="text-sm text-slate-500" role="status">{t("working")}</p>}
      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-accent/15 text-accent" : "bg-red-500/10 text-red-400"}`} role="status">{msg.text}</p>}
      {prefix && !connected && withDoi > 0 && <p className="text-xs text-slate-500">{t("xmlHint")}</p>}
    </div>
  );
}
