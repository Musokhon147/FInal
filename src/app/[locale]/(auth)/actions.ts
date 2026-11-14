"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  // only allow local paths, and strip the locale prefix (redirect() adds it back)
  if (!v.startsWith("/") || v.startsWith("//")) return "/dashboard";
  return v.replace(/^\/(uz|ru|en)(?=\/|$)/, "") || "/dashboard";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "invalid" };
  const locale = await getLocale();
  redirect({ href: safeNext(formData.get("next")), locale });
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const locale = await getLocale();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?next=/${locale}/dashboard`,
      data: {
        full_name: String(formData.get("full_name") ?? ""),
        affiliation: String(formData.get("affiliation") ?? ""),
        locale,
      },
    },
  });
  if (error) return { error: error.message };
  // If email confirmation is off in Supabase, the user is signed in immediately.
  if (data.session) redirect({ href: "/dashboard", locale });
  return { message: "checkEmail" };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/", locale });
}
