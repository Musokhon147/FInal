import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), "assets/og");
const load = (f: string) => readFile(join(dir, f));

/** Manrope + Unbounded (Latin, Latin-ext, Cyrillic) so uz/ru/en titles all render. */
export async function ogFonts() {
  const [m1, m2, m3, u1, u2, u3] = await Promise.all([
    load("manrope-latin-600-normal.woff"), load("manrope-latin-ext-600-normal.woff"), load("manrope-cyrillic-600-normal.woff"),
    load("unbounded-latin-400-normal.woff"), load("unbounded-latin-ext-400-normal.woff"), load("unbounded-cyrillic-400-normal.woff"),
  ]);
  const f = (name: string, data: Buffer, weight: 400 | 600) => ({ name, data, weight, style: "normal" as const });
  return [
    f("Manrope", m1, 600), f("ManropeExt", m2, 600), f("ManropeCyr", m3, 600),
    f("Unbounded", u1, 400), f("UnboundedExt", u2, 400), f("UnboundedCyr", u3, 400),
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };

/** The shared card layout: lapis night, gold star, title. */
export function OgCard({ kicker, title, footer }: { kicker: string; title: string; footer: string }) {
  const size = title.length > 90 ? 44 : title.length > 50 ? 54 : 68;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #050b22 0%, #0a1d5c 100%)", color: "#f6f2e7", fontFamily: "Manrope, ManropeExt, ManropeCyr", position: "relative" }}>
      <svg width="520" height="520" viewBox="0 0 40 40" style={{ position: "absolute", right: -90, top: 55, opacity: 0.9 }}>
        <rect x="9" y="9" width="22" height="22" fill="none" stroke="#e8b13a" strokeWidth="0.5" />
        <rect x="9" y="9" width="22" height="22" fill="none" stroke="#e8b13a" strokeWidth="0.5" transform="rotate(45 20 20)" />
        <circle cx="20" cy="20" r="6" fill="none" stroke="#3cc8bb" strokeWidth="0.4" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="#3cc8bb" strokeWidth="0.15" strokeDasharray="0.4 0.8" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 860 }}>
        <div style={{ display: "flex", fontSize: 26, color: "#e8b13a" }}>{kicker}</div>
        <div style={{ display: "flex", fontFamily: "Unbounded, UnboundedExt, UnboundedCyr", fontSize: size, lineHeight: 1.15, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#b2bdd8" }}>{footer}</div>
      </div>
    </div>
  );
}
