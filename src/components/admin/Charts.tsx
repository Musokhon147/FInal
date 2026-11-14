/** Small SVG charts for the admin overview. Pure server components, no libraries. */
export function BarChart({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  const W = 520, H = 200, pad = 28, bw = (W - pad) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" role="img" aria-label={rows.map((r) => `${r[0]}: ${r[1]}`).join(", ")}>
      <defs>
        <linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--b600))" /><stop offset="1" stopColor="rgb(var(--b600))" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={pad} x2={W} y1={H - f * (H - 20)} y2={H - f * (H - 20)} stroke="rgb(var(--s200))" strokeDasharray="3 4" />)}
      {rows.map(([label, v], i) => {
        const h = (v / max) * (H - 20), x = pad + i * bw + bw * 0.22, w = bw * 0.56;
        return (
          <g key={label}>
            <rect className="chart-bar" x={x} y={H - h} width={w} height={h} rx={6} fill="url(#gbar)" style={{ animationDelay: `${i * 70}ms` }} />
            <text x={x + w / 2} y={H - h - 7} textAnchor="middle" fontSize="12" fill="rgb(var(--s800))">{v}</text>
            <text x={x + w / 2} y={H + 18} textAnchor="middle" fontSize="11" fill="rgb(var(--s500))">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function HBars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul className="space-y-3">
      {rows.map(([l, v], i) => (
        <li key={l} className="text-sm">
          <div className="mb-1 flex justify-between"><span className="text-slate-700">{l}</span><span className="tabular-nums text-slate-500">{v}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="chart-hbar h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: "linear-gradient(90deg, rgb(var(--acc)), rgb(var(--b600)))", animationDelay: `${i * 80}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const DONUT = ["#38bdf8", "#818cf8", "#fbbf24", "#fb923c", "#34d399", "#f87171", "rgb(var(--b600))", "rgb(var(--s400))"];
export function Donut({ rows }: { rows: [string, number][] }) {
  const total = rows.reduce((a, r) => a + r[1], 0) || 1, C = 2 * Math.PI * 52;
  const lens = rows.map((r) => (r[1] / total) * C);
  const offs = lens.map((_, i) => -lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90" role="img" aria-label={rows.map((r) => `${r[0]}: ${r[1]}`).join(", ")}>
        <circle cx="70" cy="70" r="52" fill="none" stroke="rgb(var(--s200))" strokeWidth="16" />
        {rows.map(([l], i) => (
          <circle key={l} cx="70" cy="70" r="52" fill="none" stroke={DONUT[i % DONUT.length]} strokeWidth="16" strokeDasharray={`${lens[i]} ${C - lens[i]}`} strokeDashoffset={offs[i]} />
        ))}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {rows.map(([l, v], i) => (
          <li key={l} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT[i % DONUT.length] }} aria-hidden="true" />
            <span className="text-slate-700">{l}</span><span className="tabular-nums text-slate-500">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
