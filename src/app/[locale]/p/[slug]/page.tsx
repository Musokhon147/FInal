import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { permanentRedirect } from "@/i18n/navigation";
import { AUTHOR_PAGE } from "@/lib/data";
import { alternates } from "@/lib/site";
import { cleanHtml } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n-field";
import type { CmsPage } from "@/lib/types";

async function load(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle<CmsPage>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  const locale = await getLocale();
  return page ? { title: tr(page.title, locale), alternates: alternates(locale, `/p/${slug}`) } : {};
}

export default async function StaticPage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const locale = await initLocale(params);
  const { slug } = await params;
  if (slug === AUTHOR_PAGE) permanentRedirect({ href: "/for-authors", locale });
  const page = await load(slug);
  if (!page) notFound();

  return (
    <article className="card mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl">{tr(page.title, locale)}</h1>
      {/* Page HTML is written by staff in the admin panel */}
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: cleanHtml(tr(page.body, locale)) }} />
    </article>
  );
}
