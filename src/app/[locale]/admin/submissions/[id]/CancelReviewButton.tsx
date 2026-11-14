"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { cancelReview } from "../../actions";

export default function CancelReviewButton({ id }: { id: string }) {
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <button className="text-xs text-red-400 hover:underline" disabled={pending} onClick={() => start(() => cancelReview(id))}>
      {t("cancel")}
    </button>
  );
}
