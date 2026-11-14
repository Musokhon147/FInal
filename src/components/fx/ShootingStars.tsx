"use client";

import { useEffect } from "react";

/** Now and then a gold streak crosses the night sky (dark theme only). */
export default function ShootingStars() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      if (!document.hidden && !document.documentElement.classList.contains("light")) {
        const el = document.createElement("span");
        el.setAttribute("aria-hidden", "true");
        el.className = "shooting-star";
        const x = innerWidth * (0.35 + Math.random() * 0.6), y = innerHeight * Math.random() * 0.4;
        el.style.left = `${x}px`; el.style.top = `${y}px`;
        document.body.appendChild(el);
        const dist = 380 + Math.random() * 320;
        el.animate(
          [
            { transform: "rotate(-32deg) translateX(0) scaleX(0.2)", opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { transform: `rotate(-32deg) translateX(-${dist}px) scaleX(1)`, opacity: 0 },
          ],
          { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.3,.6,.4,1)" },
        ).onfinish = () => el.remove();
      }
      timer = setTimeout(spawn, 7000 + Math.random() * 9000);
    };
    timer = setTimeout(spawn, 4000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
