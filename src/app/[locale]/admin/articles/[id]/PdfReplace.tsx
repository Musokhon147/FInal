"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { setArticlePdf } from "../../actions";

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
          await setArticlePdf(articleId, await uploadArticlePdf(file));
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : t("error"));
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="file" name="pdf" accept="application/pdf" className="input max-w-sm" required />
      <button className="btn-secondary" disabled={busy}>{busy ? t("loading") : t("save")}</button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
