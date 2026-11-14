"use client";

import { useTranslations } from "next-intl";

/** Round reading-progress button for articles. Effects.tsx fills it (--p) as you scroll; click to go back up. */
export default function ReadingRing() {
  const t = useTranslations("x");
  return (
    <button id="readring" type="button" className="read-ring print:hidden" aria-label={t("toTop")} title={t("toTop")}
      onClick={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" className="read-ring-track" />
        <circle cx="24" cy="24" r="21" className="read-ring-fill" pathLength="1" />
      </svg>
      <span className="read-ring-num"><span data-pct>0</span><small>%</small></span>
      <svg className="read-ring-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}
