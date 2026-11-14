"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function CiteBox({ formats }: { formats: Record<"apa" | "gost" | "mla", string> }) {
  const t = useTranslations("x");
  const [fmt, setFmt] = useState<"apa" | "gost" | "mla">("apa");
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mt-3 inline-flex rounded-full border border-slate-200 p-0.5" role="group">
        {(["apa", "gost", "mla"] as const).map((f) => (
          <button key={f} onClick={() => { setFmt(f); setCopied(false); }} aria-pressed={f === fmt}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${f === fmt ? "bg-brand-600 text-ink" : "text-slate-600 hover:text-slate-900"}`}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm leading-relaxed">{formats[fmt]}</p>
      <button className="btn-secondary mt-3" onClick={() => navigator.clipboard?.writeText(formats[fmt]).then(() => setCopied(true), () => {})}>
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
