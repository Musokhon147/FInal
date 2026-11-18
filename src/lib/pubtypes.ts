import type { PubType } from "@/lib/types";

export const PUB_TYPES: PubType[] = ["journal", "local_conference", "international_conference"];
export const isPubType = (v: unknown): v is PubType => typeof v === "string" && (PUB_TYPES as string[]).includes(v);

/** Conference scope that matches a thesis type. */
export const scopeOf = (t: PubType) => (t === "local_conference" ? "local" : t === "international_conference" ? "international" : null);

/** Archive tab slugs (short, for URLs). */
export const ARCHIVE_TABS = { journal: "journal", local_conference: "local", international_conference: "international" } as const;
export const tabToType = (tab: unknown): PubType =>
  tab === "local" ? "local_conference" : tab === "international" ? "international_conference" : "journal";
