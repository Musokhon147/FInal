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
    let alive = true, loading = false, idle = 0;
    const root = document.documentElement;
    const onBurst = () => api.current?.burst();
    const start = () => {
      if (!alive || loading || api.current || root.classList.contains("fx-off")) return;
      loading = true;
      import("@/lib/scene").then(({ createScene }) => {
        loading = false;
        if (!alive || !ref.current || root.classList.contains("fx-off")) return;
        const s = createScene(ref.current);
        api.current = s;
        s.setMode((document.querySelector("[data-scene]")?.getAttribute("data-scene") as SceneMode | null) || modeRef.current);
        s.setTheme(root.classList.contains("light"));
        ref.current.classList.add("is-ready");
      });
    };
    const stop = () => { api.current?.dispose(); api.current = null; ref.current?.classList.remove("is-ready"); };
    // the page comes first: build the 3D scene once the browser is idle after load
    const later = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      idle = ric ? ric(start, { timeout: 2500 }) : window.setTimeout(start, 1200);
    };
    if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
    // follow theme changes and the effects switch
    const observer = new MutationObserver(() => {
      if (root.classList.contains("fx-off")) stop(); else if (!api.current) start();
      api.current?.setTheme(root.classList.contains("light"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("scene:burst", onBurst);
    return () => {
      alive = false;
      clearTimeout(idle);
      (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
      window.removeEventListener("load", later);
      observer.disconnect();
      window.removeEventListener("scene:burst", onBurst);
      stop();
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

  return <canvas ref={ref} aria-hidden="true" className="scene-canvas pointer-events-none fixed inset-0 z-0 h-full w-full print:hidden" />;
}
