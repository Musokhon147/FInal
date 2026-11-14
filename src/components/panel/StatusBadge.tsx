import { useTranslations } from "next-intl";
import type { SubmissionStatus } from "@/lib/types";

const COLORS: Record<SubmissionStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  desk_review: "bg-indigo-100 text-indigo-800",
  under_review: "bg-amber-100 text-amber-800",
  revision_required: "bg-orange-100 text-orange-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  published: "bg-emerald-600 text-white",
  withdrawn: "bg-slate-200 text-slate-500",
};

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {t(status)}
    </span>
  );
}
