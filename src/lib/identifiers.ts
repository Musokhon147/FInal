/** DOI and ISSN helpers, shared by forms, pages and the Crossref deposit. */

const DOI_RE = /^10\.\d{4,9}\/\S+$/;

/** "https://doi.org/10.1/x", "doi:10.1/x", " 10.1/x " → "10.1/x". Returns "" for an empty value. */
export function normalizeDoi(v: string | null | undefined): string {
  return String(v ?? "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim();
}

/** A real DOI ("10.12345/anything"), not a page number or placeholder typed in the DOI box. */
export function isDoi(v: string | null | undefined): v is string {
  return !!v && DOI_RE.test(v);
}

/** HTML pattern for DOI inputs (same rule as isDoi, also accepting a pasted doi.org link). */
export const DOI_PATTERN = "(https?://(dx\\.)?doi\\.org/)?10\\.\\d{4,9}/\\S+";

export const isDoiPrefix = (v: string | null | undefined): v is string => !!v && /^10\.\d{4,9}$/.test(v);

/** The DOI this site gives an article: prefix / year . first 8 characters of its id (short, opaque, stable). */
export function doiFor(prefix: string, articleId: string, year: number, extra = 0) {
  const id = articleId.replace(/-/g, "").toLowerCase();
  return `${prefix}/${year}.${id.slice(0, 8 + extra)}`;
}

/** "12345679" or "1234-5679" → "1234-5679"; "" when empty. */
export function normalizeIssn(v: string | null | undefined): string {
  const s = String(v ?? "").trim().toUpperCase().replace(/[^0-9X]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : String(v ?? "").trim();
}

/** A valid ISSN: 8 characters with the right check digit, and not the "0000-0000" placeholder. */
export function isIssn(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{3}[\dX]$/.test(v) || v === "0000-0000") return false;
  const d = v.replace("-", "");
  const sum = [...d.slice(0, 7)].reduce((s, c, i) => s + Number(c) * (8 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return d[7] === (check === 10 ? "X" : String(check));
}
