/** Ask the next page to throw star confetti (used after submit / publish, which navigate away). */
export function celebrate() {
  try { sessionStorage.setItem("celebrate", "1"); } catch {}
}
