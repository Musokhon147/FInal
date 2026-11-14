import { ViewTransition } from "react";

/** Generated tile-pattern cover for an issue, so the archive reads like a shelf. */
export default function IssueCover({
  id, number, isSpecial, volumeLabel, topic, size = "md",
}: { id: string; number: number; isSpecial: boolean; volumeLabel: string; topic?: string; size?: "md" | "lg" }) {
  const hues: [string, string][] = [["#0a1d5c", "#3cc8bb"], ["#123a63", "#e8b13a"], ["#0b2c4f", "#79dfd5"], ["#1b1f5e", "#e8b13a"]];
  const seed = number + volumeLabel.length;
  const [bg, fg] = isSpecial ? ["#2a1846", "#e8b13a"] : hues[seed % hues.length];
  const pid = "p" + id.replace(/[^a-z0-9]/gi, "");
  const big = size === "lg";
  return (
    <ViewTransition name={`cover-${pid}`} share="morph" default="none">
    <div className="book">
    <div className="book-3d">
    {/* spine and page edges make the cover a real 3D book */}
    <span className="book-spine" style={{ background: `linear-gradient(90deg, ${bg}, color-mix(in srgb, ${bg} 70%, #000))` }} aria-hidden="true" />
    <span className="book-pages" aria-hidden="true" />
    <div className="book-front relative aspect-[3/4] w-full overflow-hidden rounded-r-xl rounded-l-sm ring-1 ring-white/10" style={{ background: bg }}>
      {topic && <p className="absolute left-4 right-4 top-4 z-10 text-xs leading-snug text-[#cdd5e8]">{topic}</p>}
      <svg className="absolute inset-0 h-full w-full opacity-60" aria-hidden="true">
        <defs>
          <pattern id={pid} width="44" height="44" patternUnits="userSpaceOnUse">
            <g fill="none" stroke={fg} strokeWidth="0.9" opacity="0.55">
              <rect x="12" y="12" width="20" height="20" />
              <rect x="12" y="12" width="20" height="20" transform="rotate(45 22 22)" />
              <path d="M0 22h6M38 22h6M22 0v6M22 38v6" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#050b22] via-[#050b22]/40 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 ${big ? "p-6" : "p-4"}`}>
        <p className={`font-serif font-light leading-none ${big ? "text-5xl" : "text-3xl"}`} style={{ color: fg }}>{isSpecial ? `S${number}` : number}</p>
        <p className="mt-2 text-xs text-[#cdd5e8]">{volumeLabel}</p>
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" aria-hidden="true" />
    </div>
    </div>
    </div>
    </ViewTransition>
  );
}
