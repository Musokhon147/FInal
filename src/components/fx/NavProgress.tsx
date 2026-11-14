"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { ArticleSkeleton, IssueSkeleton } from "@/components/design/Skeleton";

type Kind = "article" | "issue" | null;
const kindOf = (path: string): Kind => {
  const m = path.match(/^\/(?:uz|ru|en)\/(article|issue)\/[^/]+\/?$/);
  return m ? (m[1] as Kind) : null;
};

/**
 * Thin gold line at the top while a page loads, with a small eight-pointed
 * star riding its leading edge. Starts on internal link clicks and form
 * submits; finishes when the URL changes.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search.toString()}`;
  const keyRef = useRef(key);
  const [startedAt, setStartedAt] = useState<string | null>(null); // URL when loading began
  const [kind, setKind] = useState<Kind>(null); // page type being opened, for the instant skeleton
  const [top, setTop] = useState(0); // skeleton starts under the header

  useEffect(() => { keyRef.current = key; }, [key]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / hash link
      setStartedAt(keyRef.current);
      setKind(kindOf(url.pathname));
      setTop(Math.max(0, document.querySelector("header")?.getBoundingClientRect().bottom ?? 0));
    };
    const onSubmit = () => { setStartedAt(keyRef.current); setKind(null); };
    // capture phase: Next.js links cancel the click before it bubbles up
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("submit", onSubmit, true); };
  }, []);

  const loading = startedAt !== null && startedAt === key;
  const done = startedAt !== null && startedAt !== key;

  useEffect(() => {
    if (!startedAt) return;
    // finish shortly after the URL changes; give up quietly if nothing happens
    const t = setTimeout(() => setStartedAt(null), done ? 450 : 12000);
    return () => clearTimeout(t);
  }, [startedAt, done]);

  return (
    <>
    {loading && kind && (
      <div className="instant-skel" style={{ top }} aria-hidden="true">
        <div className="mx-auto w-full max-w-7xl px-5 py-10">{kind === "article" ? <ArticleSkeleton /> : <IssueSkeleton />}</div>
      </div>
    )}
    <div aria-hidden="true" className={`nav-progress ${loading ? "is-loading" : done ? "is-done" : ""}`}>
      <span className="nav-progress-bar">
        <svg className="nav-progress-star" width="14" height="14" viewBox="0 0 40 40" fill="rgb(var(--acc))">
          <path d="M20 2l5.2 7.6 9-1.8-1.8 9L40 20l-7.6 5.2 1.8 9-9-1.8L20 40l-5.2-7.6-9 1.8 1.8-9L0 20l7.6-5.2-1.8-9 9 1.8z" />
        </svg>
      </span>
    </div>
    </>
  );
}
