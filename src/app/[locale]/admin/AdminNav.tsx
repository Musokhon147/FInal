"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; label: string; badge?: number };
type Group = { title: string; items: Item[]; folded?: boolean };

/** Admin menu in four groups; "Tools" stays folded unless you are on one of its pages. */
export default function AdminNav({ groups }: { groups: Group[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  const list = (items: Item[]) => (
    <ul className="space-y-0.5">
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} aria-current={active(it.href) ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${active(it.href) ? "bg-brand-600 font-semibold text-ink" : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"}`}>
            <span>{it.label}</span>
            {!!it.badge && <span className={`rounded-full px-2 text-xs font-bold ${active(it.href) ? "bg-ink/20" : "bg-accent text-ink"}`}>{it.badge}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <nav className="card sticky top-4 space-y-4 p-3" aria-label="Admin">
      {groups.map((g) => g.folded ? (
        <details key={g.title} className="group" open={g.items.some((i) => active(i.href))}>
          <summary className="cursor-pointer list-none px-3 text-[11px] font-semibold text-slate-500 hover:text-slate-900">
            <span className="inline-block transition group-open:rotate-90">›</span> {g.title}
          </summary>
          <div className="mt-1">{list(g.items)}</div>
        </details>
      ) : (
        <div key={g.title}>
          <p className="px-3 pb-1 text-[11px] font-semibold text-slate-500">{g.title}</p>
          {list(g.items)}
        </div>
      ))}
    </nav>
  );
}
