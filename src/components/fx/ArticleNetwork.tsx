"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type NetNode = { id: string; title: string; authors: string; keywords: string[] };
export type NetEdge = [number, number, string[]];

/** 3D map of articles: points joined when they share keywords. Hover for the title, click to open. */
export default function ArticleNetwork({ nodes, edges }: { nodes: NetNode[]; edges: NetEdge[] }) {
  const t = useTranslations("x");
  const router = useRouter();
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !nodes.length) return;
    let disposed = false, raf = 0, cleanup = () => {};
    Promise.all([import("three"), import("three/examples/jsm/controls/OrbitControls.js")]).then(([THREE, { OrbitControls }]) => {
      if (disposed) return;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      camera.position.set(0, 0, 18);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.6;
      controls.minDistance = 6; controls.maxDistance = 40; controls.enablePan = false;

      // force layout in 3D: springs along edges, repulsion between all points
      const P = nodes.map(() => new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
      for (let it = 0; it < 300; it++) {
        const F = P.map(() => new THREE.Vector3());
        for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
          const d = P[a].clone().sub(P[b]); const l = Math.max(d.length(), 0.3);
          const f = d.multiplyScalar(6 / (l * l * l)); F[a].add(f); F[b].sub(f);
        }
        for (const [a, b, kw] of edges) {
          const d = P[b].clone().sub(P[a]); const l = d.length();
          const f = d.multiplyScalar(((l - 3.2) * 0.05 * Math.min(kw.length, 3)) / Math.max(l, 0.01)); F[a].add(f); F[b].sub(f);
        }
        P.forEach((p, i) => p.add(F[i].clampLength(0, 0.5)).multiplyScalar(0.995));
      }

      const css = getComputedStyle(document.documentElement);
      const col = (v: string) => new THREE.Color(`rgb(${css.getPropertyValue(v).trim().split(/\s+/).join(",")})`);
      const tex = (() => {
        const c = document.createElement("canvas"); c.width = c.height = 64;
        const g = c.getContext("2d")!; const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.85)"); grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
      })();
      const light = document.documentElement.classList.contains("light");
      const blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      const degree = nodes.map((_, i) => edges.filter(([a, b]) => a === i || b === i).length);
      const sprites = P.map((p, i) => {
        const m = new THREE.SpriteMaterial({ map: tex, color: degree[i] > 2 ? col("--acc") : col("--b600"), transparent: true, depthWrite: false, blending });
        const s = new THREE.Sprite(m); s.position.copy(p);
        const k = 0.7 + Math.min(degree[i], 6) * 0.12; s.scale.set(k, k, k); s.userData.base = k; s.userData.i = i;
        scene.add(s); return s;
      });
      const lp = new Float32Array(edges.length * 6);
      edges.forEach(([a, b], k) => { lp.set([P[a].x, P[a].y, P[a].z, P[b].x, P[b].y, P[b].z], k * 6); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
      const lm = new THREE.LineBasicMaterial({ color: col("--b600"), transparent: true, opacity: light ? 0.35 : 0.22, blending });
      scene.add(new THREE.LineSegments(lg, lm));

      // hover + click
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      let hovered = -1, downAt = 0;
      const pick = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(sprites)[0];
        const i = hit ? (hit.object.userData.i as number) : -1;
        if (i !== hovered) {
          if (hovered >= 0) { const b = sprites[hovered].userData.base; sprites[hovered].scale.set(b, b, b); }
          hovered = i;
          if (i >= 0) { const b = sprites[i].userData.base * 1.6; sprites[i].scale.set(b, b, b); }
          canvas.style.cursor = i >= 0 ? "pointer" : "grab";
        }
        setHover(i >= 0 ? { i, x: e.clientX - r.left, y: e.clientY - r.top } : null);
      };
      const down = () => { downAt = performance.now(); };
      const up = () => { if (hovered >= 0 && performance.now() - downAt < 250) router.push(`/article/${nodes[hovered].id}`); };
      canvas.addEventListener("pointermove", pick);
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointerleave", () => setHover(null));

      const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(canvas);
      const frame = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(frame); };
      frame();
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
        canvas.removeEventListener("pointermove", pick); canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up);
        sprites.forEach((s) => s.material.dispose()); tex.dispose(); lg.dispose(); lm.dispose(); renderer.dispose();
      };
    });
    return () => { disposed = true; cleanup(); };
  }, [nodes, edges, router]);

  const h = hover ? nodes[hover.i] : null;
  const shared = hover ? [...new Set(edges.filter(([a, b]) => a === hover.i || b === hover.i).flatMap((e) => e[2]))].slice(0, 5) : [];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/40">
      <canvas ref={ref} className="h-[70vh] min-h-[440px] w-full cursor-grab touch-none" role="img" aria-label={t("explore")} />
      {h && hover && (
        <div className="pointer-events-none absolute z-10 max-w-xs rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm shadow-2xl"
          style={{ left: Math.min(hover.x + 16, 9999), top: hover.y + 16 }}>
          <p className="font-semibold leading-snug text-slate-900">{h.title}</p>
          <p className="mt-1 text-xs text-slate-500">{h.authors}</p>
          {shared.length > 0 && <p className="mt-2 text-xs text-brand-700">{t("sharedKeywords")}: {shared.join(", ")}</p>}
        </div>
      )}
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-500">{t("dragHint")}</p>
    </div>
  );
}
