import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import type { ArticleAuthor } from "@/lib/types";

export default async function AdminArticles({ params, searchParams }: PageProps<"/[locale]/admin/articles">) {
  const locale = await initLocale(params);
  const t = await getTranslations("admin");
  const { issue } = await searchParams;
  const { supabase } = await getSession();
  let q = supabase
    .from("articles")
    .select("id, title, authors, status, published_at, views, downloads, first_page")
    .order("created_at", { ascending: false })
    .limit(300);
  if (typeof issue === "string") q = q.eq("issue_id", issue).order("first_page");
  const { data } = await q;
  const rows = (data ?? []) as { id: string; title: string; authors: ArticleAuthor[]; status: "scheduled" | "published"; published_at: string | null; views: number; downloads: number }[];

  return (
    <div className="card">
      <h1 className="mb-4 text-2xl">{t("articles")}</h1>
      <div className="overflow-x-auto">
        <table className="table">
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/admin/articles/${a.id}`} className="text-brand-700 hover:underline">{a.title}</Link>
                  <span className="block text-xs text-slate-500">{a.authors.map((x) => x.name).join(", ")}</span>
                </td>
                <td className="whitespace-nowrap">{t(`articleStatus_${a.status}`)}</td>
                <td className="whitespace-nowrap text-slate-500">{formatDate(a.published_at, locale)}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">👁 {a.views} · ⬇ {a.downloads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
