import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { CmsPage, Journal } from "./types";

export const getJournal = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journals")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle<Journal>();
  return data;
});

export const getMenuPages = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, slug, title, sort_order")
    .eq("show_in_menu", true)
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as Pick<CmsPage, "id" | "slug" | "title" | "sort_order">[];
});

export function pagesRange(first: number | null, last: number | null) {
  if (!first) return "";
  return last && last !== first ? `${first}–${last}` : String(first);
}
