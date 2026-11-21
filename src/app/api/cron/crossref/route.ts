import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkDeposits, crossrefConfigured } from "@/lib/crossref";

// Runs once a day (vercel.json): reads Crossref's results for files sent earlier,
// so each article shows "Registered" or the reason it failed.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!crossrefConfigured()) return NextResponse.json({ skipped: "crossref not connected" });
  const db = createAdminClient();
  if (!db) return NextResponse.json({ skipped: "no service key" });
  return NextResponse.json(await checkDeposits(db));
}
