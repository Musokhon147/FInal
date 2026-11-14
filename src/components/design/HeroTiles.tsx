/**
 * A field of interlaced eight-pointed tiles that draws itself, line by line,
 * behind the hero — like tilework being laid. Pure SVG + CSS, runs once.
 */
function starPath(cx: number, cy: number, R: number) {
  const pts = Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8 + Math.PI / 8, r = k % 2 === 0 ? R : R * 0.7654;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}
function octPath(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}

export default function HeroTiles() {
  const S = 120, cols = 9, rows = 6, tiles: { d: string; delay: number; gold: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * S + (r % 2 ? S / 2 : 0), cy = r * S * 0.86;
      const delay = (c + r) * 0.12;
      tiles.push({ d: starPath(cx, cy, S * 0.46), delay, gold: (c + r) % 3 === 0 });
      tiles.push({ d: octPath(cx, cy, S * 0.22), delay: delay + 0.3, gold: false });
    }
  }
  return (
    <svg className="hero-tiles pointer-events-none absolute inset-y-0 left-[-6%] -z-10 h-full w-[70%]" viewBox="0 0 1000 520" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
      {tiles.map((t, i) => (
        <path key={i} d={t.d} pathLength={1} fill="none" strokeWidth={t.gold ? 1.1 : 0.8}
          stroke={t.gold ? "rgb(var(--acc))" : "rgb(var(--b600))"} style={{ animationDelay: `${0.4 + t.delay}s` }} />
      ))}
    </svg>
  );
}
