"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Small page effects that need the DOM: page fade on route change, the
 * scroll story (.step), count-up numbers ([data-count]), the reading bar
 * (#readbar over #article-body) and 3D tilt on .tilt elements.
 */
export default function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("page")?.classList.remove("page-enter");
    void document.getElementById("page")?.offsetWidth;
    document.getElementById("page")?.classList.add("page-enter");
    window.scrollTo(0, 0);

    const io = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          io?.unobserve(el);
          if (el.classList.contains("step")) el.classList.add("is-on");
          if (el.dataset.count && !reduce) {
            const to = Number(el.dataset.count), t0 = performance.now();
            const tick = (now: number) => {
              const p = Math.min((now - t0) / 1400, 1);
              el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
              if (p < 1) requestAnimationFrame(tick);
            };
            el.textContent = "0";
            requestAnimationFrame(tick);
          }
        }), { threshold: 0.4 })
      : null;
    document.querySelectorAll(".step, [data-count]").forEach((el) => (io ? io.observe(el) : el.classList.add("is-on")));

    const readBar = () => {
      const bar = document.getElementById("readbar"), body = document.getElementById("article-body");
      if (!bar || !body) return;
      const r = body.getBoundingClientRect(), total = r.height - innerHeight * 0.6;
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, -r.top / Math.max(total, 1)))})`;
    };
    readBar();
    window.addEventListener("scroll", readBar, { passive: true });
    return () => { io?.disconnect(); window.removeEventListener("scroll", readBar); };
  }, [pathname]);

  useEffect(() => {
    let current: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = (e.target as Element)?.closest?.(".tilt") as HTMLElement | null;
      if (current && current !== el) { current.style.transform = ""; current.style.boxShadow = ""; }
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) scale(1.03)`;
      el.style.boxShadow = `${-x * 24}px ${24 - y * 10}px 40px -14px rgb(var(--b600) / 0.45)`;
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, []);

  return null;
}
