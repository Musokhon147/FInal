import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import AdminNav from "./AdminNav";
import { initLocale } from "@/lib/locale";
import { getSession, isStaff } from "@/lib/auth";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = await initLocale(params);
  const t = await getTranslations("admin");
  const tn = await getTranslations();
  const { user, profile } = await getSession();
  if (!user) redirect({ href: "/login?next=/admin", locale });
  if (!isStaff(profile)) redirect({ href: "/dashboard", locale });

  // items waiting for the editor (new + accepted), shown on "To do"
  const { supabase } = await getSession();
  const { count: waiting } = await supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "desk_review", "accepted"]);
  const admin = profile?.role === "admin";
  const groups = [
    { title: tn("pt.gWork"), items: [
      { href: "/admin", label: tn("pt.todoTitle"), badge: waiting ?? 0 },
      { href: "/admin/submissions", label: t("submissions") },
      { href: "/admin/issues", label: t("issues") },
      { href: "/admin/articles", label: t("articles") },
    ] },
    { title: tn("pt.gSite"), items: [
      { href: "/admin/news", label: tn("x.news") },
      { href: "/admin/pages", label: tn("pt.pagesMenu") },
      { href: "/admin/board", label: tn("nav.board") },
      { href: "/admin/conferences", label: tn("x.conferences") },
      { href: "/admin/for-authors", label: tn("pt.forAuthorsAdmin") },
    ] },
    { title: tn("pt.gSettings"), items: [
      ...(admin ? [{ href: "/admin/settings", label: tn("x.settings") }, { href: "/admin/users", label: t("users") }] : []),
      { href: "/admin/emails", label: tn("adm.emails") },
    ] },
    { title: tn("pt.gTools"), folded: true, items: [
      { href: "/admin/stats", label: tn("adm.stats") },
      { href: "/admin/log", label: tn("adm.log") },
      { href: "/admin/import", label: tn("adm.import") },
    ] },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[230px_1fr]">
      <aside>
        <AdminNav groups={groups} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
