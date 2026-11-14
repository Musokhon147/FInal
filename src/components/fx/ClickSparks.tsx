"use client";

import { fxOff } from "@/lib/fx";
import { useEffect } from "react";

const STAR = "M20 2l5.2 7.6 9-1.8-1.8 9L40 20l-7.6 5.2 1.8 9-9-1.8L20 40l-5.2-7.6-9 1.8 1.8-9L0 20l7.6-5.2-1.8-9 9 1.8z";

/**
 * Pressing a main button (.btn-gold, .btn-primary or [data-spark]) throws a
 * small burst of eight-pointed sparks and nudges the 3D star.
 */
export default function ClickSparks() {
  useEffect(() => {
    if (fxOff()) return;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden";
    document.body.appendChild(layer);

    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element)?.closest?.(".btn-gold, .btn-primary, [data-spark]");
      if (!el || (el as HTMLButtonElement).disabled) return;
      window.dispatchEvent(new CustomEvent("scene:burst"));
      const colors = ["rgb(var(--acc))", "rgb(var(--b600))", "rgb(var(--s900))"];
      for (let i = 0; i < 12; i++) {
        const s = 6 + Math.random() * 8;
        const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        node.setAttribute("viewBox", "0 0 40 40");
        node.setAttribute("width", String(s));
        node.setAttribute("height", String(s));
        node.innerHTML = `<path d="${STAR}" fill="${colors[i % 3]}"/>`;
        node.style.cssText = `position:absolute;left:${e.clientX - s / 2}px;top:${e.clientY - s / 2}px;filter:drop-shadow(0 0 4px ${colors[i % 3]})`;
        layer.appendChild(node);
        const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4, d = 36 + Math.random() * 46;
        node.animate(
          [
            { transform: "translate(0,0) scale(0.4) rotate(0deg)", opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(1) rotate(${120 + Math.random() * 120}deg)`, opacity: 0 },
          ],
          { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.2,.7,.2,1)" },
        ).onfinish = () => node.remove();
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("pointerdown", onDown); layer.remove(); };
  }, []);
  return null;
}
