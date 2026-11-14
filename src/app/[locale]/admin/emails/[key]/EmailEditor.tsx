"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fillTemplate, type L3 } from "@/lib/email-templates";
import { resetEmailTemplate, saveEmailTemplate } from "../../actions";

const LANGS = [["uz", "O'zbek"], ["ru", "Русский"], ["en", "English"]] as const;
type Lang = (typeof LANGS)[number][0];

export default function EmailEditor({ emailKey, initial, defaults, vars, sample, customised }: {
  emailKey: string; initial: { subject: L3; body: L3 }; defaults: { subject: L3; body: L3 }; vars: string[]; sample: Record<string, string>; customised: boolean;
}) {
  const t = useTranslations("adm");
  const tc = useTranslations("common");
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("uz");
  const [subject, setSubject] = useState<L3>(initial.subject);
  const [body, setBody] = useState<L3>(initial.body);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const focused = useRef<"subject" | "body">("body");
  const subjRef = useRef<HTMLInputElement>(null), bodyRef = useRef<HTMLTextAreaElement>(null);

  const dirty = JSON.stringify({ subject, body }) !== JSON.stringify(initial);
  const unknown = [...new Set([...(subject[lang] + body[lang]).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((v) => !vars.includes(v)))];

  const insert = (v: string) => {
    const field = focused.current, el = field === "subject" ? subjRef.current : bodyRef.current;
    const value = field === "subject" ? subject[lang] : body[lang];
    const at = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? at;
    const next = value.slice(0, at) + `{{${v}}}` + value.slice(end);
    (field === "subject" ? setSubject : setBody)((o) => ({ ...o, [lang]: next }));
    requestAnimationFrame(() => { el?.focus(); const p = at + v.length + 4; el?.setSelectionRange(p, p); });
    setStatus("idle");
  };

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <div className="card space-y-4 p-6">
        <div className="flex gap-1 rounded-full border border-slate-200 p-1 text-sm" role="tablist">
          {LANGS.map(([l, label]) => (
            <button key={l} role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
              className={`flex-1 rounded-full px-3 py-1.5 ${lang === l ? "bg-slate-900 text-slate-50" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>
          ))}
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t("subject")}</span>
          <input ref={subjRef} className="input mt-1" value={subject[lang]} onFocus={() => (focused.current = "subject")}
            onChange={(e) => { setSubject({ ...subject, [lang]: e.target.value }); setStatus("idle"); }} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t("body")}</span>
          <textarea ref={bodyRef} rows={14} className="input mt-1 font-mono text-[13px] leading-relaxed" value={body[lang]} onFocus={() => (focused.current = "body")}
            onChange={(e) => { setBody({ ...body, [lang]: e.target.value }); setStatus("idle"); }} />
        </label>
        <div>
          <p className="mb-2 text-xs text-slate-500">{t("placeholders")}</p>
          <div className="flex flex-wrap gap-1.5">
            {vars.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs text-brand-700 hover:border-brand-600">{`{{${v}}}`}</button>)}
          </div>
          {unknown.length > 0 && <p className="mt-3 text-sm text-red-400" role="alert">{t("unknownVar")}: {unknown.map((u) => `{{${u}}}`).join(", ")}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
          <button className="btn-primary" disabled={pending || !dirty}
            onClick={() => start(async () => { try { await saveEmailTemplate(emailKey, subject, body); setStatus("saved"); router.refresh(); } catch { setStatus("error"); } })}>
            {t("save")}
          </button>
          {status === "saved" && <span className="text-sm text-accent" role="status">{t("saved")} ✓</span>}
          {status === "error" && <span className="text-sm text-red-400" role="alert">{tc("error")}</span>}
          {(customised || dirty) && (
            <button className="ml-auto text-sm text-slate-500 hover:text-slate-900" disabled={pending}
              onClick={() => start(async () => { await resetEmailTemplate(emailKey); setSubject(defaults.subject); setBody(defaults.body); setStatus("idle"); router.refresh(); })}>
              {t("resetDefault")}
            </button>
          )}
        </div>
      </div>

      <section className="card p-0" aria-label={t("preview")}>
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-500">{t("preview")} · {t("previewHint")}</p>
          <p className="mt-2 font-semibold text-slate-900">{fillTemplate(subject[lang], sample)}</p>
        </div>
        <div className="whitespace-pre-wrap px-6 py-5 text-sm leading-relaxed text-slate-700">{fillTemplate(body[lang], sample)}</div>
      </section>
    </div>
  );
}
