"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import type { SceneApi, SceneMode } from "@/lib/scene";

function modeFor(path: string): SceneMode {
  if (path === "/" || path === "") return "star";
  if (/^\/(article|p|news)\//.test(path)) return "book";
  if (path === "/archives" || path.startsWith("/issue/")) return "stack";
  if (path === "/board" || path.startsWith("/conferences")) return "globe";
  return "field";
}

/** Full-screen WebGL canvas behind every page; the shape follows the route. */
export default function SceneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<SceneApi | null>(null);
  const pathname = usePathname();
  const modeRef = useRef(modeFor(pathname));

  useEffect(() => {
    let alive = true;
    let observer: MutationObserver | undefined;
    const onBurst = () => api.current?.burst();
    import("@/lib/scene").then(({ createScene }) => {
      if (!alive || !ref.current) return;
      const s = createScene(ref.current);
      api.current = s;
      s.setMode((document.querySelector("[data-scene]")?.getAttribute("data-scene") as SceneMode | null) || modeRef.current);
      const sync = () => s.setTheme(document.documentElement.classList.contains("light"));
      sync();
      window.addEventListener("scene:burst", onBurst);
      observer = new MutationObserver(sync);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    });
    return () => {
      alive = false;
      observer?.disconnect();
      window.removeEventListener("scene:burst", onBurst);
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    // a page can ask for its own shape, e.g. <span data-scene="glyph:K" hidden />
    const pick = () => {
      const custom = document.querySelector("[data-scene]")?.getAttribute("data-scene") as SceneMode | null;
      modeRef.current = custom || modeFor(pathname);
      api.current?.setMode(modeRef.current);
    };
    pick();
    // sections can borrow a shape while they are on screen: <section data-scene-zone="split4">
    let io: IntersectionObserver | undefined;
    const zones = () => {
      if (!("IntersectionObserver" in window)) return;
      io = new IntersectionObserver((es) => es.forEach((e) => {
        const z = (e.target as HTMLElement).dataset.sceneZone as SceneMode;
        api.current?.setMode(e.isIntersecting ? z : modeRef.current);
      }), { rootMargin: "-30% 0px -30% 0px" });
      document.querySelectorAll("[data-scene-zone]").forEach((el) => io!.observe(el));
    };
    const id = requestAnimationFrame(() => { pick(); zones(); }); // after the new page has rendered
    return () => { cancelAnimationFrame(id); io?.disconnect(); };
  }, [pathname]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full print:hidden" />;
}
