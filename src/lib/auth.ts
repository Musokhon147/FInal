import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/** Current user + profile, cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return { supabase, user, profile };
});

export function isStaff(profile: Profile | null) {
  return profile?.role === "editor" || profile?.role === "admin";
}
