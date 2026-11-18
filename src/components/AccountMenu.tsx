"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** Signed-in menu in the header: my account, admin panel (staff) and log out, behind one button to keep the header compact. */
export default function AccountMenu({ name, labels, staff, logout }: {
  name: string; staff: boolean; logout: () => Promise<void>;
  labels: { account: string; dashboard: string; admin: string; logout: string };
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); box.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={labels.account} title={name}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-900 transition hover:border-brand-600">
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 pt-2">
          <div className="min-w-56 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xl">
            <p className="truncate px-3 pb-2 pt-1.5 text-xs text-slate-500">{name}</p>
            <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">{labels.dashboard}</Link>
            {staff && <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">{labels.admin}</Link>}
            <form action={logout}>
              <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">{labels.logout}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
