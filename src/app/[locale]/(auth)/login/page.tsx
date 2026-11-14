import { initLocale } from "@/lib/locale";
import AuthForm from "../AuthForm";
import { login } from "../actions";

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  await initLocale(params);
  const { next } = await searchParams;
  return <AuthForm mode="login" action={login} next={typeof next === "string" ? next : undefined} />;
}
