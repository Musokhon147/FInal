/**
 * DEMO MODE — a tiny in-memory stand-in for Supabase.
 * Used automatically when NEXT_PUBLIC_SUPABASE_URL is not set, so the site can be
 * seen and clicked through before a real database exists.
 * Supports only the query-builder features this app uses.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSeed, type DemoDb } from "./data";

export const DEMO_COOKIE = "demo_uid";

type Filter =
  | { op: "eq" | "neq"; col: string; val: any }
  | { op: "in"; col: string; val: any[] }
  | { op: "text"; col: string; val: string }
  | { op: "or"; val: string };

export type Query = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  columns?: string;
  count?: boolean;
  head?: boolean;
  filters: Filter[];
  order: { col: string; asc: boolean }[];
  limit?: number;
  single?: "single" | "maybe";
  values?: any;
  returning?: string;
};

export type Op =
  | { kind: "query"; q: Query }
  | { kind: "rpc"; name: string; args: any }
  | { kind: "upload"; bucket: string; path: string };

type Result = { data: any; error: { message: string } | null; count?: number | null };

/* ------------------------------------------------------------------ store */

const g = globalThis as unknown as { __demoDb?: DemoDb };
export function db(): DemoDb {
  if (!g.__demoDb) g.__demoDb = createSeed();
  return g.__demoDb;
}

/* --------------------------------------------------------------- relations */

type Rel = { one?: string; many?: string; fk: string };
const REL: Record<string, Record<string, Rel>> = {
  articles: { sections: { one: "sections", fk: "section_id" }, issues: { one: "issues", fk: "issue_id" } },
  issues: { volumes: { one: "volumes", fk: "volume_id" }, articles: { many: "articles", fk: "issue_id" }, conferences: { one: "conferences", fk: "conference_id" } },
  conferences: { issues: { many: "issues", fk: "conference_id" } },
  volumes: { issues: { many: "issues", fk: "volume_id" } },
  submissions: { profiles: { one: "profiles", fk: "submitter_id" }, sections: { one: "sections", fk: "section_id" } },
  notifications: { submissions: { one: "submissions", fk: "submission_id" } },
  review_assignments: {
    profiles: { one: "profiles", fk: "reviewer_id" },
    submissions: { one: "submissions", fk: "submission_id" },
  },
};

function splitTop(s: string) {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function project(table: string, row: any, columns = "*"): any {
  const out: any = {};
  for (const item of splitTop(columns)) {
    if (item === "*") {
      Object.assign(out, row);
      continue;
    }
    const m = item.match(/^(\w+)(?:!\w+)?\(([\s\S]*)\)$/);
    if (!m) {
      out[item] = row[item] ?? null;
      continue;
    }
    const [, name, inner] = m;
    const rel = REL[table]?.[name];
    if (!rel) continue;
    if (rel.one) {
      const target = db()[rel.one].find((r: any) => r.id === row[rel.fk]);
      out[name] = target ? project(rel.one, target, inner) : null;
    } else if (rel.many) {
      const children = db()[rel.many].filter((r: any) => r[rel.fk] === row.id);
      out[name] = inner.trim() === "count" ? [{ count: children.length }] : children.map((c: any) => project(rel.many!, c, inner));
    }
  }
  return out;
}

/* ----------------------------------------------------------------- filters */

function matches(row: any, f: Filter): boolean {
  switch (f.op) {
    case "eq":
      return row[f.col] === f.val;
    case "neq":
      return row[f.col] !== f.val;
    case "in":
      return f.val.includes(row[f.col]);
    case "text": {
      const hay = [row.title, row.abstract, (row.keywords ?? []).join(" "), (row.authors ?? []).map((a: any) => a.name).join(" "), row.full_text ?? "", ...Object.values(row.title_i18n ?? {}), ...Object.values(row.abstract_i18n ?? {})]
        .join(" ")
        .toLowerCase();
      return f.val
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((w) => hay.includes(w.replace(/["']/g, "")));
    }
    case "or":
      // "full_name.ilike.%q%,email.ilike.%q%"
      return f.val.split(",").some((part) => {
        const [col, , pat] = part.split(".");
        const needle = (pat ?? "").replace(/%/g, "").toLowerCase();
        return String(row[col] ?? "").toLowerCase().includes(needle);
      });
  }
}

function sortRows(rows: any[], order: Query["order"]) {
  return [...rows].sort((a, b) => {
    for (const o of order) {
      const x = a[o.col];
      const y = b[o.col];
      if (x === y) continue;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = x < y ? -1 : 1;
      return o.asc ? c : -c;
    }
    return 0;
  });
}

/* ------------------------------------------------------------------ writes */

const now = () => new Date().toISOString();
let seq = 1000;

function withDefaults(table: string, v: any, uid: string | null) {
  const base: any = { id: crypto.randomUUID(), created_at: now(), ...v };
  switch (table) {
    case "submissions":
      return { status: "draft", keywords: [], abstract: "", language: "uz", editor_id: null, decision_note: null, submitted_at: null, updated_at: now(), submitter_id: uid, ...base };
    case "submission_files":
      return { version: 1, uploaded_by: uid, kind: "manuscript", ...base };
    case "review_assignments":
      return { round: 1, status: "invited", recommendation: null, comments_to_author: null, comments_to_editor: null, completed_at: null, due_at: null, ...base };
    case "articles":
      return { title_i18n: {}, abstract_i18n: {}, keywords: [], authors: [], license: "CC BY 4.0", views: 0, downloads: 0, sort_order: 0, status: "scheduled", published_at: null, updated_at: now(), ...base };
    case "issues":
      return { status: "draft", published_at: null, is_special: false, title: {}, description: {}, cover_url: null, conference_id: null, ...base };
    case "pages":
      return { is_published: true, show_in_menu: false, sort_order: 0, title: {}, body: {}, ...base };
    case "conferences":
      return { title: {}, description: {}, location: {}, end_date: null, registration_deadline: null, cover_url: null, updated_at: now(), ...base };
    case "news":
      return { pinned: false, body: {}, title: {}, date: now().slice(0, 10), ...base };
    case "editorial_board":
      return { position_type: "member", photo_url: null, email: null, orcid: null, sort_order: 10, ...base };
    case "submission_events":
      return { id: ++seq, actor_id: uid, ...v, created_at: now() };
    default:
      return base;
  }
}

function logEvent(sid: string, from: string | null, to: string, note: string | null, uid: string | null) {
  db().submission_events.push(withDefaults("submission_events", { submission_id: sid, from_status: from, to_status: to, note }, uid));
}

function beforeUpdate(table: string, oldRow: any, patch: any) {
  if (table === "submissions" && patch.status === "submitted" && oldRow.status !== "submitted") patch.submitted_at = now();
  if (table === "review_assignments" && patch.status === "completed") patch.completed_at = now();
  if ("updated_at" in oldRow) patch.updated_at = now();
}

function notifyRow(user_id: string, type: string, submission_id: string, link: string, status: string | null = null) {
  db().notifications.push({ id: crypto.randomUUID(), user_id, type, submission_id, status, link, read: false, created_at: now() });
}
const staffIds = () => db().profiles.filter((p: any) => p.role === "editor" || p.role === "admin").map((p: any) => p.id);

// mirrors the database triggers (event log + notifications)
function afterWrite(table: string, before: any | null, after: any, uid: string | null) {
  if (table === "review_assignments") {
    if (!before) notifyRow(after.reviewer_id, "invite", after.submission_id, `/dashboard/reviews/${after.id}`);
    else if (after.status === "completed" && before.status !== "completed")
      staffIds().forEach((s: string) => notifyRow(s, "review", after.submission_id, `/admin/submissions/${after.submission_id}`));
    return;
  }
  if (table !== "submissions") return;
  if (!before) logEvent(after.id, null, after.status, null, uid);
  else if (before.status !== after.status) logEvent(after.id, before.status, after.status, after.decision_note, uid);
  if (before && before.status === after.status) return;
  if (after.status === "submitted") staffIds().forEach((s: string) => notifyRow(s, "new", after.id, `/admin/submissions/${after.id}`));
  else if (after.status !== "draft" && uid !== after.submitter_id) notifyRow(after.submitter_id, "status", after.id, `/dashboard/submissions/${after.id}`, after.status);
}

/* ---------------------------------------------------------------- execute */

function runQuery(q: Query, uid: string | null): Result {
  const store = db();
  const table: any[] = store[q.table];
  if (!table) return { data: null, error: { message: `Unknown table ${q.table}` } };
  const filtered = () => table.filter((r) => q.filters.every((f) => matches(r, f)));

  let rows: any[];
  let projectCols = q.columns;
  if (q.action === "select") {
    rows = sortRows(filtered(), q.order);
    const count = rows.length;
    if (q.limit != null) rows = rows.slice(0, q.limit);
    if (q.head) return { data: null, error: null, count };
    const data = rows.map((r) => project(q.table, r, projectCols));
    return finish(data, q, count);
  }
  if (q.action === "insert") {
    const list = (Array.isArray(q.values) ? q.values : [q.values]).map((v: any) => withDefaults(q.table, v, uid));
    for (const r of list) {
      table.push(r);
      afterWrite(q.table, null, r, uid);
    }
    rows = list;
    projectCols = q.returning;
  } else if (q.action === "update") {
    rows = filtered();
    for (const r of rows) {
      const before = { ...r };
      const patch = { ...q.values };
      beforeUpdate(q.table, r, patch);
      Object.assign(r, patch);
      afterWrite(q.table, before, r, uid);
    }
    projectCols = q.returning;
  } else {
    rows = filtered();
    store[q.table] = table.filter((r) => !rows.includes(r));
    projectCols = q.returning;
  }
  if (projectCols === undefined) return { data: null, error: null };
  return finish(rows.map((r) => project(q.table, r, projectCols)), q, rows.length);
}

function finish(data: any[], q: Query, count: number): Result {
  if (q.single) {
    if (!data.length) return q.single === "single" ? { data: null, error: { message: "No rows" } } : { data: null, error: null };
    return { data: data[0], error: null, count };
  }
  return { data, error: null, count: q.count ? count : null };
}

function runRpc(name: string, args: any, uid: string | null): Result {
  const store = db();
  if (name === "track_article") {
    const a = store.articles.find((x: any) => x.id === args.aid);
    if (a) a[args.kind === "download" ? "downloads" : "views"]++;
    return { data: null, error: null };
  }
  if (name === "reviews_for_author") {
    const data = store.review_assignments
      .filter((r: any) => r.submission_id === args.sid && r.status === "completed")
      .map((r: any) => ({ round: r.round, recommendation: r.recommendation, comments_to_author: r.comments_to_author, completed_at: r.completed_at }));
    return { data, error: null };
  }
  if (name === "journal_numbers") {
    const decided = ["accepted", "rejected", "revision_required"];
    const days: number[] = [];
    for (const sub of store.submissions) {
      const ev = store.submission_events.filter((e: any) => e.submission_id === sub.id).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
      const a = ev.find((e: any) => e.to_status === "submitted"), b = ev.find((e: any) => decided.includes(e.to_status));
      if (a && b && b.created_at > a.created_at) days.push((Date.parse(b.created_at) - Date.parse(a.created_at)) / 864e5);
    }
    const finals = store.submissions.filter((x: any) => ["accepted", "published", "rejected"].includes(x.status));
    const acc = finals.filter((x: any) => x.status !== "rejected").length;
    return { data: [{ decision_days: days.length ? Math.round(days.reduce((p, c) => p + c, 0) / days.length) : 0, acceptance_rate: finals.length ? Math.round((100 * acc) / finals.length) : 0 }], error: null };
  }
  void uid;
  return { data: null, error: { message: `Unknown rpc ${name}` } };
}

export function execute(op: Op, uid: string | null): Result {
  try {
    if (op.kind === "query") return runQuery(op.q, uid);
    if (op.kind === "rpc") return runRpc(op.name, op.args, uid);
    return { data: { path: op.path }, error: null }; // uploads: file bytes are not kept in demo mode
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

/* ------------------------------------------------------- client interface */

type Transport = {
  run: (op: Op) => Promise<Result>;
  getUid: () => string | null | undefined;
  setUid?: (uid: string | null) => void;
};

class QB implements PromiseLike<Result> {
  q: Query;
  constructor(private t: Transport, table: string) {
    this.q = { table, action: "select", filters: [], order: [] };
  }
  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    if (this.q.action === "select") {
      this.q.columns = columns;
      if (opts?.count) this.q.count = true;
      if (opts?.head) this.q.head = true;
    } else this.q.returning = columns;
    return this;
  }
  insert(values: any) { this.q.action = "insert"; this.q.values = values; return this; }
  update(values: any) { this.q.action = "update"; this.q.values = values; return this; }
  delete() { this.q.action = "delete"; return this; }
  eq(col: string, val: any) { this.q.filters.push({ op: "eq", col, val }); return this; }
  neq(col: string, val: any) { this.q.filters.push({ op: "neq", col, val }); return this; }
  in(col: string, val: any[]) { this.q.filters.push({ op: "in", col, val }); return this; }
  textSearch(col: string, val: string) { this.q.filters.push({ op: "text", col, val }); return this; }
  or(val: string) { this.q.filters.push({ op: "or", val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.q.order.push({ col, asc: opts?.ascending ?? true }); return this; }
  limit(n: number) { this.q.limit = n; return this; }
  single() { this.q.single = "single"; return this; }
  maybeSingle() { this.q.single = "maybe"; return this; }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.t.run({ kind: "query", q: this.q }).then(ok, bad);
  }
}

export function createDemoClient(t: Transport) {
  const currentUser = () => {
    const uid = t.getUid();
    const p = uid ? db().profiles.find((x: any) => x.id === uid) : null;
    return p ? { id: p.id, email: p.email } : null;
  };
  return {
    from: (table: string) => new QB(t, table),
    rpc: (name: string, args: any) => t.run({ kind: "rpc", name, args }),
    storage: {
      from: (bucket: string) => ({
        upload: (path: string) => t.run({ kind: "upload", bucket, path }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({ path: p, signedUrl: `/api/demo/pdf?f=${encodeURIComponent(p)}`, error: null })),
          error: null,
        }),
      }),
    },
    auth: {
      getUser: async () => ({ data: { user: currentUser() }, error: null }),
      signInWithPassword: async ({ email }: { email: string }) => {
        const p = db().profiles.find((x: any) => x.email.toLowerCase() === String(email).toLowerCase());
        if (!p) return { data: { user: null, session: null }, error: { message: "Invalid login" } };
        t.setUid?.(p.id);
        return { data: { user: { id: p.id, email: p.email }, session: {} }, error: null };
      },
      signUp: async ({ email, options }: { email: string; options?: { data?: any } }) => {
        const store = db();
        if (store.profiles.some((x: any) => x.email.toLowerCase() === String(email).toLowerCase())) {
          return { data: { user: null, session: null }, error: { message: "User already registered" } };
        }
        const p = {
          id: crypto.randomUUID(), email, full_name: options?.data?.full_name ?? "", affiliation: options?.data?.affiliation ?? null,
          orcid: null, role: "user", is_reviewer: false, preferred_locale: options?.data?.locale ?? "uz", created_at: now(),
        };
        store.profiles.push(p);
        t.setUid?.(p.id);
        return { data: { user: { id: p.id, email }, session: {} }, error: null };
      },
      signOut: async () => { t.setUid?.(null); return { error: null }; },
      exchangeCodeForSession: async () => ({ data: {}, error: null }),
    },
  };
}
