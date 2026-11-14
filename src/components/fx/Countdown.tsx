"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function Countdown({ until }: { until: string }) {
  const t = useTranslations("x");
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(Math.max(0, Date.parse(until) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  const parts: [string, number | null][] = [
    ["days", ms === null ? null : Math.floor(ms / 864e5)],
    ["hours", ms === null ? null : Math.floor(ms / 36e5) % 24],
    ["minutes", ms === null ? null : Math.floor(ms / 6e4) % 60],
    ["seconds", ms === null ? null : Math.floor(ms / 1e3) % 60],
  ];
  return (
    <div className="flex gap-2">
      {parts.map(([k, v]) => (
        <div key={k} className="min-w-[4.5rem] rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-center">
          <span className="block font-serif text-2xl tabular-nums text-slate-900">{v === null ? "--" : String(v).padStart(k === "days" ? 1 : 2, "0")}</span>
          <span className="text-xs text-slate-500">{t(k as "days")}</span>
        </div>
      ))}
    </div>
  );
}
