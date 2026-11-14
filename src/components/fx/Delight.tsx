"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const CYR = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯабвгдежзиклмнопрстуфхцчшэюя";

function scramble(el: HTMLElement) {
  const final = el.textContent ?? "";
  if (!final.trim() || el.children.length) return;
  const pool = /[а-яё]/i.test(final) ? CYR : LATIN;
  el.setAttribute("aria-label", final);
  const t0 = performance.now(), dur = 700 + final.length * 12;
  const tick = (now: number) => {
    const p = Math.min((now - t0) / dur, 1);
    const fixed = Math.floor(final.length * p);
    el.textContent = final.slice(0, fixed) + [...final.slice(fixed)].map((c) => (c === " " ? " " : pool[(Math.random() * pool.length) | 0])).join("");
    if (p < 1) requestAnimationFrame(tick);
    else { el.textContent = final; el.removeAttribute("aria-label"); }
  };
  requestAnimationFrame(tick);
}

function confetti() {
  const c = document.createElement("canvas");
  c.className = "confetti"; c.setAttribute("aria-hidden", "true");
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const g = c.getContext("2d")!; g.scale(devicePixelRatio, devicePixelRatio);
  const css = getComputedStyle(document.documentElement);
  const rgb = (v: string) => `rgb(${css.getPropertyValue(v).trim().split(/\s+/).join(",")})`;
  const colors = [rgb("--acc"), rgb("--b600"), rgb("--b400"), "#ffffff"];
  const parts = Array.from({ length: 140 }, (_, i) => {
    const left = i % 2 === 0, a = (left ? -55 : -125) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7, v = 9 + Math.random() * 9;
    return { x: left ? 0 : innerWidth, y: innerHeight * 0.75, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length] };
  });
  const star = (x: number, y: number, r: number, rot: number) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
    for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.38 : r, an = (k * Math.PI) / 4; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    g.closePath(); g.fill(); g.restore();
  };
  const t0 = performance.now();
  const frame = (now: number) => {
    const life = (now - t0) / 3200;
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalAlpha = Math.max(0, 1 - Math.max(0, life - 0.6) / 0.4);
    for (const p of parts) { p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; g.fillStyle = p.c; star(p.x, p.y, p.r, p.rot); }
    if (life < 1) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

/** Cursor ring, heading scramble, card ripples and celebration confetti. */
export default function Delight() {
  const pathname = usePathname();
  const ring = useRef<HTMLDivElement>(null);

  // per page: scramble headings once when they come into view, confetti if a submit/publish just happened
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let fire = false;
    try { fire = sessionStorage.getItem("celebrate") === "1"; sessionStorage.removeItem("celebrate"); } catch {}
    const timer = fire && !reduce ? window.setTimeout(confetti, 450) : 0;
    if (reduce || !("IntersectionObserver" in window)) return () => clearTimeout(timer);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target); scramble(e.target as HTMLElement);
    }), { threshold: 0.6 });
    document.querySelectorAll("[data-scramble]").forEach((el) => io.observe(el));
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [pathname]);

  // global: ring that trails the cursor (mouse only) and ripples on card clicks
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ring.current;
    const fine = matchMedia("(pointer: fine)").matches;
    let raf = 0, tx = -100, ty = -100, x = -100, y = -100, shown = false;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      if (!shown && el) { shown = true; x = tx; y = ty; el.classList.add("on"); }
      const hot = (e.target as Element)?.closest?.("a, button, [role=button], input, textarea, select, label, canvas");
      el?.classList.toggle("hot", !!hot && !(hot as HTMLElement).matches("input, textarea, select"));
      el?.classList.toggle("text", !!(e.target as Element)?.closest?.("input, textarea, [contenteditable=true]"));
    };
    const leave = () => { shown = false; el?.classList.remove("on"); };
    const loop = () => {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      if (el) el.style.transform = `translate(${x}px, ${y}px)`;
      raf = requestAnimationFrame(loop);
    };
    const ripple = (e: PointerEvent) => {
      const card = (e.target as Element)?.closest?.(".card, .btn-primary, .btn-secondary") as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
      const clip = document.createElement("span");
      clip.className = "ripple-clip"; clip.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      if (getComputedStyle(card).position === "static") card.style.position = "relative";
      clip.appendChild(dot); card.appendChild(clip);
      dot.addEventListener("animationend", () => clip.remove());
    };
    if (fine && !reduce) {
      document.addEventListener("pointermove", move);
      document.documentElement.addEventListener("pointerleave", leave);
      raf = requestAnimationFrame(loop);
    }
    if (!reduce) document.addEventListener("pointerdown", ripple);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointerdown", ripple);
    };
  }, []);

  return <div ref={ring} className="cursor-ring" aria-hidden="true" />;
}
