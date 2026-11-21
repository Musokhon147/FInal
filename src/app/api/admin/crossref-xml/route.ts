import { NextResponse, type NextRequest } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { buildDepositXml, DEPOSIT_SELECT, JOURNAL_SELECT, notReady, type DepositArticle, type DepositJournal } from "@/lib/crossref";

// Staff only: the Crossref deposit file for published articles with this journal's DOIs.
// Used to check the data, or to upload it by hand in Crossref's web deposit form.
// ?ids=a,b,c for some articles; default: all that are ready.
export async function GET(req: NextRequest) {
  const { user, profile, supabase } = await getSession();
  if (!user || !isStaff(profile)) return new NextResponse("Forbidden", { status: 403 });
  const { data: j } = await supabase.from("journals").select(JOURNAL_SELECT).eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  const journal = j as DepositJournal | null;
  if (!journal?.doi_prefix) return new NextResponse("Set the DOI prefix in Settings first.", { status: 400 });

  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean).slice(0, 500);
  let q = supabase.from("articles").select(DEPOSIT_SELECT).eq("status", "published");
  if (ids?.length) q = q.in("id", ids);
  const { data } = await q.limit(1000);
  const ready = ((data ?? []) as unknown as DepositArticle[]).filter((a) => !notReady(a, journal));
  if (!ready.length) return new NextResponse("No published articles with this journal's DOIs yet.", { status: 404 });

  const fileName = `${journal.slug}-${Date.now()}.xml`;
  return new NextResponse(buildDepositXml(journal, ready, fileName), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}
