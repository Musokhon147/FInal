/** Journal statistics computed from submissions, decisions (submission_events) and reviews. */
type Sub = { id: string; title: string; status: string; submitted_at: string | null; created_at: string };
type Ev = { submission_id: string; to_status: string | null; created_at: string };
type Rev = { reviewer_id: string; status: string; created_at: string; completed_at: string | null; due_at: string | null };

const DECIDED = ["accepted", "rejected", "revision_required", "published"];
const DAY = 86_400_000;
const days = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / DAY));
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((p, c) => p + c, 0) / xs.length) : null);

export function computeStats(subs: Sub[], events: Ev[], reviews: Rev[], since: number) {
  const inRange = subs.filter((s) => Date.parse(s.submitted_at || s.created_at) >= since);
  const ids = new Set(inRange.map((s) => s.id));

  // first decision per manuscript
  const firstDecision = new Map<string, Ev>();
  [...events].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((e) => {
    if (e.to_status && DECIDED.includes(e.to_status) && !firstDecision.has(e.submission_id)) firstDecision.set(e.submission_id, e);
  });
  const decisionDays = inRange.flatMap((s) => { const e = firstDecision.get(s.id); return e ? [days(s.submitted_at || s.created_at, e.created_at)] : []; });

  // final outcome: accepted (incl. published) vs rejected; revisions are still open
  const accepted = inRange.filter((s) => s.status === "accepted" || s.status === "published").length;
  const rejected = inRange.filter((s) => s.status === "rejected").length;
  const revision = inRange.filter((s) => s.status === "revision_required").length;

  const revs = reviews.filter((r) => Date.parse(r.created_at) >= since);
  const answered = revs.filter((r) => r.status !== "invited");
  const agreed = revs.filter((r) => ["accepted", "completed"].includes(r.status));
  const reviewDays = revs.flatMap((r) => (r.completed_at ? [days(r.created_at, r.completed_at)] : []));
  const buckets = [14, 28, 56, Infinity].map((max, i, arr) => reviewDays.filter((d) => d < max && d >= (arr[i - 1] ?? 0)).length);

  const byReviewer = new Map<string, { invited: number; completed: number; days: number[]; onTime: number }>();
  revs.forEach((r) => {
    const x = byReviewer.get(r.reviewer_id) ?? { invited: 0, completed: 0, days: [], onTime: 0 };
    x.invited++;
    if (r.completed_at) {
      x.completed++; x.days.push(days(r.created_at, r.completed_at));
      if (!r.due_at || Date.parse(r.completed_at) <= Date.parse(r.due_at) + DAY) x.onTime++;
    }
    byReviewer.set(r.reviewer_id, x);
  });

  return {
    received: inRange.length,
    acceptanceRate: accepted + rejected ? Math.round((100 * accepted) / (accepted + rejected)) : null,
    outcome: { accepted, rejected, revision, open: inRange.length - accepted - rejected - revision },
    firstDecisionDays: avg(decisionDays),
    reviewDays: avg(reviewDays),
    inviteAcceptRate: answered.length ? Math.round((100 * agreed.length) / answered.length) : null,
    buckets,
    reviewers: [...byReviewer.entries()].map(([id, x]) => ({ id, invited: x.invited, completed: x.completed, avgDays: avg(x.days), onTimePct: x.completed ? Math.round((100 * x.onTime) / x.completed) : null }))
      .sort((a, b) => b.completed - a.completed || b.invited - a.invited),
    ids,
  };
}

/** Counts per calendar month for the last `n` months, ending with the month of `end`. */
export function perMonth(dates: string[], end: Date, n: number, label: (d: Date) => string): [string, number][] {
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(end.getFullYear(), end.getMonth() - (n - 1) + k, 1);
    return [label(d), dates.filter((x) => { const t = new Date(x); return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth(); }).length];
  });
}

/** The reporting window: from the first day of the month 11 months before the newest date (or today), or everything. */
export function reportWindow(dates: string[], period: "12m" | "all") {
  const latest = new Date(Math.max(Date.now(), ...dates.map((d) => Date.parse(d))));
  return { latest, since: period === "all" ? 0 : new Date(latest.getFullYear(), latest.getMonth() - 11, 1).getTime() };
}
