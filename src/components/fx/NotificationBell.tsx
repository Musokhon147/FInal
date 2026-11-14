"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/app/[locale]/notification-actions";

export type BellItem = { id: string; text: string; date: string; link: string; read: boolean };

export default function NotificationBell({ items }: { items: BellItem[] }) {
  const t = useTranslations("x");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="navlink relative rounded-full p-1.5" aria-expanded={open}
        aria-label={`${t("notifications")}${unread ? ` (${unread})` : ""}`}>
        <svg className={unread > 0 ? "bell-ring" : undefined} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden whitespace-normal rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{t("notifications")}</p>
            {unread > 0 && <button onClick={() => start(() => markAllNotificationsRead())} className="text-xs text-brand-700 hover:underline">{t("markAll")}</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length ? items.map((n) => (
              <li key={n.id}>
                <button className="flex w-full gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-200/60"
                  onClick={() => { setOpen(false); start(async () => { await markNotificationRead(n.id); router.push(n.link); }); }}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} aria-hidden="true" />
                  <span><span className={n.read ? "text-slate-500" : "text-slate-900"}>{n.text}</span><span className="mt-0.5 block text-xs text-slate-500">{n.date}</span></span>
                </button>
              </li>
            )) : <li className="px-4 py-6 text-center text-sm text-slate-500">{t("noNotif")}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
