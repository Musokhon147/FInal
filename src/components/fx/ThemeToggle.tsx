"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

export const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

function subscribe(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => o.disconnect();
}

export default function ThemeToggle() {
  const t = useTranslations("x");
  const light = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("light"), () => false);
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !light;
    const apply = () => {
      document.documentElement.classList.toggle("light", next);
      try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
    };
    const root = document.documentElement;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const r = e.currentTarget.getBoundingClientRect();
    root.style.setProperty("--vt-x", `${r.left + r.width / 2}px`);
    root.style.setProperty("--vt-y", `${r.top + r.height / 2}px`);
    root.classList.add("theme-vt");
    doc.startViewTransition(apply).finished.finally(() => root.classList.remove("theme-vt"));
  };
  const label = light ? t("themeDark") : t("themeLight");
  return (
    <button onClick={toggle} className="theme-icon navlink rounded-full p-1.5" aria-label={label} title={label}>
      {light ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      )}
    </button>
  );
}
