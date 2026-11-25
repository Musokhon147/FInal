"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import I18nFields from "@/components/admin/I18nFields";
import { i18nOf } from "@/components/admin/forms";
import { uploadImage } from "@/components/admin/uploadImage";
import { Logo } from "@/components/design/StarMark";
import type { Journal } from "@/lib/types";
import { Link } from "@/i18n/navigation";
import { saveSettings } from "../actions";

export default function SettingsForm({ journal }: { journal: Journal }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(journal.logo_url);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setMsg(null); setFieldError(null);
    try {
      const file = fd.get("logo") as File | null;
      let logo_url: string | null | undefined = logo === journal.logo_url ? undefined : logo;
      if (file?.size) logo_url = await uploadImage(file, "logo");
      const res = await saveSettings({
        title: i18nOf(fd, "title"), description: i18nOf(fd, "description"), cfp_text: i18nOf(fd, "cfp_text"),
        issn_online: String(fd.get("issn_online") ?? ""), issn_print: String(fd.get("issn_print") ?? ""),
        doi_prefix: String(fd.get("doi_prefix") ?? ""), doi_auto: fd.get("doi_auto") === "on",
        google_verification: String(fd.get("google_verification") ?? ""),
        doi_provider: String(fd.get("doi_provider") ?? ""),
        publisher: String(fd.get("publisher") ?? ""),
        contact_email: String(fd.get("contact_email") ?? ""),
        indexes: String(fd.get("indexes") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        cfp_deadline: String(fd.get("cfp_deadline") ?? "") || null, logo_url,
      });
      if (res?.error) {
        setFieldError(res.error);
        setMsg(t(res.error === "bad-prefix" ? "ix.badPrefix" : res.error === "bad-google" ? "ix.badGoogle" : "ix.badIssn"));
        const field = { "bad-prefix": "doi_prefix", "bad-issn-print": "issn_print", "bad-issn-online": "issn_online", "bad-google": "google_verification" }[res.error];
        document.getElementsByName(field)[0]?.focus();
        return;
      }
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">{t("home.publisher")}</span><input name="publisher" defaultValue={journal.publisher ?? ""} className="input" /></label>
        <label><span className="label">{t("x.contactEmail")}</span><input name="contact_email" type="email" defaultValue={journal.contact_email ?? ""} className="input" /></label>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">{t("ix.numbersLegend")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className="label">{t("ix.issnOnlineLabel")}</span>
            <input name="issn_online" defaultValue={journal.issn_online ?? ""} placeholder="1234-5679" inputMode="numeric" aria-invalid={fieldError === "bad-issn-online" || undefined} className="input" /></label>
          <label><span className="label">{t("ix.issnPrintLabel")}</span>
            <input name="issn_print" defaultValue={journal.issn_print ?? ""} placeholder="1234-5679" inputMode="numeric" aria-invalid={fieldError === "bad-issn-print" || undefined} className="input" /></label>
          <label><span className="label">{t("ix.doiPrefix")}</span>
            <input name="doi_prefix" defaultValue={journal.doi_prefix ?? ""} placeholder="10.12345" aria-invalid={fieldError === "bad-prefix" || undefined} className="input" /></label>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="label">{t("ix.providerLabel")}</legend>
          {([["", "ix.provNone"], ["zenodo", "ix.provZenodo"], ["crossref", "ix.provCrossref"]] as const).map(([v, k]) => (
            <label key={v || "none"} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="radio" name="doi_provider" value={v} className="mt-1"
                defaultChecked={(journal.doi_provider ?? (journal.doi_prefix ? "crossref" : "")) === v} />
              <span>{t(k)}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="doi_auto" defaultChecked={journal.doi_auto ?? true} /> {t("ix.doiAuto")}
        </label>
        <label className="block"><span className="label">{t("ix.googleLabel")}</span>
          <input name="google_verification" defaultValue={journal.google_verification ?? ""} placeholder={'<meta name="google-site-verification" content="…" />'}
            aria-invalid={fieldError === "bad-google" || undefined} aria-describedby="google-hint" className="input font-mono text-xs" />
          <span id="google-hint" className="mt-1 block text-xs text-slate-500">{t("ix.googleHint")}</span>
        </label>
        <p className="text-xs text-slate-500">{t("ix.numbersHint")} <Link href="/admin/indexing" className="text-brand-700 hover:underline">{t("ix.menu")}</Link></p>
      </fieldset>
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
