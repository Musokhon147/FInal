import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicFileUrl } from "@/lib/supabase/env";

// Counts the download, then sends the visitor to the PDF
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/download/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!data?.pdf_path) return new NextResponse("Not found", { status: 404 });
  await supabase.rpc("track_article", { aid: id, kind: "download" });
  return NextResponse.redirect(publicFileUrl("articles", data.pdf_path));
}
