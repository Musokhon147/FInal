import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { IS_DEMO, SUPABASE_KEY, SUPABASE_URL } from "./env";
import { createDemoClient, execute } from "../demo/engine";

/** Read-only client without a user session — for the sitemap and share images. */
export function createPublicClient(): SupabaseClient {
  if (IS_DEMO) {
    return createDemoClient({ getUid: () => null, run: async (op) => execute(op, null) }) as unknown as SupabaseClient;
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}
