import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

export default async function CurrentIssue({ params }: PageProps<"/[locale]/current">) {
  const locale = await initLocale(params);
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  redirect({ href: data ? `/issue/${data.id}` : "/archives", locale });
}
