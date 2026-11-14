"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReviewRec } from "@/lib/types";

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
  const { error } = await supabase
    .from("review_assignments")
    .update({
      status: "completed",
      recommendation,
      comments_to_author: String(formData.get("comments_to_author") ?? ""),
      comments_to_editor: String(formData.get("comments_to_editor") ?? ""),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
