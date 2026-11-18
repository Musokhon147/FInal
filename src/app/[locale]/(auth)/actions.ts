"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string } | undefined;

/** Where the confirmation email link sends people: the callback finishes the login, then opens the dashboard. */
async function confirmRedirect(locale: string) {
  const origin = (await headers()).get("origin") ?? "";
  return `${origin}/api/auth/callback?next=/${locale}/dashboard`;
}

function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  // only allow local paths, and strip the locale prefix (redirect() adds it back)
  if (!v.startsWith("/") || v.startsWith("//")) return "/dashboard";
  return v.replace(/^\/(uz|ru|en)(?=\/|$)/, "") || "/dashboard";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) return error.code === "email_not_confirmed" ? { error: "unconfirmed", email } : { error: "invalid" };
  const locale = await getLocale();
  redirect({ href: safeNext(formData.get("next")), locale });
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const locale = await getLocale();
  const email = String(formData.get("email") ?? "").trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: String(formData.get("password") ?? ""),
    options: {
      emailRedirectTo: await confirmRedirect(locale),
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
  return { message: "checkEmail", email };
}

/** Sends the sign-up confirmation email again. */
export async function resendConfirmation(email: string): Promise<{ ok: boolean }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup", email, options: { emailRedirectTo: await confirmRedirect(await getLocale()) },
  });
  return { ok: !error };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/", locale });
}
