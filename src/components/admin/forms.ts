export const i18nOf = (fd: FormData, name: string) => ({
  uz: String(fd.get(`${name}_uz`) ?? "").trim(),
  ru: String(fd.get(`${name}_ru`) ?? "").trim(),
  en: String(fd.get(`${name}_en`) ?? "").trim(),
});
