import { useTranslations } from "next-intl";
import type { SubmissionStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  const t = useTranslations("status");
  return <span className={`badge b-${status}`}>{t(status)}</span>;
}
