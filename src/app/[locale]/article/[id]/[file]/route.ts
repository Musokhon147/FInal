import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { publicFileUrl } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";

/**
 * The article's full text at /{locale}/article/{id}/full-text.pdf — under the article page itself,
 * as Google Scholar requires (citation_pdf_url must be in the same directory as the abstract page).
 * The file is streamed from storage, so large PDFs are fine.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/[locale]/article/[id]/[file]">) {
  const { locale, id, file } = await ctx.params;
  if (!(routing.locales as readonly string[]).includes(locale) || !/\.pdf$/i.test(file)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const supabase = createPublicClient();
  const { data: a } = await supabase.from("articles").select("pdf_path, status").eq("id", id).maybeSingle();
  if (!a?.pdf_path || a.status !== "published") return new NextResponse("Not found", { status: 404 });

  const src = publicFileUrl("articles", a.pdf_path);
  const upstream = await fetch(src.startsWith("/") ? new URL(src, req.nextUrl.origin) : src);
  if (!upstream.ok || !upstream.body) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers({
    "content-type": "application/pdf",
    "content-disposition": `inline; filename="${file.replace(/[^\w.-]/g, "_")}"`,
    "cache-control": "public, max-age=3600, s-maxage=86400",
    "x-robots-tag": "index",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("content-length", len);
  return new Response(upstream.body, { headers });
}
