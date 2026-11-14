import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";
import { tr, type I18nText } from "@/lib/i18n-field";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("board");
  return { title: t("title") };
}

type Member = {
  id: string;
  full_name: I18nText;
  position: I18nText;
  affiliation: I18nText;
  photo_url: string | null;
  orcid: string | null;
};

export default async function BoardPage({ params }: PageProps<"/[locale]/board">) {
  const locale = await initLocale(params);
  const t = await getTranslations("board");
  const supabase = await createClient();
  const { data } = await supabase.from("editorial_board").select("*").order("sort_order");
  const members = (data ?? []) as Member[];

  return (
    <div>
      <h1 className="mb-6 text-3xl">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div key={m.id} className="card flex gap-4">
            {m.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 font-serif text-xl text-brand-700">
                {tr(m.full_name, locale).charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-slate-900">{tr(m.full_name, locale)}</p>
              <p className="text-sm text-accent">{tr(m.position, locale)}</p>
              <p className="text-sm text-slate-600">{tr(m.affiliation, locale)}</p>
              {m.orcid && (
                <a href={`https://orcid.org/${m.orcid}`} className="text-xs text-green-700 hover:underline">ORCID</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
