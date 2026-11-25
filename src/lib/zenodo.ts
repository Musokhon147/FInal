import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { articleUrl } from "@/lib/site";
import { splitName, DEPOSIT_SELECT, JOURNAL_SELECT, type DepositArticle, type DepositJournal } from "@/lib/crossref";
import { isDoi, isIssn } from "@/lib/identifiers";
import type { I18nText } from "@/lib/i18n-field";

/**
 * Free DOIs from Zenodo (CERN's research repository) — no organisation membership needed.
 * Each published article with a PDF becomes a Zenodo record; Zenodo gives it a DOI on its
 * own prefix (10.5281/zenodo.N) and the site saves it on the article.
 * Token lives only in Vercel: ZENODO_TOKEN (Secret, scopes deposit:write + deposit:actions).
 * ZENODO_SANDBOX=1 → sandbox.zenodo.org for trying it out (test DOIs, 10.5072).
 * Optional ZENODO_COMMUNITY = a Zenodo community id the records are offered to.
 * API: https://developers.zenodo.org/ (deposit API)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

export const zenodoSandbox = () => ["1", "true", "yes"].includes(String(process.env.ZENODO_SANDBOX ?? "").toLowerCase());
export const zenodoConfigured = () => !!process.env.ZENODO_TOKEN;
const base = () => (zenodoSandbox() ? "https://sandbox.zenodo.org" : "https://zenodo.org");

type ZArticle = DepositArticle & { keywords: string[]; pdf_path: string | null; zenodo_id: number | null; doi_status: string };
const LANG3: Record<string, string> = { uz: "uzb", ru: "rus", en: "eng" };
const pick = (t: I18nText | null | undefined) => (t as Record<string, string> | null)?.en || (t as Record<string, string> | null)?.uz || (t as Record<string, string> | null)?.ru || "";
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const day = (iso: string | null | undefined) => (iso ? new Date(iso) : new Date()).toISOString().slice(0, 10);

/** The Zenodo record for an article, in the deposit API's metadata shape. */
export function zenodoMetadata(j: DepositJournal, a: ZArticle) {
  const iss = a.issues, conf = iss?.conferences;
  const pages = a.first_page ? `${a.first_page}${a.last_page ? `-${a.last_page}` : ""}` : undefined;
  const md: Record<string, unknown> = {
    upload_type: "publication",
    publication_type: conf ? "conferencepaper" : "article",
    title: a.title,
    creators: (a.authors?.length ? a.authors : [{ name: j.publisher || pick(j.title) }]).map((au) => {
      const { given, surname } = splitName(au.name, a.language);
      const orcid = String(au.orcid ?? "").replace(/^https?:\/\/orcid\.org\//, "");
      return {
        name: given ? `${surname}, ${given}` : surname,
        ...(au.affiliation ? { affiliation: au.affiliation } : {}),
        ...(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid) ? { orcid } : {}),
      };
    }),
    // Zenodo requires a description; the abstract is what readers and indexes need
    description: plain(a.abstract ?? "") || a.title,
    publication_date: day(a.published_at ?? iss?.published_at),
    access_right: "open",
    license: "cc-by-4.0",
    language: LANG3[a.language] ?? undefined,
    keywords: a.keywords?.length ? a.keywords : undefined,
    // the article page on the journal site is the same work
    related_identifiers: [{ identifier: articleUrl(a.id, a.language), relation: "isIdenticalTo", resource_type: conf ? "publication-conferencepaper" : "publication-article", scheme: "url" }],
    references: String(a.references ?? "").split(/\r?\n/).map((r) => plain(r)).filter((r) => r.length > 8).slice(0, 200),
  };
  if (conf) {
    md.conference_title = pick(conf.title);
    const place = pick(conf.location);
    if (place) md.conference_place = place;
    if (conf.start_date) md.conference_dates = conf.end_date && conf.end_date !== conf.start_date ? `${conf.start_date} – ${conf.end_date}` : conf.start_date;
    if (pages) md.partof_pages = pages;
    if (iss?.title && pick(iss.title)) md.partof_title = pick(iss.title);
  } else {
    md.journal_title = pick(j.title);
    if (iss?.volumes) md.journal_volume = String(iss.volumes.number);
    if (iss) md.journal_issue = String(iss.number);
    if (pages) md.journal_pages = pages;
  }
  const issn = isIssn(j.issn_online) ? j.issn_online : isIssn(j.issn_print) ? j.issn_print : null;
  if (issn) md.notes = `${pick(j.title)}, ISSN ${issn}`;
  if (process.env.ZENODO_COMMUNITY) md.communities = [{ identifier: process.env.ZENODO_COMMUNITY }];
  if (!(md.references as string[]).length) delete md.references;
  for (const k of Object.keys(md)) if (md[k] === undefined) delete md[k];
  return md;
}

/** Why an article can't get a Zenodo DOI yet ("" = ready). */
export function zenodoNotReady(a: Pick<ZArticle, "status" | "pdf_path" | "doi" | "zenodo_id">): "" | "not-published" | "no-pdf" | "has-doi" {
  if (a.status !== "published") return "not-published";
  if (!a.pdf_path) return "no-pdf";
  if (a.doi && isDoi(a.doi) && !a.zenodo_id) return "has-doi"; // a DOI from elsewhere is kept
  return "";
}

async function api(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const r = await fetch(path.startsWith("http") ? path : `${base()}/api${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${process.env.ZENODO_TOKEN}`, ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text.slice(0, 300) }; }
  if (!r.ok) {
    const detail = body?.errors?.map((e: { field?: string; message?: string }) => `${e.field ? `${e.field}: ` : ""}${e.message}`).join("; ");
    const msg = r.status === 401 || r.status === 403 ? "Zenodo refused the token (check it has deposit:write and deposit:actions)." : `${body?.message ?? `HTTP ${r.status}`}${detail ? ` — ${detail}` : ""}`;
    throw new Error(msg);
  }
  return body;
}

/** Creates or updates the Zenodo record of one article and saves its DOI. */
async function depositOne(db: Db, j: DepositJournal, a: ZArticle): Promise<{ ok: boolean; doi?: string; error?: string }> {
  const metadata = zenodoMetadata(j, a);
  try {
    let rec: any;
    if (a.zenodo_id) {
      // already on Zenodo: open it for editing, send the current details, publish again (same DOI)
      await api(`/deposit/depositions/${a.zenodo_id}/actions/edit`, { method: "POST" }).catch((e) => {
        if (!/already|editing|draft/i.test(String(e.message))) throw e;
      });
      await api(`/deposit/depositions/${a.zenodo_id}`, { method: "PUT", json: { metadata } });
      rec = await api(`/deposit/depositions/${a.zenodo_id}/actions/publish`, { method: "POST" });
    } else {
      const { data: file, error } = await db.storage.from("articles").download(a.pdf_path!);
      if (error || !file) throw new Error("The article PDF could not be read from storage.");
      const dep = await api("/deposit/depositions", { method: "POST", json: { metadata } });
      // remember the record at once, so a failure later never makes a second record
      await db.from("articles").update({ zenodo_id: dep.id }).eq("id", a.id);
      const name = `${(a.title || "article").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80) || "article"}.pdf`;
      await api(`${dep.links.bucket}/${encodeURIComponent(name)}`, { method: "PUT", body: file, headers: { "Content-Type": "application/octet-stream" } });
      rec = await api(`/deposit/depositions/${dep.id}/actions/publish`, { method: "POST" });
    }
    const doi = String(rec?.doi ?? rec?.metadata?.doi ?? "");
    if (!isDoi(doi)) throw new Error("Zenodo published the record but returned no DOI.");
    await db.from("articles").update({ doi, doi_status: "registered", doi_message: null, doi_registered_at: new Date().toISOString(), zenodo_id: rec.id ?? a.zenodo_id }).eq("id", a.id);
    return { ok: true, doi };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Zenodo error";
    await db.from("articles").update({ doi_status: "failed", doi_message: msg.slice(0, 500) }).eq("id", a.id);
    return { ok: false, error: msg };
  }
}

export type ZenodoResult = { sent: number; failed: number; skipped: number; error?: string };

/** Sends the ready articles among `articleIds` to Zenodo, one by one. */
export async function registerZenodo(db: Db, articleIds: string[]): Promise<ZenodoResult> {
  if (!zenodoConfigured()) return { sent: 0, failed: 0, skipped: articleIds.length, error: "not-configured" };
  if (!articleIds.length) return { sent: 0, failed: 0, skipped: 0, error: "nothing-ready" };
  const [{ data: j }, { data }] = await Promise.all([
    db.from("journals").select(JOURNAL_SELECT).eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    db.from("articles").select(`${DEPOSIT_SELECT}, keywords, pdf_path, zenodo_id, doi_status`).in("id", articleIds),
  ]);
  const journal = j as DepositJournal | null;
  if (!journal) return { sent: 0, failed: 0, skipped: articleIds.length, error: "no-journal" };
  const ready = ((data ?? []) as unknown as ZArticle[]).filter((a) => !zenodoNotReady(a));
  if (!ready.length) return { sent: 0, failed: 0, skipped: articleIds.length, error: "nothing-ready" };
  let sent = 0, failed = 0, lastError: string | undefined;
  for (const a of ready) {
    const r = await depositOne(db, journal, a);
    if (r.ok) sent++; else { failed++; lastError = r.error; }
  }
  return { sent, failed, skipped: articleIds.length - ready.length, ...(failed && !sent ? { error: lastError } : {}) };
}
