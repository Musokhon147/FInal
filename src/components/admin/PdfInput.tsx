"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Google Scholar skips PDF files larger than this. */
export const SCHOLAR_PDF_LIMIT = 5 * 1024 * 1024;

/** A PDF file input that warns when the chosen file is too big for Google Scholar. */
export default function PdfInput({ onChange, ...props }: React.ComponentProps<"input">) {
  const t = useTranslations("ix");
  const [big, setBig] = useState<number | null>(null);
  return (
    <>
      <input type="file" accept="application/pdf" {...props}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setBig(f && f.size > SCHOLAR_PDF_LIMIT ? f.size : null);
          onChange?.(e);
        }} />
      {big !== null && (
        <p role="status" className="mt-1 w-full text-xs text-red-400">{t("pdfTooBig", { mb: (big / 1048576).toFixed(1) })}</p>
      )}
    </>
  );
}
