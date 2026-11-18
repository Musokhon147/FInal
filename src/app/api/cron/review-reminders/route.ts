import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendJournalEmail } from "@/lib/email";

// Runs once a day (vercel.json): reminds reviewers whose review is due in 3 days.
// Vercel sends "Authorization: Bearer $CRON_SECRET" with scheduled calls.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ skipped: "no service key" });

  const day = 86_400_000, now = Date.now();
  const { data: due } = await db.from("review_assignments")
    .select("id, submission_id")
    .in("status", ["invited", "accepted"])
    .gte("due_at", new Date(now + 2 * day).toISOString())
    .lt("due_at", new Date(now + 3 * day).toISOString());

  const results: Record<string, number> = { sent: 0, failed: 0, skipped: 0 };
  for (const r of due ?? []) {
    // one reminder per review
    const { count } = await db.from("email_log").select("id", { count: "exact", head: true })
      .eq("key", "review_reminder").eq("review_id", r.id).eq("status", "sent");
    if (count) { results.skipped++; continue; }
    results[await sendJournalEmail("review_reminder", { submissionId: r.submission_id, reviewId: r.id })]++;
  }
  return NextResponse.json({ checked: due?.length ?? 0, ...results });
}
