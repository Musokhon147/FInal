import { getTranslations } from "next-intl/server";

/** Received → Review (optional) → Decision → Published, with what to do next. */
export default async function Steps({ status, reviewing }: { status: string; reviewing: boolean }) {
  const t = await getTranslations("pt");
  const stopped = status === "rejected" || status === "withdrawn";
  // index of the current step
  const at =
    status === "published" ? 4
    : status === "accepted" ? 3
    : status === "revision_required" ? 2
    : status === "under_review" || reviewing ? 1
    : 0;
  const steps = [t("stepReceived"), t("stepReview"), t("stepDecision"), t("stepPublished")];
  const next =
    status === "published" ? t("nextNone")
    : status === "accepted" ? t("nextPublish")
    : status === "revision_required" ? t("nextCorrections")
    : status === "under_review" ? t("nextReview")
    : stopped ? (status === "rejected" ? t("stoppedRejected") : t("stoppedWithdrawn"))
    : t("nextDecide");

  return (
    <div className="card">
      <ol className="flex items-center gap-2" aria-label={t("decisionTitle")}>
        {steps.map((label, i) => {
          const done = !stopped && i < at || status === "published";
          const current = !stopped && i === at && status !== "published";
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done ? "bg-accent text-ink" : current ? "bg-brand-600 text-ink ring-4 ring-brand-600/25" : stopped && i === Math.min(at, 2) ? "bg-red-500/80 text-white" : "bg-slate-200 text-slate-500"}`}>
                {done ? "✓" : stopped && i === Math.min(at, 2) ? "✕" : i + 1}
              </span>
              <span className={`hidden truncate text-sm sm:block ${current ? "font-semibold text-slate-900" : "text-slate-500"}`}>{label}</span>
              {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${done ? "bg-accent" : "bg-slate-200"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <p className={`mt-4 text-sm ${stopped ? "text-red-400" : "text-slate-700"}`}>{next}</p>
    </div>
  );
}
