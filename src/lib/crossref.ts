import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import { SITE_URL, articleUrl } from "@/lib/site";
import { doiFor, isDoi, isDoiPrefix, isIssn } from "@/lib/identifiers";
import type { I18nText } from "@/lib/i18n-field";

/**
 * Crossref DOI registration (schema 5.3.1).
 * Credentials live only in Vercel: CROSSREF_USERNAME, CROSSREF_PASSWORD (Secret).
 * CROSSREF_TEST=1 sends to Crossref's test system instead of the real one.
 * Docs: https://www.crossref.org/documentation/register-maintain-records/direct-deposit-xml/https-post/
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

export const crossrefTest = () => ["1", "true", "yes"].includes(String(process.env.CROSSREF_TEST ?? "").toLowerCase());
export const crossrefConfigured = () => !!(process.env.CROSSREF_USERNAME && process.env.CROSSREF_PASSWORD);
const host = () => (crossrefTest() ? "https://test.crossref.org" : "https://doi.crossref.org");

export type DepositJournal = {
  id: string; slug: string; title: I18nText; publisher: string | null; contact_email: string | null;
  issn_online: string | null; issn_print: string | null; doi_prefix: string | null; doi_auto?: boolean;
};
type Conf = { title: I18nText; location: I18nText | null; start_date: string; end_date: string | null };
type Iss = {
  id: string; number: number; is_special: boolean; published_at: string | null; title: I18nText | null; conference_id: string | null;
  volumes: { number: number; year: number } | null; conferences: Conf | null;
};
export type DepositArticle = {
  id: string; title: string; title_i18n: I18nText | null; abstract: string; language: string; doi: string | null; status: string;
  authors: { name: string; affiliation?: string; orcid?: string }[]; references: string | null;
  first_page: number | null; last_page: number | null; published_at: string | null; license: string | null; issues: Iss | null;
};

export const DEPOSIT_SELECT =
  "id, title, title_i18n, abstract, language, doi, status, authors, references, first_page, last_page, published_at, license, " +
  "issues(id, number, is_special, published_at, title, conference_id, volumes(number, year), conferences(title, location, start_date, end_date))";
export const JOURNAL_SELECT = "id, slug, title, publisher, contact_email, issn_online, issn_print, doi_prefix, doi_auto";

/* ------------------------------------------------------------------ XML */

const esc = (s: unknown) => String(s ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pick = (t: I18nText | null | undefined, ...order: string[]) => {
  for (const l of [...order, "en", "uz", "ru"]) { const v = (t as Record<string, string> | null | undefined)?.[l]?.trim(); if (v) return v; }
  return "";
};
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * "Karimov, Anvar" → surname Karimov; "A. B. Karimov" → Karimov; "Ali Valiyev" / "Valiyev Ali" → Valiyev (surname ending);
 * otherwise Uzbek/Russian put the surname first, English last.
 */
export function splitName(name: string, lang: string): { given?: string; surname: string } {
  const n = name.trim().replace(/\s+/g, " ");
  if (n.includes(",")) {
    const i = n.indexOf(",");
    return { surname: n.slice(0, i).trim(), given: n.slice(i + 1).trim() || undefined };
  }
  const p = n.split(" ");
  if (p.length === 1) return { surname: n };
  const initials = (x: string) => /^(\p{L}\.)+$/u.test(x);
  if (initials(p[0])) return { given: p.slice(0, -1).join(" "), surname: p.at(-1)! };
  if (initials(p.at(-1)!)) return { surname: p[0], given: p.slice(1).join(" ") };
  // Uzbek/Russian surnames have telling endings (Karimov, Aliyeva, Rashidzoda); patronymics (-ovich, -ovna) do not match
  const surnameLike = p.map((x) => /(ov|ova|ev|eva|yev|yeva|skiy|skaya|zoda|zade|ов|ова|ев|ева|ёв|ёва|ский|ская|зода)$/i.test(x));
  if (surnameLike.filter(Boolean).length === 1) {
    const i = surnameLike.indexOf(true);
    return { surname: p[i], given: p.filter((_, k) => k !== i).join(" ") };
  }
  return lang === "en"
    ? { given: p.slice(0, -1).join(" "), surname: p.at(-1)! }
    : { surname: p[0], given: p.slice(1).join(" ") };
}

function date(tag: string, iso: string | null | undefined, attrs = ' media_type="online"') {
  const d = iso ? new Date(iso) : new Date();
  return `<${tag}${attrs}><month>${String(d.getUTCMonth() + 1).padStart(2, "0")}</month><day>${String(d.getUTCDate()).padStart(2, "0")}</day><year>${d.getUTCFullYear()}</year></${tag}>`;
}


function contributors(a: DepositArticle) {
  if (!a.authors?.length) return "";
  return `<contributors>${a.authors.map((au, i) => {
    const { given, surname } = splitName(au.name, a.language);
    const orcid = au.orcid ? String(au.orcid).replace(/^https?:\/\/orcid\.org\//, "") : "";
    return `<person_name sequence="${i ? "additional" : "first"}" contributor_role="author">` +
      (given ? `<given_name>${esc(given)}</given_name>` : "") + `<surname>${esc(surname)}</surname>` +
      (au.affiliation ? `<affiliations><institution><institution_name>${esc(au.affiliation)}</institution_name></institution></affiliations>` : "") +
      (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid) ? `<ORCID>https://orcid.org/${orcid}</ORCID>` : "") +
      `</person_name>`;
  }).join("")}</contributors>`;
}

function common(a: DepositArticle, pubDate: string | null) {
  const abs = plain(a.abstract ?? "");
  return {
    abstract: abs ? `<jats:abstract><jats:p>${esc(abs)}</jats:p></jats:abstract>` : "",
    date: date("publication_date", a.published_at ?? pubDate),
    pages: a.first_page ? `<pages><first_page>${a.first_page}</first_page>${a.last_page ? `<last_page>${a.last_page}</last_page>` : ""}</pages>` : "",
    license: `<ai:program name="AccessIndicators"><ai:free_to_read/><ai:license_ref applies_to="vor">https://creativecommons.org/licenses/by/4.0/</ai:license_ref></ai:program>`,
    doi: `<doi_data><doi>${esc(a.doi)}</doi><resource>${esc(articleUrl(a.id, a.language))}</resource></doi_data>`,
    refs: citations(a.references),
  };
}

function citations(refs: string | null) {
  const list = String(refs ?? "").split(/\r?\n/).map((r) => plain(r).replace(/^\[?\d{1,3}[.)\]]\s*/, "").trim()).filter((r) => r.length > 8).slice(0, 500);
  if (!list.length) return "";
  return `<citation_list>${list.map((r, i) => {
    const doi = r.match(/10\.\d{4,9}\/[^\s"<>]+[^\s"<>.,;)]/)?.[0];
    return `<citation key="ref${i + 1}">${doi ? `<doi>${esc(doi)}</doi>` : ""}<unstructured_citation>${esc(r.slice(0, 3000))}</unstructured_citation></citation>`;
  }).join("")}</citation_list>`;
}

function journalBlock(j: DepositJournal, issue: Iss | null, items: DepositArticle[]) {
  const issns = [
    isIssn(j.issn_online) ? `<issn media_type="electronic">${j.issn_online}</issn>` : "",
    isIssn(j.issn_print) ? `<issn media_type="print">${j.issn_print}</issn>` : "",
  ].join("");
  // Crossref needs an ISSN or a DOI for the journal itself
  const titleDoi = issns ? "" : `<doi_data><doi>${esc(`${j.doi_prefix}/journal`)}</doi><resource>${esc(`${SITE_URL}/${routing.defaultLocale}`)}</resource></doi_data>`;
  const pubDate = issue?.published_at ?? items[0]?.published_at ?? null;
  const issueXml = issue
    ? `<journal_issue>${date("publication_date", pubDate)}` +
      (issue.volumes ? `<journal_volume><volume>${issue.volumes.number}</volume></journal_volume>` : "") +
      `<issue>${issue.number}</issue>${issue.is_special ? "<special_numbering>Special issue</special_numbering>" : ""}</journal_issue>`
    : "";
  return `<journal><journal_metadata language="${esc(items[0]?.language || "uz")}"><full_title>${esc(pick(j.title))}</full_title>${issns}${titleDoi}</journal_metadata>${issueXml}` +
    items.map((a) => {
      const c = common(a, pubDate);
      return `<journal_article publication_type="full_text" language="${esc(a.language)}"><titles><title>${esc(a.title)}</title></titles>` +
        `${contributors(a)}${c.abstract}${c.date}${c.pages}${c.license}${c.doi}${c.refs}</journal_article>`;
    }).join("") + `</journal>`;
}

function conferenceBlock(j: DepositJournal, issue: Iss, items: DepositArticle[]) {
  const conf = issue.conferences!;
  const s = conf.start_date ? new Date(conf.start_date) : null, e = conf.end_date ? new Date(conf.end_date) : s;
  const dateAttrs = s && e
    ? ` start_year="${s.getUTCFullYear()}" start_month="${String(s.getUTCMonth() + 1).padStart(2, "0")}" start_day="${String(s.getUTCDate()).padStart(2, "0")}"` +
      ` end_year="${e.getUTCFullYear()}" end_month="${String(e.getUTCMonth() + 1).padStart(2, "0")}" end_day="${String(e.getUTCDate()).padStart(2, "0")}"`
    : "";
  const name = pick(conf.title);
  const place = pick(conf.location);
  const pubDate = issue.published_at ?? items[0]?.published_at ?? null;
  return `<conference><event_metadata><conference_name>${esc(name)}</conference_name>` +
    (place ? `<conference_location>${esc(place)}</conference_location>` : "") +
    (s ? `<conference_date${dateAttrs}/>` : "") + `</event_metadata>` +
    `<proceedings_metadata language="${esc(items[0]?.language || "uz")}"><proceedings_title>${esc(pick(issue.title) || name)}</proceedings_title>` +
    `<publisher><publisher_name>${esc(j.publisher || pick(j.title))}</publisher_name></publisher>${date("publication_date", pubDate)}<noisbn reason="simple_series"/></proceedings_metadata>` +
    items.map((a) => {
      const c = common(a, pubDate);
      return `<conference_paper publication_type="full_text" language="${esc(a.language)}">${contributors(a)}<titles><title>${esc(a.title)}</title></titles>` +
        `${c.abstract}${c.date}${c.pages}${c.license}${c.doi}${c.refs}</conference_paper>`;
    }).join("") + `</conference>`;
}

/** One deposit file for the given articles, grouped by issue / conference collection. */
export function buildDepositXml(j: DepositJournal, articles: DepositArticle[], batchId: string) {
  const groups = new Map<string, { issue: Iss | null; items: DepositArticle[] }>();
  for (const a of articles) {
    const k = a.issues?.id ?? "none";
    if (!groups.has(k)) groups.set(k, { issue: a.issues, items: [] });
    groups.get(k)!.items.push(a);
  }
  const ts = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
  const body = [...groups.values()].map(({ issue, items }) =>
    issue?.conferences ? conferenceBlock(j, issue, items) : journalBlock(j, issue, items)).join("");
  const email = j.contact_email || process.env.CROSSREF_EMAIL || "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1" xmlns:ai="http://www.crossref.org/AccessIndicators.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
<head><doi_batch_id>${esc(batchId)}</doi_batch_id><timestamp>${ts}</timestamp><depositor><depositor_name>${esc(j.publisher || pick(j.title))}</depositor_name><email_address>${esc(email)}</email_address></depositor><registrant>${esc(j.publisher || pick(j.title))}</registrant></head>
<body>${body}</body>
</doi_batch>
`;
}

/** Why an article cannot be sent to Crossref yet ("" = ready). */
export function notReady(a: DepositArticle, j: DepositJournal): "" | "not-published" | "no-doi" | "bad-doi" | "other-prefix" | "no-prefix" {
  if (!isDoiPrefix(j.doi_prefix)) return "no-prefix";
  if (a.status !== "published") return "not-published";
  if (!a.doi) return "no-doi";
  if (!isDoi(a.doi)) return "bad-doi";
  if (!a.doi.toLowerCase().startsWith(`${j.doi_prefix.toLowerCase()}/`)) return "other-prefix";
  return "";
}

/* ------------------------------------------------------------- Crossref API */

async function postDeposit(xml: string, fileName: string): Promise<{ ok: boolean; message: string }> {
  const fd = new FormData();
  fd.set("operation", "doMDUpload");
  fd.set("login_id", process.env.CROSSREF_USERNAME!);
  fd.set("login_passwd", process.env.CROSSREF_PASSWORD!);
  fd.set("fname", new Blob([xml], { type: "application/xml" }), fileName);
  try {
    const r = await fetch(`${host()}/servlet/deposit`, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
    const text = plain(await r.text()).slice(0, 400);
    if (r.status === 401 || r.status === 403) return { ok: false, message: "Crossref refused the username or password." };
    return { ok: r.ok && (/SUCCESS/i.test(text) || !/FAILURE/i.test(text)), message: text || `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

type Diag = { state: string; records: { doi: string; ok: boolean; msg: string }[] };
async function fetchResult(fileName: string): Promise<Diag | null> {
  const q = new URLSearchParams({ usr: process.env.CROSSREF_USERNAME!, pwd: process.env.CROSSREF_PASSWORD!, file_name: fileName, type: "result" });
  try {
    const r = await fetch(`${host()}/servlet/submissionDownload?${q}`, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
    if (!r.ok) return null;
    return parseDiagnostic(await r.text());
  } catch { return null; }
}

/** Reads Crossref's submission log (doi_batch_diagnostic). */
export function parseDiagnostic(xml: string): Diag {
  const state = xml.match(/<doi_batch_diagnostic[^>]*status="([^"]+)"/)?.[1] ?? "unknown";
  const records = [...xml.matchAll(/<record_diagnostic[^>]*status="([^"]+)"[^>]*>([\s\S]*?)<\/record_diagnostic>/g)].map((m) => ({
    ok: m[1] === "Success",
    doi: (m[2].match(/<doi>([^<]*)<\/doi>/)?.[1] ?? "").trim(),
    msg: plain(m[2].match(/<msg>([\s\S]*?)<\/msg>/)?.[1] ?? ""),
  }));
  return { state, records };
}

/* --------------------------------------------------------------- workflow */

/** Gives a DOI to each listed article that has none (when the journal has a prefix). Returns how many got one. */
export async function assignDois(db: Db, articleIds: string[]): Promise<number> {
  if (!articleIds.length) return 0;
  const { data: j } = await db.from("journals").select(JOURNAL_SELECT).eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  const journal = j as DepositJournal | null;
  if (!journal || !isDoiPrefix(journal.doi_prefix)) return 0;
  const { data } = await db.from("articles").select("id, doi, published_at, created_at").in("id", articleIds);
  let n = 0;
  for (const a of (data ?? []) as { id: string; doi: string | null; published_at: string | null; created_at: string }[]) {
    if (a.doi) continue;
    const year = new Date(a.published_at ?? a.created_at ?? Date.now()).getUTCFullYear();
    for (const extra of [0, 4, 8]) {
      const { error } = await db.from("articles").update({ doi: doiFor(journal.doi_prefix, a.id, year, extra), doi_status: "none" }).eq("id", a.id);
      if (!error) { n++; break; }
    }
  }
  return n;
}

export type RegisterResult = { sent: number; skipped: number; error?: string; fileName?: string };

/** Sends the ready articles among `articleIds` to Crossref in one file and remembers the file. */
export async function registerDois(db: Db, articleIds: string[], userId?: string | null): Promise<RegisterResult> {
  if (!crossrefConfigured()) return { sent: 0, skipped: articleIds.length, error: "not-configured" };
  const { data: j } = await db.from("journals").select(JOURNAL_SELECT).eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  const journal = j as DepositJournal | null;
  if (!journal || !isDoiPrefix(journal.doi_prefix)) return { sent: 0, skipped: articleIds.length, error: "no-prefix" };
  const { data } = await db.from("articles").select(DEPOSIT_SELECT).in("id", articleIds);
  const ready = ((data ?? []) as unknown as DepositArticle[]).filter((a) => !notReady(a, journal));
  if (!ready.length) return { sent: 0, skipped: articleIds.length, error: "nothing-ready" };

  const fileName = `${journal.slug}-${Date.now()}.xml`;
  const xml = buildDepositXml(journal, ready, fileName);
  const res = await postDeposit(xml, fileName);
  const ids = ready.map((a) => a.id);
  await db.from("crossref_deposits").insert({
    file_name: fileName, article_ids: ids, test: crossrefTest(), status: res.ok ? "submitted" : "failed",
    message: res.message, created_by: userId ?? null,
  });
  await db.from("articles").update(res.ok
    ? { doi_status: "queued", doi_message: null }
    : { doi_status: "failed", doi_message: res.message.slice(0, 500) }).in("id", ids);
  return res.ok ? { sent: ids.length, skipped: articleIds.length - ids.length, fileName } : { sent: 0, skipped: articleIds.length, error: res.message };
}

/** Asks Crossref how the files still waiting were processed and updates each article. */
export async function checkDeposits(db: Db): Promise<{ checked: number; registered: number; failed: number }> {
  const out = { checked: 0, registered: 0, failed: 0 };
  if (!crossrefConfigured()) return out;
  const { data } = await db.from("crossref_deposits").select("id, file_name, article_ids, created_at").eq("status", "submitted").order("created_at").limit(20);
  for (const d of (data ?? []) as { id: number; file_name: string; article_ids: string[]; created_at: string }[]) {
    out.checked++;
    const diag = await fetchResult(d.file_name);
    if (!diag || !["completed"].includes(diag.state)) {
      // unknown after 3 days: give up so it can be sent again
      if (Date.now() - Date.parse(d.created_at) > 3 * 86_400_000) {
        await db.from("crossref_deposits").update({ status: "failed", message: `Crossref: ${diag?.state ?? "no answer"}`, checked_at: new Date().toISOString() }).eq("id", d.id);
        await db.from("articles").update({ doi_status: "failed", doi_message: "Crossref did not process the file. Send it again." }).in("id", d.article_ids).eq("doi_status", "queued");
      } else {
        await db.from("crossref_deposits").update({ checked_at: new Date().toISOString() }).eq("id", d.id);
      }
      continue;
    }
    const ok = diag.records.filter((r) => r.ok), bad = diag.records.filter((r) => !r.ok);
    await db.from("crossref_deposits").update({
      status: bad.length && !ok.length ? "failed" : "completed", success: ok.length, failure: bad.length,
      message: bad.map((r) => `${r.doi}: ${r.msg}`).join("\n").slice(0, 2000) || null, checked_at: new Date().toISOString(),
    }).eq("id", d.id);
    const { data: arts } = await db.from("articles").select("id, doi").in("id", d.article_ids);
    for (const a of (arts ?? []) as { id: string; doi: string | null }[]) {
      const rec = diag.records.find((r) => r.doi.toLowerCase() === (a.doi ?? "").toLowerCase());
      if (!rec) continue;
      if (rec.ok) out.registered++; else out.failed++;
      await db.from("articles").update(rec.ok
        ? { doi_status: "registered", doi_message: null, doi_registered_at: new Date().toISOString() }
        : { doi_status: "failed", doi_message: rec.msg.slice(0, 500) }).eq("id", a.id);
    }
  }
  return out;
}

/**
 * After publishing: give the articles DOIs (if the journal does that automatically) and,
 * when Crossref is connected, register them. Safe to call when nothing is set up.
 */
export async function afterPublish(db: Db, articleIds: string[], userId?: string | null) {
  if (!articleIds.length) return;
  const { data: j } = await db.from("journals").select("doi_prefix, doi_auto").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  if (!j || !isDoiPrefix(j.doi_prefix as string)) return;
  if (j.doi_auto) await assignDois(db, articleIds);
  if (crossrefConfigured()) await registerDois(db, articleIds, userId);
}
