"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { extractPdfText } from "@/components/admin/extractPdfText";
import { setArticlePdf } from "../../actions";
import PdfInput from "@/components/admin/PdfInput";

export default function PdfReplace({ articleId }: { articleId: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = new FormData(e.currentTarget).get("pdf") as File;
        if (!file?.size) return;
        setBusy(true);
        setError(null);
        try {
          const [path, text] = await Promise.all([uploadArticlePdf(file), extractPdfText(file)]);
          await setArticlePdf(articleId, path, text);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : t("error"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <PdfInput name="pdf" className="input max-w-sm" required />
      <button className="btn-secondary" disabled={busy}>{busy ? t("loading") : t("save")}</button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
