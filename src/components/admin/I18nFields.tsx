import type { I18nText } from "@/lib/i18n-field";

const LANGS = [
  ["uz", "O'zbekcha"],
  ["ru", "Русский"],
  ["en", "English"],
] as const;

/** Three inputs (uz / ru / en) for one translatable field. Field names: `${name}_uz` etc. */
export default function I18nFields({
  name,
  label,
  value,
  multiline,
  required,
}: {
  name: string;
  label: string;
  value?: I18nText;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <fieldset className="rounded-md border border-slate-200 p-3">
      <legend className="px-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className={multiline ? "space-y-3" : "grid gap-2 sm:grid-cols-3"}>
        {LANGS.map(([code, langName]) => (
          <label key={code} className="block">
            <span className="mb-1 block text-xs uppercase text-slate-500">{langName}</span>
            {multiline ? (
              <textarea name={`${name}_${code}`} defaultValue={value?.[code] ?? ""} className="input min-h-40 font-mono text-xs"
                required={required && code === "uz"} />
            ) : (
              <input name={`${name}_${code}`} defaultValue={value?.[code] ?? ""} className="input" required={required && code === "uz"} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
