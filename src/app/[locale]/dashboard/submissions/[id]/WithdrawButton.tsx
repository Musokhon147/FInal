"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { withdrawSubmission } from "../../actions";

export default function WithdrawButton({ id }: { id: string }) {
  const t = useTranslations("submission");
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-secondary w-full text-red-400"
      disabled={pending}
      onClick={() => {
        if (confirm(t("withdraw") + "?")) start(() => withdrawSubmission(id));
      }}
    >
      {t("withdraw")}
    </button>
  );
}
