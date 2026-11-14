import { NextResponse, type NextRequest } from "next/server";
import { getSession, isStaff } from "@/lib/auth";

// Staff only: all manuscripts with their dates and outcome, as CSV for Excel.
export async function GET(req: NextRequest) {
  const { user, profile, supabase } = await getSession();
  if (!user || !isStaff(profile)) return new NextResponse("Forbidden", { status: 403 });
  const all = req.nextUrl.searchParams.get("p") === "all";
  const [{ data: subs }, { data: events }, { data: authors }] = await Promise.all([
    supabase.from("submissions").select("id, title, status, language, submitted_at, created_at, similarity_percent").neq("status", "draft"),
    supabase.from("submission_events").select("submission_id, to_status, created_at"),
    supabase.from("submission_authors").select("submission_id, full_name, affiliation, sort_order"),
  ]);
  const since = all ? 0 : Date.now() - 365 * 86_400_000;
  type S = { id: string; title: string; status: string; language: string; submitted_at: string | null; created_at: string; similarity_percent: number | null };
  type E = { submission_id: string; to_status: string | null; created_at: string };
  type Au = { submission_id: string; full_name: string; affiliation: string | null; sort_order: number };
  const ev = ((events ?? []) as E[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const cell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = ((subs ?? []) as S[])
    .filter((s) => Date.parse(s.submitted_at || s.created_at) >= since)
    .map((s) => {
      const sent = s.submitted_at || s.created_at;
      const dec = ev.find((e) => e.submission_id === s.id && ["accepted", "rejected", "revision_required", "published"].includes(e.to_status ?? ""));
      const au = ((authors ?? []) as Au[]).filter((a) => a.submission_id === s.id).sort((a, b) => a.sort_order - b.sort_order);
      return [s.id, s.title, au.map((a) => a.full_name).join("; "), au.map((a) => a.affiliation).filter(Boolean).join("; "), s.language, s.status,
        sent.slice(0, 10), dec?.created_at.slice(0, 10) ?? "", dec ? Math.round((Date.parse(dec.created_at) - Date.parse(sent)) / 86_400_000) : "", s.similarity_percent ?? ""];
    });
  const head = ["id", "title", "authors", "affiliations", "language", "status", "submitted", "first_decision", "days_to_decision", "similarity_percent"];
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"); // BOM so Excel reads Cyrillic correctly
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
