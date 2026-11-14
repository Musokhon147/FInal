import { getLocale } from "next-intl/server";
import { formatDate } from "@/lib/i18n-field";
import type { SubmissionStatus } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export type TimelineEvent = {
  id: number;
  to_status: SubmissionStatus | null;
  note: string | null;
  created_at: string;
};

export default async function Timeline({ events }: { events: TimelineEvent[] }) {
  const locale = await getLocale();
  return (
    <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
          <div className="flex flex-wrap items-center gap-2">
            {e.to_status && <StatusBadge status={e.to_status} />}
            <span className="text-xs text-slate-500">{formatDate(e.created_at, locale)}</span>
          </div>
          {e.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
