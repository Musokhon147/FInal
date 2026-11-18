"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resendConfirmation } from "./actions";

/** Webmail inbox for common providers, so "Open Gmail" takes people straight to the email. */
function inboxFor(email: string): { service: string; url: string } | null {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (d === "gmail.com" || d === "googlemail.com") return { service: "Gmail", url: "https://mail.google.com/mail/u/0/#search/from%3Asupabase+OR+confirm" };
  if (/^(outlook|hotmail|live|msn)\./.test(d)) return { service: "Outlook", url: "https://outlook.live.com/mail/" };
  if (/^(mail|inbox|list|bk)\.ru$/.test(d)) return { service: "Mail.ru", url: "https://e.mail.ru/inbox/" };
  if (/^yandex\./.test(d) || d === "ya.ru") return { service: "Yandex", url: "https://mail.yandex.ru/" };
  if (d === "icloud.com" || d === "me.com") return { service: "iCloud", url: "https://www.icloud.com/mail" };
  if (d === "yahoo.com") return { service: "Yahoo", url: "https://mail.yahoo.com/" };
  return null;
}

export default function CheckEmail({ email, onBack, delay = 60 }: { email: string; onBack?: () => void; delay?: number }) {
  const t = useTranslations("auth");
  const [wait, setWait] = useState(delay);
  const [note, setNote] = useState<"sent" | "error" | null>(null);
  const [pending, start] = useTransition();
  const inbox = inboxFor(email);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const resend = () => start(async () => {
    const r = await resendConfirmation(email);
    setNote(r.ok ? "sent" : "error");
    setWait(60);
  });

  return (
    <div className="check-email text-center" role="status" aria-live="polite">
      <div className="check-envelope mx-auto" aria-hidden="true">
        <svg viewBox="0 0 120 96" fill="none">
          <rect x="6" y="18" width="108" height="72" rx="10" className="env-back" />
          <g className="env-letter">
            <rect x="20" y="8" width="80" height="56" rx="6" className="env-paper" />
            <path d="M32 24h56M32 34h44M32 44h50" className="env-lines" />
            <circle cx="90" cy="12" r="10" className="env-check-bg" />
            <path d="m85.5 12 3 3 6-6" className="env-check" />
          </g>
          <path d="M6 30 60 62l54-32v50a10 10 0 0 1-10 10H16A10 10 0 0 1 6 80Z" className="env-front" />
          <path d="M6 30 60 62l54-32" className="env-fold" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl">{t("checkTitle")}</h1>
      <p className="mt-3 text-slate-600">{t("checkSent")}</p>
      <p className="mt-1 break-all font-semibold text-slate-900">{email}</p>

      <ol className="check-steps mx-auto mt-6 max-w-xs space-y-2.5 text-left text-sm text-slate-600">
        {(["checkStep1", "checkStep2", "checkStep3"] as const).map((k, i) => (
          <li key={k} className="flex items-start gap-3">
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">{i + 1}</span>
            <span>{t(k)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-col gap-3">
        {inbox && (
          <a href={inbox.url} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center">
            {t("openMail", { service: inbox.service })}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="ml-1.5"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </a>
        )}
        <button type="button" onClick={resend} disabled={wait > 0 || pending} className="btn-secondary w-full justify-center disabled:opacity-60">
          {wait > 0 ? t("resendIn", { s: wait }) : t("resend")}
        </button>
        {note === "sent" && <p className="text-sm text-accent">{t("resent")}</p>}
        {note === "error" && <p className="text-sm text-red-400">{t("resendError")}</p>}
      </div>

      <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-left text-xs leading-relaxed text-slate-500">{t("spamTip")}</p>
      {onBack && <button type="button" onClick={onBack} className="mt-4 text-sm text-brand-700 hover:underline">{t("wrongEmail")}</button>}
    </div>
  );
}
