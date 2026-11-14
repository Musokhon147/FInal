import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { tr } from "@/lib/i18n-field";
import { OG_SIZE, OgCard, ogFonts } from "@/lib/og";
import type { Journal } from "@/lib/types";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Journal";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase.from("journals").select("*").eq("is_active", true).order("sort_order").limit(1).maybeSingle<Journal>();
  const name = tr(data?.title, locale) || "Journal";
  return new ImageResponse(
    <OgCard kicker={data?.issn_online ? `ISSN ${data.issn_online}` : "Open access"} title={name} footer={tr(data?.description, locale).slice(0, 110)} />,
    { ...size, fonts: await ogFonts() },
  );
}
