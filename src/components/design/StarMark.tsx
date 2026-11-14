/** Eight-pointed Samarkand star (two squares) — the default logo mark. */
export function StarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="rgb(var(--acc))" strokeWidth="1.6">
      <rect x="9" y="9" width="22" height="22" />
      <rect x="9" y="9" width="22" height="22" transform="rotate(45 20 20)" />
      <circle cx="20" cy="20" r="4.2" stroke="rgb(var(--b600))" />
    </svg>
  );
}

export function Logo({ url, size = 30 }: { url?: string | null; size?: number }) {
  if (!url) return <StarMark size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={size} height={size} className="rounded object-contain" style={{ width: size, height: size }} />;
}
