"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IS_DEMO } from "@/lib/supabase/env";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
};

export default function AuthForm({ mode, action, next }: Props) {
  const t = useTranslations("auth");
  const td = useTranslations("demo");
  const [state, formAction, pending] = useActionState(action, undefined);

  const errorText =
    state?.error === "invalid" ? t("invalid") : state?.error;

  return (
    <div className="mx-auto max-w-md card">
      <h1 className="mb-6 text-2xl">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
      {state?.message === "checkEmail" ? (
        <p className="rounded bg-green-50 p-3 text-brand-700">{t("checkEmail")}</p>
      ) : (
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
          {errorText && <p className="text-sm text-red-400">{errorText}</p>}
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
