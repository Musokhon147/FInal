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
    const { data } = await supabase.from("editorial_board").select("id, full_name, position, affiliation, academic_degree, photo_url, orcid, position_type, sort_order").eq("id", id).maybeSingle<BoardMember>();
    if (!data) notFound();
    member = data;
  }
  // the email (staff only) and whether it belongs to a registered user, who can then be assigned reviews
  let linked: boolean | null = null;
  if (member) {
    const { data: emails } = await supabase.rpc("board_member_emails");
    const e = ((emails ?? []) as { id: string; email: string; registered: boolean }[]).find((x) => x.id === member!.id);
    member = { ...member, email: e?.email ?? null };
    linked = e ? e.registered : null;
  }
  return (
    <div className="space-y-4">
      <Link href="/admin/board" className="text-sm text-brand-700 hover:underline">← {t("common.back")}</Link>
      <MemberForm member={member} linked={linked} />
    </div>
  );
}
