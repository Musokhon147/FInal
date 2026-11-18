import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import { isOverdue } from "@/lib/data";

type Sub = { id: string; title: string; status: string; pub_type: string | null; submitted_at: string | null; updated_at: string; profiles: { full_name: string } | null };
type Rev = { id: string; submission_id: string; due_at: string | null; status: string; profiles: { full_name: string } | null };

/** Admin home: what needs doing, each item with one button. */
export default async function AdminTodo({ params }: PageProps<"/[locale]/admin">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { supabase } = await getSession();
  const head = { count: "exact" as const, head: true };

  const [{ data: subs }, { data: revs }, articles, users] = await Promise.all([
    supabase.from("submissions")
      .select("id, title, status, pub_type, submitted_at, updated_at, profiles!submissions_submitter_id_fkey(full_name)")
      .in("status", ["submitted", "desk_review", "under_review", "revision_required", "accepted"])
      .order("updated_at", { ascending: true }),
    supabase.from("review_assignments").select("id, submission_id, due_at, status, profiles!review_assignments_reviewer_id_fkey(full_name)").in("status", ["invited", "accepted"]),
    supabase.from("articles").select("id", head).eq("status", "published").then((r) => r.count ?? 0),
    supabase.from("profiles").select("id", head).then((r) => r.count ?? 0),
  ]);
  const list = (subs ?? []) as unknown as Sub[];
  const reviews = (revs ?? []) as unknown as Rev[];
  const pendingReview = new Set(reviews.map((r) => r.submission_id));

  const groups = [
    { key: "new", title: t("pt.todoNew"), hint: t("pt.todoNewHint"), action: t("pt.actDecide"), tone: "accent",
      items: list.filter((s) => ["submitted", "desk_review"].includes(s.status) && !pendingReview.has(s.id)) },
    { key: "publish", title: t("pt.todoPublish"), hint: t("pt.todoPublishHint"), action: t("pt.actPublish"), tone: "gold",
      items: list.filter((s) => s.status === "accepted") },
    { key: "review", title: t("pt.todoReviews"), hint: t("pt.todoReviewsHint"), action: t("pt.actView"), tone: "plain",
      items: list.filter((s) => s.status === "under_review" || (["submitted", "desk_review"].includes(s.status) && pendingReview.has(s.id))) },
    { key: "author", title: t("pt.todoAuthor"), hint: t("pt.todoAuthorHint"), action: t("pt.actView"), tone: "plain",
      items: list.filter((s) => s.status === "revision_required") },
  ];
  const todo = groups[0].items.length + groups[1].items.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">{t("pt.todoTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("pt.todoLead")}</p>
      </div>
      {!todo && <p className="card text-slate-600">🎉 {t("pt.allDone")}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.key} className={`card ${g.tone === "accent" && g.items.length ? "border-brand-600/60" : g.tone === "gold" && g.items.length ? "border-accent/60" : ""}`} aria-labelledby={`todo-${g.key}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`todo-${g.key}`} className="text-lg">{g.title}</h2>
                <p className="text-xs text-slate-500">{g.hint}</p>
              </div>
              <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${g.items.length && g.tone !== "plain" ? "bg-accent text-ink" : "bg-slate-200 text-slate-600"}`}>{g.items.length}</span>
            </div>
            {g.items.length ? (
              <ul className="mt-4 divide-y divide-slate-200/70">
                {g.items.slice(0, 8).map((s) => {
                  const r = reviews.find((x) => x.submission_id === s.id);
                  const late = r?.due_at ? isOverdue(r.due_at) : false;
                  return (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{s.title}</p>
                        <p className="text-xs text-slate-500">
                          {s.profiles?.full_name}
                          {s.pub_type && s.pub_type !== "journal" && <> · {t(`pt.${s.pub_type}` as "pt.journal")}</>}
                          {g.key === "review" && r
                            ? <> · {r.profiles?.full_name} · <span className={late ? "text-red-400" : ""}>{r.due_at ? (late ? t("pt.overdue") : t("pt.due", { d: formatDate(r.due_at, locale) })) : ""}</span></>
                            : <> · {t("pt.submittedOn", { d: formatDate(s.submitted_at ?? s.updated_at, locale) })}</>}
                        </p>
                      </div>
                      <Link href={`/admin/submissions/${s.id}`} className={`shrink-0 ${g.tone === "plain" ? "btn-secondary" : g.tone === "gold" ? "btn-gold" : "btn-primary"} px-4 py-1.5 text-sm`}>
                        {g.action}
                      </Link>
                    </li>
                  );
                })}
                {g.items.length > 8 && <li className="pt-3 text-sm"><Link href="/admin/submissions" className="text-brand-700 hover:underline">+{g.items.length - 8}</Link></li>}
              </ul>
            ) : <p className="mt-4 text-sm text-slate-500">{t("pt.listEmpty")}</p>}
          </section>
        ))}
      </div>

      <section className="card flex flex-wrap items-center gap-x-8 gap-y-3" aria-label={t("pt.glance")}>
        <Link href="/admin/articles" className="hover:text-brand-700"><span className="font-serif text-2xl text-slate-900">{articles}</span> <span className="text-sm text-slate-500">{t("admin.statArticles")}</span></Link>
        <Link href="/admin/users" className="hover:text-brand-700"><span className="font-serif text-2xl text-slate-900">{users}</span> <span className="text-sm text-slate-500">{t("admin.statUsers")}</span></Link>
        <Link href="/admin/stats" className="ml-auto text-sm font-semibold text-brand-700 hover:underline">{t("pt.seeStats")} →</Link>
      </section>
    </div>
  );
}
