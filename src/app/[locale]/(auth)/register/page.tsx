import { initLocale } from "@/lib/locale";
import AuthForm from "../AuthForm";
import { register } from "../actions";

export default async function RegisterPage({ params }: PageProps<"/[locale]/register">) {
  await initLocale(params);
  return <AuthForm mode="register" action={register} />;
}
