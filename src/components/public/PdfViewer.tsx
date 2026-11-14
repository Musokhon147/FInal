"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

/**
 * Reads the article PDF right on the page (pdf.js draws each page, so it also works on phones,
 * where an embedded PDF usually only offers a download). Pages are drawn as they scroll into view.
 */
export default function PdfViewer({ url, downloadHref }: { url: string; downloadHref: string }) {
  const t = useTranslations("x");
  const box = useRef<HTMLDivElement>(null);
  const doc = useRef<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<{ w: number; h: number }[]>([]);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [full, setFull] = useState(false);

  // load the document
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const d = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
        if (!alive) { d.destroy(); return; }
        doc.current = d;
        const sizes = [];
        for (let i = 1; i <= d.numPages; i++) { const v = (await d.getPage(i)).getViewport({ scale: 1 }); sizes.push({ w: v.width, h: v.height }); }
        if (alive) { setPages(sizes); setState("ready"); }
      } catch { if (alive) setState("error"); }
    })();
    return () => { alive = false; doc.current?.destroy(); doc.current = null; };
  }, [url]);

  // draw pages near the viewport; redraw when the zoom changes
  useEffect(() => {
    const root = box.current;
    if (!root || !pages.length) return;
    const tasks = new Map<number, RenderTask>();
    const drawn = new Set<number>();
    const draw = async (el: HTMLElement) => {
      const n = Number(el.dataset.page);
      if (drawn.has(n) || !doc.current) return;
      drawn.add(n);
      const page = await doc.current.getPage(n);
      const cssW = el.clientWidth, base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (cssW / base.width) * Math.min(devicePixelRatio || 1, 2) });
      const canvas = el.querySelector("canvas")!;
      canvas.width = vp.width; canvas.height = vp.height;
      const task = page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp });
      tasks.set(n, task);
      task.promise.then(() => el.classList.add("is-drawn")).catch(() => {});
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && draw(e.target as HTMLElement)), { root, rootMargin: "600px 0px" });
    const track = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setCurrent(Number((e.target as HTMLElement).dataset.page))), { root, rootMargin: "-45% 0px -45% 0px" }); // the page crossing the middle of the viewer
    root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => { el.classList.remove("is-drawn"); io.observe(el); track.observe(el); });
    return () => { io.disconnect(); track.disconnect(); tasks.forEach((tk) => tk.cancel()); };
  }, [pages, zoom, full]);

  // fullscreen state follows the browser
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current?.parentElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const go = (n: number) => {
    const root = box.current, el = root?.querySelector<HTMLElement>(`[data-page="${Math.min(Math.max(n, 1), pages.length)}"]`);
    if (root && el) root.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" });
  };
  const toggleFull = () => {
    const el = box.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();
  };

  return (
    <div className="pdf-viewer mt-4 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm">
        <button className="pdf-btn" onClick={() => go(current - 1)} disabled={current <= 1} aria-label={t("pdfPrev")}>‹</button>
        <span className="min-w-[4.5rem] text-center tabular-nums text-slate-600">{pages.length ? `${current} / ${pages.length}` : "…"}</span>
        <button className="pdf-btn" onClick={() => go(current + 1)} disabled={current >= pages.length} aria-label={t("pdfNext")}>›</button>
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <button className="pdf-btn" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label={t("pdfZoomOut")}>−</button>
        <span className="w-12 text-center tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
        <button className="pdf-btn" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1)))} aria-label={t("pdfZoomIn")}>+</button>
        <div className="ml-auto flex items-center gap-2">
          <button className="pdf-btn px-3" onClick={toggleFull}>{full ? t("pdfExitFull") : t("pdfFull")}</button>
          <a className="btn-primary px-3 py-1.5 text-sm" href={downloadHref}>{t("pdfDownload")}</a>
        </div>
      </div>
      <div ref={box} className={`relative overflow-auto bg-slate-200/60 p-3 sm:p-6 ${full ? "h-[calc(100vh-3rem)]" : "h-[75vh] max-h-[900px]"}`} tabIndex={0} aria-label={t("pdfPreview")}>
        {state === "loading" && <div className="skel mx-auto aspect-[1/1.414] w-full max-w-[720px] rounded" />}
        {state === "error" && (
          <p className="p-8 text-center text-slate-600">{t("pdfError")} <a className="font-semibold text-brand-700 hover:underline" href={downloadHref}>{t("pdfDownload")}</a></p>
        )}
        {pages.map((p, i) => (
          <div key={`${i}-${zoom}-${full}`} data-page={i + 1} className="pdf-page relative mx-auto mb-4 bg-white shadow-lg"
            style={{ width: `${Math.min(100, 100 * zoom)}%`, maxWidth: `${Math.round(820 * zoom)}px`, minWidth: zoom > 1 ? `${Math.round(100 * zoom)}%` : undefined, aspectRatio: `${p.w} / ${p.h}` }}>
            <canvas className="absolute inset-0 h-full w-full" />
            <span className="pdf-page-skel skel absolute inset-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
