import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import type { BoardMember } from "@/lib/types";
import MemberForm from "./MemberForm";

export default async function EditMember({ params }: PageProps<"/[locale]/admin/board/[id]">) {
  await initLocale(params);
  const { id } = await params;
  const t = await getTranslations();
  const { supabase } = await getSession();
  let member: BoardMember | null = null;
  if (id !== "new") {
    const { data } = await supabase.from("editorial_board").select("*").eq("id", id).maybeSingle<BoardMember>();
    if (!data) notFound();
    member = data;
  }
  return (
    <div className="space-y-4">
      <Link href="/admin/board" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <MemberForm member={member} />
    </div>
  );
}
