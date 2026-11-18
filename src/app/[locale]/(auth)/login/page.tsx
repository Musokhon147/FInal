import { initLocale } from "@/lib/locale";
import AuthForm from "../AuthForm";
import { login } from "../actions";

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  await initLocale(params);
  const { next, confirmed, link } = await searchParams;
  const notice = confirmed === "1" ? "confirmed" : link === "expired" ? "expired" : undefined;
  return <AuthForm mode="login" action={login} next={typeof next === "string" ? next : undefined} notice={notice} />;
}
