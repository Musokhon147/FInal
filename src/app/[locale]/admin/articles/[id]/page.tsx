import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { publicFileUrl } from "@/lib/supabase/env";
import { issueLabel } from "@/lib/issue-label";
import I18nFields from "@/components/admin/I18nFields";
import type { Article } from "@/lib/types";
import { updateArticle } from "../../actions";
import PdfReplace from "./PdfReplace";
import { DOI_PATTERN, isDoi } from "@/lib/identifiers";

export default async function EditArticle({ params }: PageProps<"/[locale]/admin/articles/[id]">) {
  await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  const [{ data: a }, { data: issues }] = await Promise.all([
    supabase.from("articles").select("*").eq("id", id).maybeSingle<Article>(),
    supabase.from("issues").select("id, number, is_special, volumes(number, year)").order("created_at", { ascending: false }).limit(50),
  ]);
  if (!a) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/articles" className="text-sm text-brand-600 hover:underline">← {t("common.back")}</Link>
        {a.status === "published" && (
          <Link href={`/article/${a.id}`} className="text-sm text-brand-600 hover:underline">{t("common.view")} ↗</Link>
        )}
      </div>

      <form action={updateArticle} className="card space-y-4">
        <input type="hidden" name="id" value={a.id} />
        <label className="block"><span className="label">{t("common.title")}</span>
          <input name="title" defaultValue={a.title} className="input" required /></label>
        <I18nFields name="title" label={t("admin.titleTranslations")} value={a.title_i18n} />
        <label className="block"><span className="label">{t("article.abstract")}</span>
          <textarea name="abstract" defaultValue={a.abstract} className="input min-h-36" /></label>
        <I18nFields name="abstract" label={t("admin.abstractTranslations")} value={a.abstract_i18n} multiline />
        <label className="block"><span className="label">{t("article.keywords")}</span>
          <input name="keywords" defaultValue={a.keywords.join(", ")} className="input" /></label>
        <label className="block"><span className="label">{t("article.authors")} (JSON)</span>
          <textarea name="authors" defaultValue={JSON.stringify(a.authors, null, 2)} className="input min-h-32 font-mono text-xs" /></label>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-2"><span className="label">{t("admin.selectIssue")}</span>
            <select name="issue_id" defaultValue={a.issue_id ?? ""} className="input">
              <option value="">—</option>
              {((issues ?? []) as unknown as { id: string; number: number; is_special: boolean; volumes: { number: number; year: number } | null }[]).map((i) => (
                <option key={i.id} value={i.id}>{issueLabel(t, i)}</option>
              ))}
            </select></label>
          <label><span className="label">{t("admin.firstPage")}</span><input name="first_page" type="number" defaultValue={a.first_page ?? ""} className="input" /></label>
          <label><span className="label">{t("admin.lastPage")}</span><input name="last_page" type="number" defaultValue={a.last_page ?? ""} className="input" /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">DOI</span>
            <input name="doi" defaultValue={a.doi ?? ""} className="input" placeholder="10.xxxxx/xxxx" pattern={DOI_PATTERN} title={t("ix.badDoi")} aria-describedby="doi-hint" />
            <span id="doi-hint" className="mt-1 block text-xs text-slate-500">
              {a.doi && !isDoi(a.doi) ? <span className="text-red-400">{t("ix.badDoi")}</span>
                : a.doi_status === "registered" ? <span className="text-accent">✓ {t("ix.st_registered")}</span>
                : a.doi_status === "failed" ? <span className="text-red-400">{t("ix.st_failed")}: {a.doi_message}</span>
                : a.doi_status === "queued" ? t("ix.st_queued") : t("ix.doiInputHint")}
            </span>
          </label>
          <label><span className="label">Sort order</span><input name="sort_order" type="number" defaultValue={a.sort_order} className="input" /></label>
        </div>
        <label className="block"><span className="label">{t("article.references")}</span>
          <textarea name="references" defaultValue={a.references ?? ""} className="input min-h-32" /></label>
        <button className="btn-primary">{t("common.save")}</button>
      </form>

      <div className="card space-y-2">
        <h2 className="text-lg">{t("admin.finalPdf")}</h2>
        {a.pdf_path && (
          <a href={publicFileUrl("articles", a.pdf_path)} className="text-sm text-brand-600 hover:underline" target="_blank" rel="noreferrer">
            {a.pdf_path}
          </a>
        )}
        <PdfReplace articleId={a.id} />
      </div>
    </div>
  );
}
