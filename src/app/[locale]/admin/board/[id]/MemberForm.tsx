"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import I18nFields from "@/components/admin/I18nFields";
import { i18nOf } from "@/components/admin/forms";
import { uploadImage } from "@/components/admin/uploadImage";
import type { BoardMember } from "@/lib/types";
import { deleteMember, saveMember } from "../../actions";

export default function MemberForm({ member }: { member: BoardMember | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    try {
      const file = fd.get("photo") as File | null;
      await saveMember(member?.id ?? null, {
        full_name: i18nOf(fd, "full_name"), position: i18nOf(fd, "position"), affiliation: i18nOf(fd, "affiliation"),
        position_type: fd.get("position_type") as BoardMember["position_type"], sort_order: Number(fd.get("sort_order") || 10),
        photo_url: file?.size ? await uploadImage(file, "board") : undefined,
      });
      router.push("/admin/board");
    } catch (err) {
      setError(err instanceof Error && err.message === "too-big" ? t("x.logoHint") : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <I18nFields name="full_name" label={t("auth.fullName")} value={member?.full_name} required />
      <I18nFields name="position" label={t("admin.role")} value={member?.position} />
      <I18nFields name="affiliation" label={t("auth.affiliation")} value={member?.affiliation} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="label">{t("x.group")}</span>
          <select name="position_type" defaultValue={member?.position_type ?? "member"} className="input">
            {(["chief", "deputy", "member"] as const).map((g) => <option key={g} value={g}>{t(`x.g_${g}`)}</option>)}
          </select>
        </label>
        <label><span className="label">Sort</span><input name="sort_order" type="number" defaultValue={member?.sort_order ?? 10} className="input" /></label>
        <label><span className="label">{t("x.photo")}</span><input name="photo" type="file" accept="image/*" className="input" /></label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
        {member && (
          <button type="button" className="btn-secondary text-red-400"
            onClick={() => start(async () => { await deleteMember(member.id); router.push("/admin/board"); })}>
            {t("common.delete")}
          </button>
        )}
      </div>
    </form>
  );
}
