import { getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import Importer from "./Importer";

export default async function ImportPage({ params }: PageProps<"/[locale]/admin/import">) {
  await initLocale(params);
  const t = await getTranslations("adm");
  const { supabase } = await getSession();
  const { data: vols } = await supabase.from("volumes").select("number, year");
  return (
    <div>
      <h1 className="text-3xl">{t("import")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("importIntro")}</p>
      <Importer volumes={(vols ?? []) as { number: number; year: number }[]} />
    </div>
  );
}
