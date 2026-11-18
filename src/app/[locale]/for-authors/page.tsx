import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { alternates } from "@/lib/site";
import { cleanHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { AUTHOR_PAGE, getJournal } from "@/lib/data";
import { tr } from "@/lib/i18n-field";
import { publicFileUrl } from "@/lib/supabase/env";
import { ARCHIVE_TABS, PUB_TYPES, tabToType } from "@/lib/pubtypes";
import type { CmsPage } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pt");
  return { title: t("forAuthorsTitle"), description: t("forAuthorsLead"), alternates: alternates(await getLocale(), "/for-authors") };
}

export default async function ForAuthorsPage({ params, searchParams }: PageProps<"/[locale]/for-authors">) {
  const locale = await initLocale(params);
  const t = await getTranslations("pt");
  const { type } = await searchParams;
  const active = tabToType(type);
  const supabase = await createClient();
  const [journal, { data: page }] = await Promise.all([
    getJournal(),
    supabase.from("pages").select("title, body").eq("slug", AUTHOR_PAGE).maybeSingle<Pick<CmsPage, "title" | "body">>(),
  ]);
  const kit = journal?.author_kits?.[active] ?? {};
  const guide = cleanHtml(tr(kit.guide ?? {}, locale));
  const general = page ? cleanHtml(tr(page.body, locale)) : "";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-light sm:text-5xl">{page ? tr(page.title, locale) || t("forAuthorsTitle") : t("forAuthorsTitle")}</h1>
      <p className="mt-4 max-w-2xl text-slate-600">{t("forAuthorsLead")}</p>

      <nav className="mt-8 grid gap-2 sm:grid-cols-3" aria-label={t("chooseType")}>
        {PUB_TYPES.map((k) => (
          <Link key={k} href={k === "journal" ? "/for-authors" : `/for-authors?type=${ARCHIVE_TABS[k]}`} scroll={false}
            aria-current={active === k ? "page" : undefined}
            className={`pub-type card block p-4 transition ${active === k ? "is-on" : ""}`}>
            <span className="block font-semibold text-slate-900">{t(k)}</span>
            <span className="mt-1 block text-xs text-slate-500">{t(k === "journal" ? "journalDesc" : k === "local_conference" ? "localDesc" : "internationalDesc")}</span>
          </Link>
        ))}
      </nav>

      <section className="card mt-6 p-6 sm:p-8" aria-labelledby="kit-h">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 id="kit-h" className="text-2xl">{t(active)}</h2>
          <div className="flex flex-wrap gap-3">
            {kit.template
              ? <a href={publicFileUrl("articles", kit.template)} className="btn-secondary" download>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="mr-1.5"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" /></svg>
                  {t("downloadSample")}
                </a>
              : <span className="self-center text-sm text-slate-500">{t("noSample")}</span>}
            <Link href={`/dashboard/submit?type=${active}`} className="btn-gold">{t("submitThis")}</Link>
          </div>
        </div>
        {guide && <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: guide }} />}
      </section>

      {general && (
        <section className="card mt-6 p-6 sm:p-8">
          {/* general guidelines: the "author-guidelines" page, edited in Admin → Pages */}
          <div className="prose-content" dangerouslySetInnerHTML={{ __html: general }} />
        </section>
      )}
    </div>
  );
}
