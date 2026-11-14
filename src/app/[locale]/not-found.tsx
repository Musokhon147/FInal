import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("nav");
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="text-4xl">404</h1>
      <Link href="/" className="mt-4 inline-block text-brand-600 underline">{t("home")}</Link>
    </div>
  );
}
