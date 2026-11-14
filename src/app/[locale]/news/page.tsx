import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import type { NewsItem } from "@/lib/types";
import NewsCard from "@/components/design/NewsCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("x");
  return { title: t("news") };
}

export default async function NewsPage({ params }: PageProps<"/[locale]/news">) {
  const locale = await initLocale(params);
  const t = await getTranslations("x");
  const supabase = await createClient();
  const { data } = await supabase.from("news").select("*").order("pinned", { ascending: false }).order("date", { ascending: false });
  const list = (data ?? []) as NewsItem[];
  return (
    <div>
      <h1 className="text-4xl font-light sm:text-5xl">{t("news")}</h1>
      <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((n) => <NewsCard key={n.id} item={n} locale={locale} />)}</ul>
    </div>
  );
}
