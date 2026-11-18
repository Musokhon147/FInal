import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { publicFileUrl } from "@/lib/supabase/env";
import { PUB_TYPES } from "@/lib/pubtypes";
import type { AuthorKits } from "@/lib/types";
import KitsForm from "./KitsForm";

export default async function AdminForAuthors({ params }: PageProps<"/[locale]/admin/for-authors">) {
  await initLocale(params);
  const t = await getTranslations();
  const { supabase } = await getSession();
  const [{ data: j }, { data: page }] = await Promise.all([
    supabase.from("journals").select("author_kits").eq("is_active", true).order("sort_order").limit(1).maybeSingle(),
    supabase.from("pages").select("id").eq("slug", "author-guidelines").maybeSingle(),
  ]);
  const kits = ((j?.author_kits ?? {}) as AuthorKits);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{t("pt.forAuthorsAdmin")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("pt.forAuthorsIntro")}</p>
        </div>
        <Link href="/for-authors" className="btn-secondary text-sm">{t("x.viewOnSite")}</Link>
      </div>
      <KitsForm initial={Object.fromEntries(PUB_TYPES.map((k) => [k, {
        guide: kits[k]?.guide ?? {}, template: kits[k]?.template ?? null,
        templateUrl: kits[k]?.template ? publicFileUrl("articles", kits[k]!.template!) : null,
      }]))} />
      {page && (
        <p className="text-sm text-slate-500">
          {t("pt.editAbout")}: <Link href={`/admin/pages/${page.id}`} className="font-semibold text-brand-700 hover:underline">{t("admin.pages")}</Link>
        </p>
      )}
    </div>
  );
}
