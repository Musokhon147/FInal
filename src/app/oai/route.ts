import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { IS_DEMO } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { isDoi, isIssn } from "@/lib/identifiers";
import type { I18nText } from "@/lib/i18n-field";

/**
 * OAI-PMH 2.0 (Dublin Core) — the address indexes such as BASE, OpenAIRE, CORE and
 * national catalogues use to collect every published article automatically.
 * Spec: https://www.openarchives.org/OAI/openarchivesprotocol.html
 */

const PAGE = 100;
const BASE_URL = `${SITE_URL}/oai`;
const HOST = new URL(SITE_URL).hostname;
const ID_PREFIX = `oai:${HOST}:article/`;
const LANG3: Record<string, string> = { uz: "uzb", ru: "rus", en: "eng" };

type Row = {
  id: string; title: string; abstract: string; keywords: string[]; language: string; doi: string | null; pdf_path: string | null;
  authors: { name: string }[]; first_page: number | null; last_page: number | null; published_at: string | null; updated_at: string | null;
  issues: { number: number; is_special: boolean; conference_id: string | null; volumes: { number: number; year: number } | null } | null;
};
type Journal = { title: I18nText; publisher: string | null; issn_online: string | null; issn_print: string | null; contact_email: string | null };

const esc = (s: unknown) => String(s ?? "")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stamp = (iso: string | null | undefined) => new Date(iso || "2026-01-01").toISOString().replace(/\.\d{3}Z$/, "Z");
const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const jt = (j: Journal | null) => j?.title?.en || j?.title?.uz || j?.title?.ru || "Journal";

function envelope(req: Record<string, string>, inner: string) {
  const attrs = Object.entries(req).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
<responseDate>${stamp(new Date().toISOString())}</responseDate>
<request${attrs}>${esc(BASE_URL)}</request>
${inner}
</OAI-PMH>
`;
}
const xml = (body: string) => new NextResponse(body, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
const fail = (code: string, msg: string, req: Record<string, string> = {}) =>
  xml(envelope(code === "badVerb" || code === "badArgument" ? {} : req, `<error code="${code}">${esc(msg)}</error>`));

function header(r: Row) {
  return `<header><identifier>${ID_PREFIX}${r.id}</identifier><datestamp>${stamp(r.updated_at || r.published_at)}</datestamp>` +
    `<setSpec>${r.issues?.conference_id ? "conference" : "journal"}</setSpec></header>`;
}

function record(r: Row, j: Journal | null) {
  const url = `${SITE_URL}/${routing.defaultLocale}/article/${r.id}`;
  const v = r.issues?.volumes, iss = r.issues;
  const range = r.first_page ? `${r.first_page}${r.last_page ? `-${r.last_page}` : ""}` : "";
  const issn = isIssn(j?.issn_online) ? j!.issn_online : isIssn(j?.issn_print) ? j!.issn_print : null;
  const source = [jt(j), v ? `Vol. ${v.number}` : "", iss ? `No. ${iss.number}${v ? ` (${v.year})` : ""}` : "", range ? `pp. ${range}` : ""].filter(Boolean).join(", ");
  const dc = (tag: string, val: unknown) => (val === null || val === undefined || val === "" ? "" : `<dc:${tag}>${esc(String(val).replace(/\s+/g, " ").trim())}</dc:${tag}>`);
  const body = `
<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
${dc("title", r.title)}
${r.authors.map((a) => dc("creator", a.name)).join("")}
${r.keywords.map((k) => dc("subject", k)).join("")}
${dc("description", plain(r.abstract ?? ""))}
${dc("publisher", j?.publisher)}
${dc("date", (r.published_at ?? "").slice(0, 10))}
${dc("type", iss?.conference_id ? "info:eu-repo/semantics/conferenceObject" : "info:eu-repo/semantics/article")}
${dc("type", "Text")}
${r.pdf_path ? dc("format", "application/pdf") : ""}
${dc("identifier", url)}
${isDoi(r.doi) ? dc("identifier", `https://doi.org/${r.doi}`) : ""}
${r.pdf_path ? dc("relation", `${url}/full-text.pdf`) : ""}
${dc("source", source)}
${issn ? dc("source", `ISSN ${issn}`) : ""}
${dc("language", LANG3[r.language] ?? r.language)}
${dc("rights", "info:eu-repo/semantics/openAccess")}
${dc("rights", "https://creativecommons.org/licenses/by/4.0/")}
</oai_dc:dc>`;
  return `<record>${header(r)}<metadata>${body.split("\n").filter((l) => l.trim()).join("\n")}</metadata></record>`;
}

/** Datestamps given as YYYY-MM-DD or YYYY-MM-DDThh:mm:ssZ. */
function parseDate(v: string | undefined, end: boolean): number | null | "bad" {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return Date.parse(`${v}T${end ? "23:59:59.999" : "00:00:00"}Z`);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)) return Date.parse(v) + (end ? 999 : 0);
  return "bad";
}

type Token = { o: number; f?: string; u?: string; s?: string };
const encodeToken = (t: Token) => Buffer.from(JSON.stringify(t)).toString("base64url");
function decodeToken(s: string): Token | null {
  try { const t = JSON.parse(Buffer.from(s, "base64url").toString()); return typeof t?.o === "number" ? t : null; } catch { return null; }
}

const SELECT = "id, title, abstract, keywords, language, doi, pdf_path, authors, first_page, last_page, published_at, updated_at, " +
  "issues(number, is_special, conference_id, volumes(number, year))";

async function handle(params: Record<string, string>) {
  const db = createPublicClient();
  const { verb, ...args } = params;
  const req = { ...params };
  const allowed: Record<string, string[]> = {
    Identify: [], ListMetadataFormats: ["identifier"], ListSets: ["resumptionToken"],
    GetRecord: ["identifier", "metadataPrefix"],
    ListIdentifiers: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
    ListRecords: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
  };
  if (!verb || !(verb in allowed)) return fail("badVerb", "Illegal or missing verb");
  const extra = Object.keys(args).filter((k) => !allowed[verb].includes(k));
  if (extra.length) return fail("badArgument", `Illegal argument: ${extra.join(", ")}`);

  const { data: journal } = await db.from("journals").select("title, publisher, issn_online, issn_print, contact_email")
    .eq("is_active", true).order("sort_order").limit(1).maybeSingle<Journal>();

  if (verb === "Identify") {
    const { data: first } = await db.from("articles").select("updated_at, published_at").eq("status", "published").order("updated_at").limit(1);
    const earliest = (first?.[0] as { updated_at?: string; published_at?: string } | undefined);
    return xml(envelope(req, `<Identify>
<repositoryName>${esc(jt(journal))}</repositoryName>
<baseURL>${esc(BASE_URL)}</baseURL>
<protocolVersion>2.0</protocolVersion>
<adminEmail>${esc(journal?.contact_email || `editor@${HOST}`)}</adminEmail>
<earliestDatestamp>${stamp(earliest?.updated_at || earliest?.published_at)}</earliestDatestamp>
<deletedRecord>no</deletedRecord>
<granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
<description><oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd"><scheme>oai</scheme><repositoryIdentifier>${esc(HOST)}</repositoryIdentifier><delimiter>:</delimiter><sampleIdentifier>${ID_PREFIX}00000000-0000-0000-0000-000000000000</sampleIdentifier></oai-identifier></description>
</Identify>`));
  }

  if (verb === "ListMetadataFormats") {
    if (args.identifier && !(await one(args.identifier))) return fail("idDoesNotExist", "No such record", req);
    return xml(envelope(req, `<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>`));
  }

  if (verb === "ListSets") {
    if (args.resumptionToken) return fail("badResumptionToken", "No more sets", req);
    return xml(envelope(req, `<ListSets><set><setSpec>journal</setSpec><setName>Journal articles</setName></set><set><setSpec>conference</setSpec><setName>Conference theses</setName></set></ListSets>`));
  }

  async function one(identifier: string) {
    if (!identifier.startsWith(ID_PREFIX)) return null;
    const id = identifier.slice(ID_PREFIX.length);
    if (!/^[\w-]{1,64}$/.test(id)) return null;
    const { data } = await db.from("articles").select(SELECT).eq("id", id).eq("status", "published").maybeSingle();
    return data as unknown as Row | null;
  }

  if (verb === "GetRecord") {
    if (!args.identifier || !args.metadataPrefix) return fail("badArgument", "identifier and metadataPrefix are required");
    if (args.metadataPrefix !== "oai_dc") return fail("cannotDisseminateFormat", "Only oai_dc is supported", req);
    const r = await one(args.identifier);
    if (!r) return fail("idDoesNotExist", "No such record", req);
    return xml(envelope(req, `<GetRecord>${record(r, journal)}</GetRecord>`));
  }

  // ListIdentifiers / ListRecords
  let tok: Token;
  if (args.resumptionToken) {
    if (Object.keys(args).length > 1) return fail("badArgument", "resumptionToken is exclusive");
    const t = decodeToken(args.resumptionToken);
    if (!t) return fail("badResumptionToken", "Invalid resumptionToken", req);
    tok = t;
  } else {
    if (!args.metadataPrefix) return fail("badArgument", "metadataPrefix is required");
    if (args.metadataPrefix !== "oai_dc") return fail("cannotDisseminateFormat", "Only oai_dc is supported", req);
    if (args.from && args.until && args.from.length !== args.until.length) return fail("badArgument", "from and until must have the same granularity");
    tok = { o: 0, f: args.from, u: args.until, s: args.set };
  }
  const from = parseDate(tok.f, false), until = parseDate(tok.u, true);
  if (from === "bad" || until === "bad") return fail("badArgument", "Bad date", req);
  if (tok.s && !["journal", "conference"].includes(tok.s)) return fail("noRecordsMatch", "No such set", req);

  // all matching ids in datestamp order (paged from the database), then one page of full records
  type Lite = { id: string; updated_at: string | null; published_at: string | null; issues: { conference_id: string | null } | null };
  const all: Lite[] = [];
  for (let off = 0; ; off += 1000) {
    let q = db.from("articles").select("id, updated_at, published_at, issues(conference_id)").eq("status", "published").order("updated_at").order("id");
    if (!IS_DEMO) q = q.range(off, off + 999);
    const { data } = await q;
    const rows = (data ?? []) as unknown as Lite[];
    all.push(...rows);
    if (IS_DEMO || rows.length < 1000) break;
  }
  const matching = all.filter((r) => {
    const t = Date.parse(stamp(r.updated_at || r.published_at));
    if (from !== null && t < from) return false;
    if (until !== null && t > until) return false;
    if (tok.s === "journal" && r.issues?.conference_id) return false;
    if (tok.s === "conference" && !r.issues?.conference_id) return false;
    return true;
  });
  if (!matching.length) return fail("noRecordsMatch", "No records match", req);
  if (tok.o >= matching.length) return fail("badResumptionToken", "Expired resumptionToken", req);

  const ids = matching.slice(tok.o, tok.o + PAGE).map((r) => r.id);
  const { data: full } = await db.from("articles").select(SELECT).in("id", ids);
  const byId = new Map(((full ?? []) as unknown as Row[]).map((r) => [r.id, r]));
  const rows = ids.map((id) => byId.get(id)).filter(Boolean) as Row[];
  const next = tok.o + PAGE < matching.length ? encodeToken({ ...tok, o: tok.o + PAGE }) : "";
  const resumption = args.resumptionToken || next
    ? `<resumptionToken completeListSize="${matching.length}" cursor="${tok.o}">${next}</resumptionToken>` : "";
  const items = verb === "ListIdentifiers" ? rows.map(header).join("") : rows.map((r) => record(r, journal)).join("");
  return xml(envelope(req, `<${verb}>${items}${resumption}</${verb}>`));
}

export async function GET(request: NextRequest) {
  return handle(Object.fromEntries(request.nextUrl.searchParams));
}

export async function POST(request: NextRequest) {
  const body = new URLSearchParams(await request.text());
  return handle(Object.fromEntries(body));
}
