"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files";

type Author = { full_name: string; email: string; affiliation: string; orcid: string; is_corresponding: boolean };

type Props = {
  journalId: string;
  userId: string;
  sections: { id: string; title: string }[];
  me: Omit<Author, "is_corresponding">;
};

export default function SubmitForm({ journalId, userId, sections, me }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [authors, setAuthors] = useState<Author[]>([{ ...me, is_corresponding: true }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<[string, string][]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const STEPS = ["x.stepDetails", "x.stepAuthors", "x.stepFiles", "x.stepConfirm"] as const;

  const go = (n: number) => {
    const form = formRef.current!;
    if (n > step) {
      const panel = form.querySelector<HTMLElement>(`[data-panel="${step}"]`)!;
      for (const el of panel.querySelectorAll<HTMLInputElement>("input,textarea,select")) {
        if (!el.checkValidity()) {
          if (el.type === "file") setError(t("submit.file"));
          else el.reportValidity();
          return;
        }
      }
    }
    setError(null);
    if (n === 3) {
      const fd = new FormData(form);
      setSummary([
        [t("submit.section"), sections.find((x) => x.id === fd.get("section_id"))?.title ?? ""],
        [t("submit.articleTitle"), String(fd.get("title") ?? "")],
        [t("submit.language"), t(`langs.${fd.get("language") as "uz"}`)],
        [t("submit.keywords"), String(fd.get("keywords") ?? "")],
        [t("submit.authors"), authors.map((a) => a.full_name).filter(Boolean).join(", ")],
        [t("submit.file"), fileName ?? "—"],
      ]);
    }
    setStep(n);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const nav = (n: number) => (
    <div className="flex justify-between gap-3 pt-2">
      {n > 0 ? <button type="button" onClick={() => go(n - 1)} className="btn-secondary">{t("x.prev")}</button> : <span />}
      {n < 3
        ? <button type="button" onClick={() => go(n + 1)} className="btn-primary">{t("x.next")}</button>
        : <button className="btn-gold px-7" disabled={busy}>{busy ? t("submit.sending") : t("submit.send")}</button>}
    </div>
  );

  const updateAuthor = (i: number, patch: Partial<Author>) =>
    setAuthors((list) =>
      list.map((a, j) =>
        j === i ? { ...a, ...patch } : patch.is_corresponding ? { ...a, is_corresponding: false } : a,
      ),
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== 3) return go(step + 1);
    const agree = e.currentTarget.querySelector<HTMLInputElement>("[name=agree]")!;
    if (!agree.checked) return void agree.reportValidity();
    setError(null);
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || !file.size) return;
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("submit.fileTooBig"));

    setBusy(true);
    const supabase = createClient();
    try {
      // 1. Create the submission as a draft
      const { data: sub, error: e1 } = await supabase
        .from("submissions")
        .insert({
          journal_id: journalId,
          section_id: form.get("section_id") || null,
          submitter_id: userId,
          title: String(form.get("title")).trim(),
          abstract: String(form.get("abstract")).trim(),
          keywords: String(form.get("keywords"))
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          language: String(form.get("language")),
          references: String(form.get("references") ?? ""),
          cover_letter: String(form.get("cover_letter") ?? ""),
        })
        .select("id")
        .single();
      if (e1) throw e1;

      // 2. Authors
      const { error: e2 } = await supabase.from("submission_authors").insert(
        authors
          .filter((a) => a.full_name.trim())
          .map((a, i) => ({ ...a, submission_id: sub.id, sort_order: i })),
      );
      if (e2) throw e2;

      // 3. Upload the manuscript to private storage
      const path = `${sub.id}/${safeFileName(file.name)}`;
      const { error: e3 } = await supabase.storage.from("manuscripts").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (e3) throw e3;
      const { error: e4 } = await supabase.from("submission_files").insert({
        submission_id: sub.id,
        kind: "manuscript",
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (e4) throw e4;

      // 4. Send it to the editors
      const { error: e5 } = await supabase.from("submissions").update({ status: "submitted" }).eq("id", sub.id);
      if (e5) throw e5;

      router.push(`/dashboard/submissions/${sub.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="card scroll-mt-28 space-y-5 p-6 sm:p-8">
      <div className="mb-2">
        <p className="mb-3 text-sm text-slate-500">{t("x.stepOf", { n: step + 1, total: 4 })}</p>
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((k, i) => (
            <li key={k} className={`step-ind ${i < step ? "is-done" : ""} ${i === step ? "is-current" : ""}`}>
              <span className="block h-1.5 rounded-full bg-slate-200"><span className="step-fill block h-full rounded-full bg-brand-600" /></span>
              <span className="mt-2 block text-xs text-slate-500">{t(k)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div data-panel="0" hidden={step !== 0} className="space-y-5">
        {sections.length > 0 && (
          <div>
            <label className="label" htmlFor="section_id">{t("submit.section")}</label>
            <select className="input" id="section_id" name="section_id">
              {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        )}
        <div><label className="label" htmlFor="title">{t("submit.articleTitle")}</label><input className="input" id="title" name="title" required maxLength={500} /></div>
        <div>
          <label className="label" htmlFor="language">{t("submit.language")}</label>
          <select className="input" id="language" name="language" defaultValue="uz">
            <option value="uz">{t("langs.uz")}</option><option value="ru">{t("langs.ru")}</option><option value="en">{t("langs.en")}</option>
          </select>
        </div>
        <div><label className="label" htmlFor="abstract">{t("submit.abstract")}</label><textarea className="input min-h-36" id="abstract" name="abstract" required /></div>
        <div>
          <label className="label" htmlFor="keywords">{t("submit.keywords")}</label><input className="input" id="keywords" name="keywords" required />
          <p className="mt-1 text-xs text-slate-500">{t("submit.keywordsHint")}</p>
        </div>
        {nav(0)}
      </div>

      <div data-panel="1" hidden={step !== 1} className="space-y-3">
        {authors.map((a, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            <input className="input" placeholder={t("submit.authorName")} aria-label={t("submit.authorName")} value={a.full_name} required onChange={(e) => updateAuthor(i, { full_name: e.target.value })} />
            <input className="input" placeholder={t("submit.authorEmail")} aria-label={t("submit.authorEmail")} type="email" value={a.email} onChange={(e) => updateAuthor(i, { email: e.target.value })} />
            <input className="input" placeholder={t("submit.authorAffiliation")} aria-label={t("submit.authorAffiliation")} value={a.affiliation} onChange={(e) => updateAuthor(i, { affiliation: e.target.value })} />
            <input className="input" placeholder={`${t("submit.authorOrcid")} 0000-0000-0000-0000`} aria-label="ORCID" value={a.orcid} pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]" onChange={(e) => updateAuthor(i, { orcid: e.target.value })} />
            <div className="flex items-center justify-between sm:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="corresponding" checked={a.is_corresponding} onChange={() => updateAuthor(i, { is_corresponding: true })} />{t("submit.corresponding")}</label>
              {authors.length > 1 && <button type="button" className="text-sm text-red-400 hover:underline" onClick={() => setAuthors((l) => l.filter((_, j) => j !== i))}>{t("submit.remove")}</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setAuthors((l) => [...l, { full_name: "", email: "", affiliation: "", orcid: "", is_corresponding: false }])}>+ {t("submit.addAuthor")}</button>
        {nav(1)}
      </div>

      <div data-panel="2" hidden={step !== 2} className="space-y-5">
        <div>
          <span className="label">{t("submit.file")}</span>
          <label htmlFor="file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center transition hover:border-brand-600">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-700" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
            <span className="text-sm text-slate-700">{fileName ?? t("submit.fileHint")}</span>
          </label>
          <input className="sr-only" id="file" name="file" type="file" required accept=".doc,.docx,.pdf" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </div>
        <div><label className="label" htmlFor="references">{t("submit.references")}</label><textarea className="input min-h-28" id="references" name="references" /></div>
        <div><label className="label" htmlFor="cover_letter">{t("submit.coverLetter")}</label><textarea className="input min-h-20" id="cover_letter" name="cover_letter" /></div>
        {nav(2)}
      </div>

      <div data-panel="3" hidden={step !== 3} className="space-y-5">
        <dl>
          {summary.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-b border-slate-200 py-3 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm text-slate-500">{k}</dt><dd className="text-sm text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" required className="mt-1" /> {t("submit.agree")}</label>
        {nav(3)}
      </div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
    </form>
  );
}
