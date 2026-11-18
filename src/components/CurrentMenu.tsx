"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** "Current issue" in the header: opens a small menu with the journal issue and the conference collections. */
export default function CurrentMenu({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hoverAt = useRef(0); // a click right after hover-open should not close the menu again
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false); } // close after navigating

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); box.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={box} className="relative" onMouseLeave={() => setOpen(false)}>
      <button type="button" className="navlink flex items-center gap-1" aria-expanded={open} aria-haspopup="true"
        onClick={() => setOpen((o) => (performance.now() - hoverAt.current < 400 ? true : !o))}
        onMouseEnter={() => { if (matchMedia("(hover: hover)").matches && !open) { hoverAt.current = performance.now(); setOpen(true); } }}>
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className={`transition ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <ul className="min-w-56 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xl">
            {items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">{it.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
