type T = (key: "archives.volume" | "archives.issue" | "archives.special", values?: Record<string, string | number>) => string;

export function issueLabel(
  t: T,
  issue: { number: number; is_special: boolean; volumes?: { number: number; year: number } | null },
) {
  const parts: string[] = [];
  if (issue.volumes) parts.push(t("archives.volume", { n: issue.volumes.number, year: issue.volumes.year }));
  parts.push(issue.is_special ? `${t("archives.special")} ${issue.number}` : t("archives.issue", { n: issue.number }));
  return parts.join(", ");
}
