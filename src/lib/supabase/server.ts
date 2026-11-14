import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { IS_DEMO, SUPABASE_KEY, SUPABASE_URL } from "./env";
import { createDemoClient, DEMO_COOKIE, execute } from "../demo/engine";

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  if (IS_DEMO) {
    return createDemoClient({
      getUid: () => cookieStore.get(DEMO_COOKIE)?.value,
      setUid: (uid) => {
        try {
          if (uid) cookieStore.set(DEMO_COOKIE, uid, { path: "/", sameSite: "lax" });
          else cookieStore.delete(DEMO_COOKIE);
        } catch {
          // read-only in Server Components
        }
      },
      run: async (op) => execute(op, cookieStore.get(DEMO_COOKIE)?.value ?? null),
    }) as unknown as SupabaseClient;
  }

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  });
}
