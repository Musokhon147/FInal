import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";

export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  await initLocale(params);
  const t = await getTranslations("admin");
  const { supabase } = await getSession();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const head = { count: "exact" as const, head: true };

  const [fresh, review, accepted, articles, users] = await Promise.all([
    count(supabase.from("submissions").select("id", head).in("status", ["submitted", "desk_review"])),
    count(supabase.from("submissions").select("id", head).in("status", ["under_review", "revision_required"])),
    count(supabase.from("submissions").select("id", head).eq("status", "accepted")),
    count(supabase.from("articles").select("id", head).eq("status", "published")),
    count(supabase.from("profiles").select("id", head)),
  ]);

  const stats = [
    [t("statNew"), fresh, "/admin/submissions?status=submitted"],
    [t("statReview"), review, "/admin/submissions?status=under_review"],
    [t("statAccepted"), accepted, "/admin/submissions?status=accepted"],
    [t("statArticles"), articles, "/admin/articles"],
    [t("statUsers"), users, "/admin/users"],
  ] as const;

  return (
    <div>
      <h1 className="mb-6 text-3xl">{t("dashboard")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, n, href]) => (
          <Link key={label} href={href} className="card hover:border-brand-600">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 font-serif text-4xl text-slate-900">{n}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
