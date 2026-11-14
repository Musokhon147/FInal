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
    if (typeof (document as { startViewTransition?: unknown }).startViewTransition !== "function") {
      // older browsers: simple fade instead of the star wipe
      document.getElementById("page")?.classList.remove("page-enter");
      void document.getElementById("page")?.offsetWidth;
      document.getElementById("page")?.classList.add("page-enter");
    }
    window.scrollTo(0, 0);

    const io = "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          io?.unobserve(el);
          if (el.classList.contains("step")) el.classList.add("is-on");
          if (el.hasAttribute("data-reveal")) el.classList.add("is-in");
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
    document.querySelectorAll(".step, [data-count], [data-reveal]").forEach((el) => (io ? io.observe(el) : el.classList.add("is-on", "is-in")));

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
    let current: HTMLElement | null = null, magnet: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const target = e.target as Element;

      // light that follows the cursor on cards
      const card = target?.closest?.(".card") as HTMLElement | null;
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      // buttons that lean toward the cursor
      const m = target?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (magnet && magnet !== m) magnet.style.transform = "";
      magnet = m;
      if (m) {
        const r = m.getBoundingClientRect();
        m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      }

      // 3D tilt: covers (.tilt, strong) and cards ([data-tilt], gentle)
      const el = target?.closest?.(".tilt, [data-tilt]") as HTMLElement | null;
      if (current && current !== el) { current.style.transform = ""; current.style.boxShadow = ""; }
      current = el;
      if (!el) return;
      const deg = Number(el.dataset.tilt || 18);
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * deg}deg) rotateX(${-y * deg}deg) scale(${deg > 10 ? 1.03 : 1.01})`;
      el.style.boxShadow = `${-x * 24}px ${24 - y * 10}px 40px -16px rgb(var(--b600) / 0.4)`;
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, []);

  return null;
}
