import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession, isStaff } from "@/lib/auth";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = await initLocale(params);
  const t = await getTranslations("admin");
  const tn = await getTranslations();
  const { user, profile } = await getSession();
  if (!user) redirect({ href: "/login?next=/admin", locale });
  if (!isStaff(profile)) redirect({ href: "/dashboard", locale });

  const items = [
    ["/admin", t("dashboard")],
    ["/admin/stats", tn("adm.stats")],
    ["/admin/submissions", t("submissions")],
    ["/admin/issues", t("issues")],
    ["/admin/articles", t("articles")],
    ["/admin/pages", t("pages")],
    ["/admin/board", tn("nav.board")],
    ["/admin/news", tn("x.news")],
    ["/admin/conferences", tn("x.conferences")],
    ["/admin/emails", tn("adm.emails")],
    ["/admin/log", tn("adm.log")],
    ["/admin/import", tn("adm.import")],
    ...(profile?.role === "admin" ? [["/admin/users", t("users")], ["/admin/settings", tn("x.settings")]] : []),
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside>
        <nav className="card sticky top-4 space-y-1 p-3">
          {items.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-700">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
