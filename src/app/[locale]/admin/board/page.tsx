import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { tr } from "@/lib/i18n-field";
import type { BoardMember } from "@/lib/types";

export default async function AdminBoard({ params }: PageProps<"/[locale]/admin/board">) {
  const locale = await initLocale(params);
  const t = await getTranslations();
  const { supabase } = await getSession();
  const [{ data }, { data: emails }] = await Promise.all([
    supabase.from("editorial_board").select("id, full_name, position, affiliation, academic_degree, position_type, sort_order").order("sort_order"),
    supabase.rpc("board_member_emails"),
  ]);
  const mail = new Map(((emails ?? []) as { id: string; email: string; registered: boolean }[]).map((e) => [e.id, e]));
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t("nav.board")}</h1>
        <Link href="/admin/board/new" className="btn-primary">+ {t("x.addMember")}</Link>
      </div>
      <ul className="divide-y divide-slate-200">
        {((data ?? []) as BoardMember[]).map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <Link href={`/admin/board/${m.id}`} className="font-medium text-brand-700 hover:underline">{tr(m.full_name, locale)}</Link>
              <p className="text-xs text-slate-500">{[tr(m.academic_degree ?? {}, locale), tr(m.affiliation, locale)].filter(Boolean).join(" · ")}</p>
              <p className="text-xs text-slate-500">{tr(m.position, locale)} · {t(`x.g_${m.position_type || "member"}`)}{mail.get(m.id) ? ` · ${mail.get(m.id)!.email}${mail.get(m.id)!.registered ? " ✓" : ""}` : ""}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
