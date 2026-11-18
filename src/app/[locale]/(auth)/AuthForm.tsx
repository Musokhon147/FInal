"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IS_DEMO } from "@/lib/supabase/env";
import type { AuthState } from "./actions";
import CheckEmail from "./CheckEmail";

type Props = {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  notice?: "confirmed" | "expired";
};

export default function AuthForm({ mode, action, next, notice }: Props) {
  const t = useTranslations("auth");
  const td = useTranslations("demo");
  const [state, formAction, pending] = useActionState(action, undefined);
  const [dismissed, setDismissed] = useState<AuthState>(undefined); // "use a different email" goes back to the form
  const [resendFor, setResendFor] = useState<string | null>(null);

  const errorText =
    state?.error === "invalid" ? t("invalid") : state?.error === "unconfirmed" ? t("unconfirmed") : state?.error;

  // after signing up (or asking to resend from the login form): the "check your inbox" screen
  const checkEmail = (state?.message === "checkEmail" && state !== dismissed && state.email) || resendFor;
  if (checkEmail) {
    return (
      <div className="mx-auto max-w-md card p-8 sm:p-10">
        <CheckEmail email={checkEmail} delay={resendFor ? 0 : 60} onBack={() => { setDismissed(state); setResendFor(null); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
      {notice && !state && (
        <p className={`mb-5 rounded-xl px-4 py-3 text-sm ${notice === "confirmed" ? "bg-accent/15 text-accent" : "bg-red-500/10 text-red-400"}`} role="status">
          {notice === "confirmed" ? `✓ ${t("confirmed")}` : t("linkExpired")}
        </p>
      )}
      {(
        <form action={formAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          {mode === "register" && (
            <>
              <div>
                <label className="label" htmlFor="full_name">{t("fullName")}</label>
                <input className="input" id="full_name" name="full_name" required />
              </div>
              <div>
                <label className="label" htmlFor="affiliation">{t("affiliation")}</label>
                <input className="input" id="affiliation" name="affiliation" />
              </div>
            </>
          )}
          <div>
            <label className="label" htmlFor="email">{t("email")}</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">{t("password")}</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && <p className="mt-1 text-xs text-slate-500">{t("passwordHint")}</p>}
          </div>
          {errorText && (
            <p className="text-sm text-red-400" role="alert">
              {errorText}
              {state?.error === "unconfirmed" && state.email && (
                <button type="button" onClick={() => setResendFor(state.email!)} className="ml-1 font-semibold underline">{t("resend")}</button>
              )}
            </p>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </button>
        </form>
      )}
      {IS_DEMO && mode === "login" && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <p className="mb-3 text-sm font-medium text-accent">{td("accounts")}</p>
          <div className="grid gap-2">
            {(
              [
                ["admin@demo.uz", "admin"],
                ["author@demo.uz", "author"],
                ["reviewer@demo.uz", "reviewer"],
              ] as const
            ).map(([email, role]) => (
              <form key={email} action={formAction}>
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="password" value="demo" />
                {next && <input type="hidden" name="next" value={next} />}
                <button className="btn-secondary w-full justify-between" disabled={pending}>
                  <span>{td("as", { role: td(role) })}</span>
                  <span className="text-xs text-slate-500">{email}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        {mode === "login" ? (
          <>
            {t("noAccount")} <Link href="/register" className="text-brand-600 underline">{t("registerTitle")}</Link>
          </>
        ) : (
          <>
            {t("haveAccount")} <Link href="/login" className="text-brand-600 underline">{t("loginTitle")}</Link>
          </>
        )}
      </p>
    </div>
  );
}
