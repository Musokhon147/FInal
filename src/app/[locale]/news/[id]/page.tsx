import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { formatDate, tr } from "@/lib/i18n-field";
import type { NewsItem } from "@/lib/types";

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("news").select("*").eq("id", id).maybeSingle<NewsItem>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[id]">): Promise<Metadata> {
  const { id } = await params;
  const n = await load(id);
  return n ? { title: tr(n.title, await getLocale()) } : {};
}

export default async function NewsItemPage({ params }: PageProps<"/[locale]/news/[id]">) {
  const locale = await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const n = await load(id);
  if (!n) notFound();
  return (
    <article className="card mx-auto max-w-3xl p-8 sm:p-12">
      <Link href="/news" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <p className="mt-6 text-sm text-slate-500">{formatDate(n.date, locale)}</p>
      <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{tr(n.title, locale)}</h1>
      {/* written by staff in the admin panel */}
      <div className="prose-content mt-6 text-[1.05rem]" dangerouslySetInnerHTML={{ __html: tr(n.body, locale) }} />
    </article>
  );
}
