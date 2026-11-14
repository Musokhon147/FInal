export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Storage keys must be URL-safe; keep the extension, drop everything odd. */
export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^\w\-]+/g, "_").slice(0, 80);
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^\w.]/g, "") : "";
  return `${Date.now()}-${base || "file"}${ext}`;
}
