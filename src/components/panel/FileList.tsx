import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/i18n-field";
import type { SubmissionFile } from "@/lib/types";

/** Lists submission files with short-lived signed download links. */
export default async function FileList({
  supabase,
  files,
}: {
  supabase: SupabaseClient;
  files: SubmissionFile[];
}) {
  const t = await getTranslations("common");
  const locale = await getLocale();
  if (!files.length) return <p className="text-sm text-slate-500">{t("none")}</p>;
  const { data: signed } = await supabase.storage
    .from("manuscripts")
    .createSignedUrls(files.map((f) => f.storage_path), 60 * 60);

  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {files.map((f, i) => (
        <li key={f.id} className="flex items-center justify-between gap-3 py-2">
          <span>
            <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">{f.kind}</span>
            {f.file_name}
            <span className="ml-2 text-slate-400">v{f.version} · {formatDate(f.created_at, locale)}</span>
          </span>
          {signed?.[i]?.signedUrl && (
            <a href={signed[i].signedUrl} className="text-brand-600 hover:underline">{t("download")}</a>
          )}
        </li>
      ))}
    </ul>
  );
}
