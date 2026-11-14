import { Link } from "@/i18n/navigation";
import { formatDate, tr } from "@/lib/i18n-field";
import type { NewsItem } from "@/lib/types";

export default function NewsCard({ item, locale }: { item: NewsItem; locale: string }) {
  const plain = tr(item.body, locale).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return (
    <li>
      <Link href={`/news/${item.id}`} data-tilt="6" className="card group block h-full p-6 transition-[border-color] hover:border-brand-600/60">
        <p className="text-xs text-slate-500">{formatDate(item.date, locale)}{item.pinned && <span className="ml-2 text-accent">★</span>}</p>
        <h3 className="mt-3 text-lg leading-snug transition group-hover:text-brand-700">{tr(item.title, locale)}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{plain}</p>
      </Link>
    </li>
  );
}
