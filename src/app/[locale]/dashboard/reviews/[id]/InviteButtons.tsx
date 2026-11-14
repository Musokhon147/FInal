"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { respondToInvite } from "../../actions";

export default function InviteButtons({ id }: { id: string }) {
  const t = useTranslations("review");
  const [pending, start] = useTransition();
  return (
    <div className="card flex gap-3">
      <button className="btn-primary" disabled={pending} onClick={() => start(() => respondToInvite(id, true))}>
        {t("accept")}
      </button>
      <button className="btn-secondary" disabled={pending} onClick={() => start(() => respondToInvite(id, false))}>
        {t("decline")}
      </button>
    </div>
  );
}
