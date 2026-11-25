"use server";

import { revalidatePath } from "next/cache";
import { getSession, isStaff } from "@/lib/auth";
import { assignDois, checkDeposits, crossrefConfigured, registerDois } from "@/lib/crossref";
import { registerZenodo, zenodoConfigured } from "@/lib/zenodo";
import { isDoi } from "@/lib/identifiers";

async function staff() {
  const s = await getSession();
  if (!s.user || !isStaff(s.profile)) throw new Error("Forbidden");
  return s;
}
const done = () => revalidatePath("/[locale]/admin/indexing", "page");

type Lite = { id: string; doi: string | null; doi_status: string };
async function published(db: Awaited<ReturnType<typeof staff>>["supabase"]) {
  const { data } = await db.from("articles").select("id, doi, doi_status").eq("status", "published").limit(5000);
  return (data ?? []) as Lite[];
}

/** Gives every published article without a DOI its DOI (prefix from Settings). */
export async function giveMissingDois() {
  const { supabase } = await staff();
  const { data: j } = await supabase.from("journals").select("doi_prefix").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  if (!j?.doi_prefix) return { error: "no-prefix" as const };
  const ids = (await published(supabase)).filter((a) => !a.doi).map((a) => a.id);
  const n = await assignDois(supabase, ids);
  done();
  return { count: n };
}

/** "Send to Crossref": the articles not registered yet (or every article with a DOI, to update all details). */
export async function sendToCrossref(mode: "waiting" | "all" | string[] = "waiting") {
  const { supabase, user } = await staff();
  if (!crossrefConfigured()) return { error: "not-configured" as const };
  const list = await published(supabase);
  const ids = Array.isArray(mode)
    ? mode
    : list.filter((a) => isDoi(a.doi) && (mode === "all" || ["none", "failed"].includes(a.doi_status))).map((a) => a.id);
  if (!ids.length) return { error: "nothing-ready" as const };
  // Crossref takes files up to a few MB: send in chunks of 100 articles
  let sent = 0, error: string | undefined;
  for (let i = 0; i < ids.length; i += 100) {
    const r = await registerDois(supabase, ids.slice(i, i + 100), user?.id);
    sent += r.sent;
    if (r.error && r.error !== "nothing-ready") error = r.error;
  }
  done();
  return error && !sent ? { error } : { sent };
}

/** "Get DOIs from Zenodo": every published article with a PDF and no DOI yet (or a failed try). */
export async function sendToZenodo() {
  const { supabase } = await staff();
  const { data: j } = await supabase.from("journals").select("doi_provider").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
  if (j?.doi_provider !== "zenodo") return { error: "not-zenodo" as const, sent: 0, failed: 0 };
  if (!zenodoConfigured()) return { error: "not-configured" as const, sent: 0, failed: 0 };
  const { data } = await supabase.from("articles").select("id, doi, doi_status, pdf_path").eq("status", "published").limit(5000);
  const ids = ((data ?? []) as { id: string; doi: string | null; doi_status: string; pdf_path: string | null }[])
    .filter((a) => a.pdf_path && (!a.doi || a.doi_status === "failed")).map((a) => a.id);
  if (!ids.length) return { error: "nothing-ready" as const, sent: 0, failed: 0 };
  const r = await registerZenodo(supabase, ids);
  done();
  return r;
}

/** Asks Crossref for the results of files still waiting. */
export async function checkCrossref() {
  const { supabase } = await staff();
  const r = await checkDeposits(supabase);
  done();
  return r;
}
