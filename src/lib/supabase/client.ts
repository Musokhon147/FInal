import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IS_DEMO, SUPABASE_KEY, SUPABASE_URL } from "./env";
import { createDemoClient } from "../demo/engine";

export function createClient(): SupabaseClient {
  if (IS_DEMO) {
    // Demo mode: send each operation to the server, which holds the sample data.
    return createDemoClient({
      getUid: () => null,
      run: (op) =>
        fetch("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(op),
        }).then((r) => r.json()),
    }) as unknown as SupabaseClient;
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
