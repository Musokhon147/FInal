"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setIssuePublished } from "../actions";

export default function IssueToggle({ id, published }: { id: string; published: boolean }) {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  return (
    <button
      className={published ? "btn-secondary" : "btn-primary"}
      disabled={pending}
      onClick={() => start(() => setIssuePublished(id, !published))}
    >
      {published ? t("unpublishIssue") : t("publishIssue")}
    </button>
  );
}
