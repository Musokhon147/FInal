"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};
const isOff = () => document.documentElement.classList.contains("fx-off");

/** Switch the 3D scene and motion effects off (remembered on this device). Handy on slow phones. */
export default function FxToggle() {
  const t = useTranslations("x");
  const off = useSyncExternalStore(subscribe, isOff, () => false);
  const toggle = () => {
    const next = !off;
    document.documentElement.classList.toggle("fx-off", next);
    try { localStorage.setItem("fx", next ? "off" : "on"); } catch {}
  };
  const label = off ? t("fxTurnOn") : t("fxTurnOff");
  return (
    <button onClick={toggle} className="navlink rounded-full p-1.5" aria-pressed={!off} aria-label={label} title={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z" />
        <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        {off && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
