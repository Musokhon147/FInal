"use client";

import { useState } from "react";

/** A read-only address with a Copy button. */
export default function CopyField({ value, copy, copied }: { value: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">{value}</code>
      <button type="button" className="btn-secondary px-3 py-2 text-sm" aria-live="polite"
        onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* ignore */ } }}>
        {done ? copied : copy}
      </button>
    </div>
  );
}
