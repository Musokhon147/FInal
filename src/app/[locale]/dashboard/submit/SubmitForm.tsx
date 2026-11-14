"use client";

import { useState } from "react";
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

  const updateAuthor = (i: number, patch: Partial<Author>) =>
    setAuthors((list) =>
      list.map((a, j) =>
        j === i ? { ...a, ...patch } : patch.is_corresponding ? { ...a, is_corresponding: false } : a,
      ),
    );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    <form onSubmit={onSubmit} className="card space-y-5">
      {sections.length > 0 && (
        <div>
          <label className="label" htmlFor="section_id">{t("submit.section")}</label>
          <select className="input" id="section_id" name="section_id">
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="title">{t("submit.articleTitle")}</label>
        <input className="input" id="title" name="title" required maxLength={500} />
      </div>
      <div>
        <label className="label" htmlFor="language">{t("submit.language")}</label>
        <select className="input" id="language" name="language" defaultValue="uz">
          <option value="uz">{t("langs.uz")}</option>
          <option value="ru">{t("langs.ru")}</option>
          <option value="en">{t("langs.en")}</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="abstract">{t("submit.abstract")}</label>
        <textarea className="input min-h-36" id="abstract" name="abstract" required />
      </div>
      <div>
        <label className="label" htmlFor="keywords">{t("submit.keywords")}</label>
        <input className="input" id="keywords" name="keywords" required />
        <p className="mt-1 text-xs text-slate-500">{t("submit.keywordsHint")}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className="label">{t("submit.authors")}</legend>
        {authors.map((a, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2">
            <input className="input" placeholder={t("submit.authorName")} value={a.full_name} required
              onChange={(e) => updateAuthor(i, { full_name: e.target.value })} />
            <input className="input" placeholder={t("submit.authorEmail")} type="email" value={a.email}
              onChange={(e) => updateAuthor(i, { email: e.target.value })} />
            <input className="input" placeholder={t("submit.authorAffiliation")} value={a.affiliation}
              onChange={(e) => updateAuthor(i, { affiliation: e.target.value })} />
            <input className="input" placeholder={`${t("submit.authorOrcid")} 0000-0000-0000-0000`} value={a.orcid}
              pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]" onChange={(e) => updateAuthor(i, { orcid: e.target.value })} />
            <div className="flex items-center justify-between sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="corresponding" checked={a.is_corresponding}
                  onChange={() => updateAuthor(i, { is_corresponding: true })} />
                {t("submit.corresponding")}
              </label>
              {authors.length > 1 && (
                <button type="button" className="text-sm text-red-400 hover:underline"
                  onClick={() => setAuthors((l) => l.filter((_, j) => j !== i))}>
                  {t("submit.remove")}
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="btn-secondary"
          onClick={() => setAuthors((l) => [...l, { full_name: "", email: "", affiliation: "", orcid: "", is_corresponding: false }])}>
          + {t("submit.addAuthor")}
        </button>
      </fieldset>

      <div>
        <label className="label" htmlFor="references">{t("submit.references")}</label>
        <textarea className="input min-h-28" id="references" name="references" />
      </div>
      <div>
        <label className="label" htmlFor="cover_letter">{t("submit.coverLetter")}</label>
        <textarea className="input min-h-20" id="cover_letter" name="cover_letter" />
      </div>
      <div>
        <label className="label" htmlFor="file">{t("submit.file")}</label>
        <input className="input" id="file" name="file" type="file" required accept=".doc,.docx,.pdf" />
        <p className="mt-1 text-xs text-slate-500">{t("submit.fileHint")}</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required className="mt-1" />
        {t("submit.agree")}
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? t("submit.sending") : t("submit.send")}</button>
    </form>
  );
}
