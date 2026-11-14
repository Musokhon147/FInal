import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n-field";
import type { Profile } from "@/lib/types";
import { updateUserRole } from "../actions";

export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const locale = await initLocale(params);
  const t = await getTranslations("admin");
  const { supabase, profile: me } = await getSession();
  if (me?.role !== "admin") redirect({ href: "/admin", locale });

  const { q: raw } = await searchParams;
  const q = typeof raw === "string" ? raw.trim().replace(/[%,()]/g, "") : "";
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data } = await query;
  const users = (data ?? []) as Profile[];

  return (
    <div className="card">
      <h1 className="mb-4 text-2xl">{t("users")}</h1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchUsers")} className="input max-w-sm" />
        <button className="btn-secondary">🔍</button>
      </form>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>{t("role")}</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="font-medium">{u.full_name || "—"}</span>
                  <span className="block text-xs text-slate-500">{u.email} · {u.affiliation}</span>
                  <span className="block text-xs text-slate-400">{formatDate(u.created_at, locale)}</span>
                </td>
                <td colSpan={2}>
                  <form action={updateUserRole} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-40" disabled={u.id === me?.id}>
                      <option value="user">{t("roles_user")}</option>
                      <option value="editor">{t("roles_editor")}</option>
                      <option value="admin">{t("roles_admin")}</option>
                    </select>
                    {u.id === me?.id && <input type="hidden" name="role" value={u.role} />}
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" name="is_reviewer" defaultChecked={u.is_reviewer} /> {t("isReviewer")}
                    </label>
                    <button className="btn-secondary py-1">✓</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
