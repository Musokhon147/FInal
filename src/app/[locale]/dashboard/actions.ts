"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sendJournalEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { SCORE_KEYS, type ReviewRec } from "@/lib/types";

export async function withdrawSubmission(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ status: "withdrawn" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/dashboard", "layout");
}

export async function respondToInvite(reviewId: string, accept: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("review_assignments")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", reviewId);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/dashboard", "layout");
}

export type ReviewState = { ok?: boolean; error?: string } | undefined;

export async function submitReview(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const recommendation = String(formData.get("recommendation")) as ReviewRec;
  if (!["accept", "minor_revision", "major_revision", "reject"].includes(recommendation)) {
    return { error: "recommendation" };
  }
  const scores: Record<string, number> = {};
  for (const k of SCORE_KEYS) {
    const v = Number(formData.get(`score_${k}`));
    if (v >= 1 && v <= 5) scores[k] = v;
  }
  const { error } = await supabase
    .from("review_assignments")
    .update({
      status: "completed",
      scores,
      recommendation,
      comments_to_author: String(formData.get("comments_to_author") ?? ""),
      comments_to_editor: String(formData.get("comments_to_editor") ?? ""),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}

/** After an author submits (or resubmits) a manuscript: the "we received it" email. Checks it really is theirs and submitted. */
export async function notifySubmitted(submissionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: s } = await supabase.from("submissions").select("submitter_id, status").eq("id", submissionId).maybeSingle();
  if (!s || s.submitter_id !== user.id || s.status !== "submitted") return;
  after(() => sendJournalEmail("submission_received", { submissionId }));
}
