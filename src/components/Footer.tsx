import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getJournal, getMenuPages } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import { Logo } from "./design/StarMark";

export default async function Footer() {
  const t = await getTranslations();
  const locale = await getLocale();
  const [journal, pages] = await Promise.all([getJournal(), getMenuPages()]);
  return (
    <footer className="relative mt-24 border-t border-white/5 bg-slate-50/80 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3"><Logo url={journal?.logo_url} size={34} /><span className="font-serif text-xl text-slate-900">{tr(journal?.title, locale)}</span></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">{tr(journal?.description, locale)}</p>
        </div>
        <ul className="space-y-2 text-sm">
          <li><Link href="/archives" className="navlink">{t("nav.archives")}</Link></li>
          <li><Link href="/board" className="navlink">{t("nav.board")}</Link></li>
          <li><Link href="/news" className="navlink">{t("nav.news")}</Link></li>
          {pages.map((p) => <li key={p.id}><Link href={`/p/${p.slug}`} className="navlink">{tr(p.title, locale)}</Link></li>)}
        </ul>
        <div className="space-y-2 text-sm text-slate-500">
          {journal?.issn_online && <p>ISSN {journal.issn_online} (online)</p>}
          {journal?.publisher && <p>{journal.publisher}</p>}
          {journal?.contact_email && <p>{journal.contact_email}</p>}
          <p>{t("footer.license")}</p>
          <p>© {new Date().getFullYear()} {t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
