"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export type GlobePoint = { label: string; lat: number; lon: number; count: number };

/** A dotted globe with glowing points where authors are based. Drag to turn it. */
export default function AuthorsGlobe({ points }: { points: GlobePoint[] }) {
  const t = useTranslations("x");
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let disposed = false, raf = 0;
    let cleanup = () => {};
    import("three").then((THREE) => {
      if (disposed) return;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 7.2);
      const globe = new THREE.Group();
      scene.add(globe);
      const css = getComputedStyle(document.documentElement);
      const col = (v: string) => new THREE.Color(`rgb(${css.getPropertyValue(v).trim().split(/\s+/).join(",")})`);
      const R = 2;

      // dotted sphere (fibonacci points)
      const n = 2600, dots = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
        dots.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", new THREE.BufferAttribute(dots, 3));
      const dm = new THREE.PointsMaterial({ size: 0.028, color: col("--s400"), transparent: true, opacity: 0.7 });
      globe.add(new THREE.Points(dg, dm));

      // latitude rings
      const ringMat = new THREE.LineBasicMaterial({ color: col("--b600"), transparent: true, opacity: 0.18 });
      for (const lat of [-60, -30, 0, 30, 60]) {
        const pts: InstanceType<typeof THREE.Vector3>[] = [], rr = R * Math.cos((lat * Math.PI) / 180), yy = R * Math.sin((lat * Math.PI) / 180);
        for (let k = 0; k <= 96; k++) { const a = (k / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr)); }
        globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
      }

      // author locations: glowing points with a beam
      const toVec = (lat: number, lon: number, r = R) => {
        const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
        return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
      };
      const max = Math.max(1, ...points.map((p) => p.count));
      const gold = col("--acc");
      const glow = new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement("canvas"); c.width = c.height = 64;
          const g = c.getContext("2d")!; const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.3, "rgba(255,255,255,0.6)"); grd.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
          return new THREE.CanvasTexture(c);
        })(),
        color: gold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const beams: InstanceType<typeof THREE.Sprite>[] = [];
      for (const p of points) {
        const s = new THREE.Sprite(glow);
        s.position.copy(toVec(p.lat, p.lon, R * 1.01));
        const k = 0.22 + (p.count / max) * 0.35;
        s.scale.set(k, k, k);
        globe.add(s); beams.push(s);
        const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([toVec(p.lat, p.lon, R), toVec(p.lat, p.lon, R * (1.08 + (p.count / max) * 0.25))]),
          new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.9 }));
        globe.add(beam);
      }
      // start facing Central Asia
      globe.rotation.y = -1.25; globe.rotation.x = 0.35;

      // dragging
      let drag = false, lx = 0, ly = 0, vx = 0.0025, vy = 0;
      const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        vx = (e.clientX - lx) * 0.005; vy = (e.clientY - ly) * 0.005;
        globe.rotation.y += vx; globe.rotation.x = Math.max(-1, Math.min(1, globe.rotation.x + vy));
        lx = e.clientX; ly = e.clientY;
      };
      const up = () => { drag = false; };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);

      const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(canvas);
      const clock = new THREE.Clock();
      const frame = () => {
        const tt = clock.getElapsedTime();
        if (!drag) { vx += (0.0025 - vx) * 0.02; vy *= 0.9; globe.rotation.y += reduce ? 0 : vx; }
        beams.forEach((b, i) => { const k = b.scale.x * (1 + Math.sin(tt * 2 + i) * 0.004); b.scale.set(k, k, k); });
        renderer.render(scene, camera);
        if (!reduce || drag) raf = requestAnimationFrame(frame);
      };
      frame();
      if (reduce) canvas.addEventListener("pointermove", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); });
      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect();
        canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
        renderer.dispose(); dg.dispose(); dm.dispose(); ringMat.dispose(); glow.dispose();
      };
    });
    return () => { disposed = true; cleanup(); };
  }, [points]);

  return (
    <div className="relative">
      <canvas ref={ref} className="h-[380px] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[460px]" role="img"
        aria-label={points.map((p) => `${p.label}: ${p.count}`).join(", ")} />
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-500">{t("dragHint")}</p>
    </div>
  );
}
