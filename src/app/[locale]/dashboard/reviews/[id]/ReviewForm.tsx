"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitReview } from "../../actions";
import { SCORE_KEYS } from "@/lib/types";

export default function ReviewForm({ id }: { id: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(submitReview, undefined);
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="id" value={id} />
      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">{t("x.scoresTitle")}</legend>
        <div className="space-y-3">
          {SCORE_KEYS.map((k) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-3">
              <span id={`lbl-${k}`} className="text-sm text-slate-700">{t(`x.s_${k}`)}</span>
              <div className="flex gap-1.5" role="radiogroup" aria-labelledby={`lbl-${k}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input type="radio" name={`score_${k}`} value={n} required className="peer sr-only" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-sm text-slate-600 transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{n}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="recommendation">{t("review.recommendation")}</label>
        <select className="input" id="recommendation" name="recommendation" required defaultValue="">
          <option value="" disabled>—</option>
          {(["accept", "minor_revision", "major_revision", "reject"] as const).map((r) => (
            <option key={r} value={r}>{t(`rec.${r}`)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="comments_to_author">{t("review.toAuthor")}</label>
        <textarea className="input min-h-40" id="comments_to_author" name="comments_to_author" required />
      </div>
      <div>
        <label className="label" htmlFor="comments_to_editor">{t("review.toEditor")}</label>
        <textarea className="input min-h-24" id="comments_to_editor" name="comments_to_editor" />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error === "recommendation" ? t("review.recommendation") : state.error}</p>}
      <button className="btn-primary" disabled={pending}>{t("review.send")}</button>
    </form>
  );
}
