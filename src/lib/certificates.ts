import "server-only";
import { createClient } from "./supabase/server";
import { tr } from "./i18n-field";
import type { BoardMember } from "./types";

/** Short, stable certificate number derived from the record id. */
export const certNumber = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;

export async function chiefEditorName(locale: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("editorial_board").select("full_name, position_type").eq("position_type", "chief").limit(1).maybeSingle<Pick<BoardMember, "full_name" | "position_type">>();
  return data ? tr(data.full_name, locale) : "";
}
