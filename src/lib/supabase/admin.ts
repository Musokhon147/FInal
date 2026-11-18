import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IS_DEMO, SUPABASE_URL } from "./env";

/**
 * Server-only client with the service key: used for background jobs (journal emails, reminders)
 * that must read data the signed-in user cannot (e.g. the reviewer's email). Never sent to the browser.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (IS_DEMO || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
