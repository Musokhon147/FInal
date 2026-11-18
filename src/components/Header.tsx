import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession, isStaff } from "@/lib/auth";
import { AUTHOR_PAGE, getJournal, getMenuPages, pageHref } from "@/lib/data";
import { formatDate, tr } from "@/lib/i18n-field";
import type { Notification } from "@/lib/types";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./fx/ThemeToggle";
import FxToggle from "./fx/FxToggle";
import CurrentMenu from "./CurrentMenu";
import AccountMenu from "./AccountMenu";
import NotificationBell, { type BellItem } from "./fx/NotificationBell";
import { Logo } from "./design/StarMark";
import { logout } from "@/app/[locale]/(auth)/actions";

export default async function Header() {
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ supabase, user, profile }, journal, pages] = await Promise.all([getSession(), getJournal(), getMenuPages()]);

  let bell: BellItem[] = [];
  if (user) {
    const { data } = await supabase
      .from("notifications")
      .select("*, submissions(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    bell = ((data ?? []) as (Notification & { submissions: { title: string } | null })[]).map((n) => {
      const title = n.submissions?.title ?? "";
      const short = title.length > 60 ? title.slice(0, 57) + "…" : title;
      return {
        id: n.id, link: n.link, read: n.read, date: formatDate(n.created_at, locale),
        text: t(`x.n_${n.type}`, { title: short, status: n.status ? t(`status.${n.status}`) : "" }),
      };
    });
  }

  const name = tr(journal?.title, locale) || "Journal";
  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-white/5 bg-slate-50/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 xl:shrink-0">
          <span className="shrink-0"><Logo url={journal?.logo_url} size={30} /></span>
          <span className="truncate font-serif text-base tracking-tight text-slate-900 max-[379px]:sr-only sm:text-lg xl:max-[1599px]:sr-only">{name}</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-4 whitespace-nowrap text-sm xl:flex 2xl:gap-5" aria-label="Main">
          <CurrentMenu label={t("nav.current")} items={[
            { href: "/current", label: t("pt.currentJournal") },
            { href: "/current/conferences", label: t("pt.currentConference") },
          ]} />
          <Link href="/archives" className="navlink">{t("nav.archives")}</Link>
          <Link href="/board" className="navlink">{t("nav.board")}</Link>
          <Link href="/news" className="navlink">{t("nav.news")}</Link>
          <Link href="/conferences" className="navlink">{t("nav.conferences")}</Link>
          <Link href="/for-authors" className="navlink">{t("pt.forAuthorsTitle")}</Link>
          {(() => {
            // "About the journal" and the other pages the editors put in the menu
            const menu = pages.filter((p) => p.slug !== AUTHOR_PAGE);
            const about = menu.find((p) => p.slug === "about") ?? menu[0];
            if (!about) return null;
            return menu.length > 1
              ? <CurrentMenu label={tr(about.title, locale)} items={menu.map((p) => ({ href: pageHref(p.slug), label: tr(p.title, locale) }))} />
              : <Link href={pageHref(about.slug)} className="navlink">{tr(about.title, locale)}</Link>;
          })()}
          <Link href="/search" className="navlink" aria-label={t("nav.search")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-3">
          {user && <NotificationBell items={bell} />}
          <FxToggle />
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <AccountMenu name={profile?.full_name || user.email || ""} staff={isStaff(profile)} logout={logout}
              labels={{ account: t("pt.account"), dashboard: t("nav.dashboard"), admin: t("nav.admin"), logout: t("nav.logout") }} />
          ) : (
            <Link href="/login" className="navlink text-sm">{t("nav.login")}</Link>
          )}
          <Link href="/dashboard/submit" className="btn-gold hidden sm:inline-flex">{t("nav.submit")}</Link>
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto whitespace-nowrap border-t border-white/5 px-5 py-2 text-sm xl:hidden" aria-label="Main mobile">
        <Link href="/current" className="navlink shrink-0">{t("pt.currentJournal")}</Link>
        <Link href="/current/conferences" className="navlink shrink-0">{t("pt.currentConference")}</Link>
        <Link href="/archives" className="navlink shrink-0">{t("nav.archives")}</Link>
        <Link href="/board" className="navlink shrink-0">{t("nav.board")}</Link>
        <Link href="/news" className="navlink shrink-0">{t("nav.news")}</Link>
        <Link href="/conferences" className="navlink shrink-0">{t("nav.conferences")}</Link>
        <Link href="/for-authors" className="navlink shrink-0">{t("pt.forAuthorsTitle")}</Link>
        {pages.filter((p) => p.slug !== AUTHOR_PAGE).map((p) => <Link key={p.id} href={pageHref(p.slug)} className="navlink shrink-0">{tr(p.title, locale)}</Link>)}
        <Link href="/search" className="navlink shrink-0">{t("nav.search")}</Link>
        <Link href="/dashboard/submit" className="shrink-0 font-semibold text-accent">{t("nav.submit")}</Link>
      </nav>
    </header>
  );
}
