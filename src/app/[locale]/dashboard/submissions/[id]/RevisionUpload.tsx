"use client";

import { notifySubmitted } from "../../actions";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files";

export default function RevisionUpload({ submissionId, nextVersion }: { submissionId: string; nextVersion: number }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("file") as File;
    if (!file?.size) return;
    if (file.size > MAX_UPLOAD_BYTES) return setError(t("submit.fileTooBig"));
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const path = `${submissionId}/${safeFileName(file.name)}`;
      const up = await supabase.storage.from("manuscripts").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw up.error;
      const ins = await supabase.from("submission_files").insert({
        submission_id: submissionId,
        kind: "revision",
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        version: nextVersion,
      });
      if (ins.error) throw ins.error;
      const upd = await supabase.from("submissions").update({ status: "submitted" }).eq("id", submissionId);
      if (upd.error) throw upd.error;
      notifySubmitted(submissionId).catch(() => {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 border-orange-400/40">
      <h2 className="text-lg">{t("submission.revision")}</h2>
      <p className="text-sm text-slate-600">{t("submission.revisionHint")}</p>
      <input className="input" type="file" name="file" required accept=".doc,.docx,.pdf" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? t("submit.sending") : t("submission.sendRevision")}</button>
    </form>
  );
}
