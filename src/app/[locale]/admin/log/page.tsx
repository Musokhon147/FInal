import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";

const TYPES = ["submissions", "review_assignments", "articles", "issues", "volumes", "profiles", "journals", "pages", "news", "editorial_board", "conferences", "email_templates"] as const;
const PAGE = 40;

type Row = { id: number; actor_id: string | null; action: "insert" | "update" | "delete"; entity: string; entity_id: string | null; label: string | null; changes: Record<string, { from?: unknown; to?: unknown }>; created_at: string };

function hrefFor(r: Row): string | null {
  if (r.action === "delete") return null;
  const id = r.entity_id;
  switch (r.entity) {
    case "submissions": return `/admin/submissions/${id}`;
    case "articles": return `/admin/articles/${id}`;
    case "issues": case "volumes": return "/admin/issues";
    case "news": return `/admin/news/${id}`;
    case "conferences": return `/admin/conferences/${id}`;
    case "pages": return `/admin/pages/${id}`;
    case "editorial_board": return `/admin/board/${id}`;
    case "profiles": return "/admin/users";
    case "journals": return "/admin/settings";
    case "email_templates": return `/admin/emails/${r.label}`;
    default: return null;
  }
}

export default async function LogPage({ params, searchParams }: PageProps<"/[locale]/admin/log">) {
  const locale = await initLocale(params);
  const t = await getTranslations("adm");
  const tx = await getTranslations();
  const sp = await searchParams;
  const type = typeof sp.type === "string" && (TYPES as readonly string[]).includes(sp.type) ? sp.type : null;
  const n = Math.min(Math.max(Number(sp.n) || PAGE, PAGE), 1000);
  const { supabase } = await getSession();

  let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(n + 1);
  if (type) q = q.eq("entity", type);
  const [{ data }, { data: people }] = await Promise.all([q, supabase.from("profiles").select("id, full_name, email")]);
  const rows = (data ?? []) as Row[];
  const more = rows.length > n;
  const who = new Map(((people ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p.full_name || p.email || "—"]));
  const fmt = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn-UZ" : locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const value = (k: string, v: unknown) => {
    if (v === null || v === undefined || v === "") return "∅";
    if (k === "status" && typeof v === "string" && tx.has(`status.${v}` as "status.draft")) return tx(`status.${v}` as "status.draft");
    if (k === "role" && typeof v === "string" && tx.has(`admin.roles_${v}` as "admin.roles_user")) return tx(`admin.roles_${v}` as "admin.roles_user");
    if (typeof v === "boolean") return v ? "✓" : "✗";
    return String(v);
  };
  const href = (x: { type?: string | null; n?: number }) => {
    const p = new URLSearchParams();
    if (x.type) p.set("type", x.type);
    if (x.n && x.n > PAGE) p.set("n", String(x.n));
    const s = p.toString();
    return `/admin/log${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-3xl">{t("log")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("logIntro")}</p>
      <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label={t("allTypes")}>
        {[null, ...TYPES].map((k) => (
          <Link key={k ?? "all"} href={href({ type: k })} aria-current={type === k ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${type === k ? "border-slate-900 bg-slate-900 text-slate-50" : "border-slate-200 text-slate-600 hover:text-slate-900"}`}>
            {k ? t(`t_${k}`) : t("allTypes")}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? <p className="card mt-6 p-6 text-slate-500">{t("logEmpty")}</p> : (
        <ol className="card mt-6 divide-y divide-slate-200 p-0">
          {rows.slice(0, n).map((r) => {
            const link = hrefFor(r);
            const changes = Object.entries(r.changes ?? {});
            return (
              <li key={r.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[170px_1fr]">
                <time dateTime={r.created_at} className="text-xs tabular-nums text-slate-500 sm:pt-0.5">{fmt.format(new Date(r.created_at))}</time>
                <div className="min-w-0 text-sm">
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">{r.actor_id ? who.get(r.actor_id) ?? "—" : t("system")}</span>{" "}
                    {t(`a_${r.action}`)}{" "}
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{tx.has(`adm.t_${r.entity}` as "adm.t_news") ? t(`t_${r.entity}` as "t_news") : r.entity}</span>{" "}
                    {link ? <Link href={link} className="font-medium text-brand-700 hover:underline">{r.label || r.entity_id}</Link> : <span className="font-medium text-slate-900">{r.label || r.entity_id}</span>}
                  </p>
                  {changes.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {changes.slice(0, 6).map(([k, c]) => (
                        <li key={k}>
                          <code className="text-slate-600">{k}</code>
                          {"to" in c ? <>: {value(k, c.from)} <span aria-hidden="true">→</span><span className="sr-only">→</span> <span className="text-slate-700">{value(k, c.to)}</span></> : null}
                        </li>
                      ))}
                      {changes.length > 6 && <li>+{changes.length - 6}</li>}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {more && <div className="mt-4 text-center"><Link href={href({ type, n: n + PAGE })} scroll={false} className="btn-secondary">{t("loadMore")}</Link></div>}
    </div>
  );
}
