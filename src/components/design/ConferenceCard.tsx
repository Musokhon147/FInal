import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-field";
import { dateRange } from "@/lib/data";
import type { Conference } from "@/lib/types";

/** Calendar-style card: big start day, title, dates and place. */
export default function ConferenceCard({ c, locale, note }: { c: Conference; locale: string; note?: string }) {
  const d = new Date(c.start_date + "T00:00:00");
  const month = locale === "uz"
    ? ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"][d.getMonth()]
    : new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { month: "short" }).format(d);
  return (
    <li>
      <Link href={`/conferences/${c.id}`} className="card group flex h-full gap-5 p-6 transition hover:-translate-y-1 hover:border-brand-600/60">
        <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-accent/40 bg-accent/10 py-3 text-center">
          <span className="font-serif text-3xl font-light leading-none text-slate-900">{d.getDate()}</span>
          <span className="mt-1 text-xs text-accent">{month} {d.getFullYear()}</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg leading-snug transition group-hover:text-brand-700">{tr(c.title, locale)}</h3>
          <p className="mt-2 text-sm text-slate-500">{dateRange(c.start_date, c.end_date, locale)}</p>
          <p className="text-sm text-slate-500">{tr(c.location, locale)}</p>
          {note && <p className="mt-3 text-sm font-medium text-accent">{note}</p>}
        </div>
      </Link>
    </li>
  );
}
