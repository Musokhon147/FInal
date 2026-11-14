"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import I18nFields from "@/components/admin/I18nFields";
import { i18nOf } from "@/components/admin/forms";
import { uploadImage } from "@/components/admin/uploadImage";
import { Logo } from "@/components/design/StarMark";
import type { Journal } from "@/lib/types";
import { saveSettings } from "../actions";

export default function SettingsForm({ journal }: { journal: Journal }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(journal.logo_url);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg(null);
    try {
      const file = fd.get("logo") as File | null;
      let logo_url: string | null | undefined = logo === journal.logo_url ? undefined : logo;
      if (file?.size) logo_url = await uploadImage(file, "logo");
      await saveSettings({
        title: i18nOf(fd, "title"), description: i18nOf(fd, "description"), cfp_text: i18nOf(fd, "cfp_text"),
        issn_online: String(fd.get("issn_online") ?? ""), publisher: String(fd.get("publisher") ?? ""),
        contact_email: String(fd.get("contact_email") ?? ""),
        indexes: String(fd.get("indexes") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        cfp_deadline: String(fd.get("cfp_deadline") ?? "") || null, logo_url,
      });
      if (logo_url) setLogo(logo_url);
      setMsg(t("x.saved"));
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error && err.message === "too-big" ? t("x.logoHint") : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      <h1 className="text-2xl">{t("x.settings")}</h1>
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50"><Logo url={logo} size={56} /></div>
        <div className="space-y-2">
          <label className="label" htmlFor="logo">{t("x.logo")}</label>
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml" className="input max-w-xs" />
          <p className="text-xs text-slate-500">{t("x.logoHint")}</p>
          {logo && <button type="button" onClick={() => setLogo(null)} className="text-sm text-red-400 hover:underline">{t("x.removeLogo")}</button>}
        </div>
      </div>
      <I18nFields name="title" label={t("common.title")} value={journal.title} required />
      <I18nFields name="description" label={t("submit.abstract")} value={journal.description} multiline />
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="label">ISSN (online)</span><input name="issn_online" defaultValue={journal.issn_online ?? ""} className="input" /></label>
        <label><span className="label">{t("home.publisher")}</span><input name="publisher" defaultValue={journal.publisher ?? ""} className="input" /></label>
        <label><span className="label">{t("x.contactEmail")}</span><input name="contact_email" type="email" defaultValue={journal.contact_email ?? ""} className="input" /></label>
      </div>
      <label className="block"><span className="label">{t("x.indexesField")}</span><input name="indexes" defaultValue={(journal.indexes ?? []).join(", ")} className="input" /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="label">{t("x.cfpDeadline")}</span><input name="cfp_deadline" type="date" defaultValue={journal.cfp_deadline ?? ""} className="input" /></label>
      </div>
      <I18nFields name="cfp_text" label={t("x.cfpText")} value={journal.cfp_text} multiline />
      <div className="flex items-center gap-4">
        <button className="btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
        {msg && <p className="text-sm text-slate-600" role="status">{msg}</p>}
      </div>
    </form>
  );
}
