import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession, isStaff } from "@/lib/auth";
import { getJournal, getMenuPages } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import LanguageSwitcher from "./LanguageSwitcher";
import { logout } from "@/app/[locale]/(auth)/actions";

export default async function Header() {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const [{ user, profile }, journal, pages] = await Promise.all([
    getSession(),
    getJournal(),
    getMenuPages(),
  ]);

  return (
    <header className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-sm">
        <div className="hidden text-white/70 sm:block">
          {journal?.issn_online && <>ISSN {journal.issn_online}</>}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {isStaff(profile) && (
                <Link href="/admin" className="hover:underline">
                  {t("admin")}
                </Link>
              )}
              <Link href="/dashboard" className="hover:underline">
                {t("dashboard")}
              </Link>
              <form action={logout}>
                <button className="hover:underline">{t("logout")}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                {t("login")}
              </Link>
              <Link href="/register" className="hover:underline">
                {t("register")}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
            {tr(journal?.title, locale) || "Journal"}
          </Link>
          <Link href="/dashboard/submit" className="btn bg-accent text-white hover:opacity-90">
            {t("submit")}
          </Link>
        </div>
      </div>
      <nav className="bg-brand-700">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-4 py-2 text-sm">
          <li><Link href="/" className="hover:underline">{t("home")}</Link></li>
          <li><Link href="/current" className="hover:underline">{t("current")}</Link></li>
          <li><Link href="/archives" className="hover:underline">{t("archives")}</Link></li>
          <li><Link href="/board" className="hover:underline">{t("board")}</Link></li>
          {pages.map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.slug}`} className="hover:underline">
                {tr(p.title, locale)}
              </Link>
            </li>
          ))}
          <li className="ml-auto"><Link href="/search" className="hover:underline">{t("search")}</Link></li>
        </ul>
      </nav>
    </header>
  );
}
