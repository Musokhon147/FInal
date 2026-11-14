import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { getSession } from "@/lib/auth";
import { getJournal } from "@/lib/data";
import SettingsForm from "./SettingsForm";

export default async function AdminSettings({ params }: PageProps<"/[locale]/admin/settings">) {
  const locale = await initLocale(params);
  const { profile } = await getSession();
  if (profile?.role !== "admin") redirect({ href: "/admin", locale });
  const journal = await getJournal();
  if (!journal) return null;
  return <SettingsForm journal={journal} />;
}
