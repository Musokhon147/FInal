"use client";

import { useState } from "react";
import type { I18nText } from "@/lib/i18n-field";
import RichTextEditor from "./RichTextEditor";

const LANGS = [["uz", "O'zbekcha"], ["ru", "Русский"], ["en", "English"]] as const;

/** Rich text in three languages, one tab per language. Field names: `${name}_uz` etc. */
export default function RichI18nFields({ name, label, value }: { name: string; label: string; value?: I18nText }) {
  const [tab, setTab] = useState<(typeof LANGS)[number][0]>("uz");
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className="mb-3 inline-flex rounded-full border border-slate-200 p-0.5" role="tablist">
        {LANGS.map(([code, n]) => (
          <button key={code} type="button" role="tab" aria-selected={tab === code} onClick={() => setTab(code)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tab === code ? "bg-slate-900 text-ink" : "text-slate-600 hover:text-slate-900"}`}>
            {n}
          </button>
        ))}
      </div>
      {LANGS.map(([code, n]) => (
        <div key={code} hidden={tab !== code} role="tabpanel">
          <RichTextEditor name={`${name}_${code}`} defaultValue={value?.[code] ?? ""} label={`${label} (${n})`} />
        </div>
      ))}
    </fieldset>
  );
}
