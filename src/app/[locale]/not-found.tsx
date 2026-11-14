import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations();
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <span data-scene="text:404" hidden />
      <p className="font-serif text-[clamp(5rem,16vw,10rem)] font-light leading-none text-accent">404</p>
      <h1 className="mt-4 text-3xl">{t("x.notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-slate-600">{t("x.notFoundText")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">{t("x.goHome")}</Link>
        <Link href="/search" className="btn-secondary">{t("nav.search")}</Link>
      </div>
    </div>
  );
}
