import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { tr, trExact } from "@/lib/i18n-field";
import { OG_SIZE, OgCard, ogFonts } from "@/lib/og";
import type { Article, Journal } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Article";

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = createPublicClient();
  const [{ data: a }, { data: j }] = await Promise.all([
    supabase.from("articles").select("title, title_i18n, authors, status").eq("id", id).maybeSingle<Pick<Article, "title" | "title_i18n" | "authors" | "status">>(),
    supabase.from("journals").select("title").eq("is_active", true).order("sort_order").limit(1).maybeSingle<Pick<Journal, "title">>(),
  ]);
  const title = a && a.status === "published" ? trExact(a.title_i18n, locale) || a.title : tr(j?.title, locale);
  const authors = a?.authors?.map((x) => x.name).join(", ") ?? "";
  return new ImageResponse(
    <OgCard kicker={tr(j?.title, locale)} title={title} footer={authors.length > 90 ? authors.slice(0, 87) + "…" : authors} />,
    { ...size, fonts: await ogFonts() },
  );
}
