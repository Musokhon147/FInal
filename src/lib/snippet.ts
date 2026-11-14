export type Snippet = { before: string; hit: string; after: string; where: "text" | "abstract" };

/** Finds the first search word in `text` and returns a short passage around it. */
export function findSnippet(text: string, query: string, where: Snippet["where"] = "text", radius = 90): Snippet | null {
  if (!text) return null;
  const words = query.toLowerCase().replace(/["'()]/g, " ").split(/\s+/).filter((w) => w.length > 1 && w !== "or" && !w.startsWith("-"));
  const low = text.toLowerCase();
  let at = -1, word = "";
  for (const w of words) { const i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) { at = i; word = w; } }
  if (at < 0) return null;
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - radius)) + 1);
  const endSpace = text.indexOf(" ", at + word.length + radius);
  const end = endSpace < 0 ? text.length : endSpace;
  const clean = (s: string) => s.replace(/\s+/g, " ");
  return { before: clean(text.slice(start, at)), hit: text.slice(at, at + word.length), after: clean(text.slice(at + word.length, end)), where };
}
