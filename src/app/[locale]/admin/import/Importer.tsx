"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { parseCsv, toCsv } from "@/lib/csv";
import { uploadArticlePdf } from "@/components/admin/uploadPdf";
import { extractPdfText } from "@/components/admin/extractPdfText";
import { importArticles, type ImportRow } from "../actions";

const COLUMNS = ["volume", "year", "issue", "issue_date", "special", "section", "title", "title_ru", "title_en", "authors", "abstract", "keywords", "language", "pages", "doi", "pdf_file"] as const;
const REQUIRED = ["volume", "year", "issue", "issue_date", "title", "authors"] as const;
const EXAMPLE = [
  ["1", "2024", "1", "2024-06-01", "no", "", "Raqamli iqtisodiyot va kichik biznes", "Цифровая экономика и малый бизнес", "Digital economy and small business",
    "Karimov Aziz | Toshkent davlat iqtisodiyot universiteti | 0000-0002-1825-0097; Rahimova Dilnoza | Samarqand davlat universiteti", "Maqolada…", "raqamli iqtisodiyot; kichik biznes", "uz", "1-10", "10.00000/old.2024.1", "article-1.pdf"],
];

type Parsed = { line: number; row: ImportRow | null; errors: string[]; pdfName: string };

export default function Importer({ volumes }: { volumes: { number: number; year: number }[] }) {
  const t = useTranslations("adm");
  const [csvName, setCsvName] = useState("");
  const [records, setRecords] = useState<Record<string, string>[] | null>(null);
  const [fileError, setFileError] = useState(false);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [skipDoi, setSkipDoi] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([toCsv([[...COLUMNS], ...EXAMPLE])], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "archive-import-template.csv" });
    a.click(); URL.revokeObjectURL(url);
  };

  const readCsv = async (f: File | undefined) => {
    setResult(null); setError(null); setFileError(false);
    if (!f) return;
    setCsvName(f.name);
    try {
      const rows = parseCsv(await f.text());
      const head = rows[0].map((h) => h.trim().toLowerCase());
      if (!REQUIRED.every((c) => head.includes(c))) throw new Error("columns");
      setRecords(rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()]))));
    } catch { setRecords(null); setFileError(true); }
  };

  const byName = useMemo(() => new Map(pdfs.map((f) => [f.name.toLowerCase(), f])), [pdfs]);

  const parsed: Parsed[] = useMemo(() => (records ?? []).map((r, i) => {
    const errors: string[] = [];
    for (const c of REQUIRED) if (!r[c]) errors.push(t("errRequired", { f: c }));
    const num = (c: string) => { if (!r[c]) return null; const n = Number(r[c]); if (!Number.isInteger(n)) { errors.push(t("errNumber", { f: c })); return null; } return n; };
    const volume = num("volume"), year = num("year"), issue = num("issue");
    if (r.issue_date && !/^\d{4}-\d{2}-\d{2}$/.test(r.issue_date)) errors.push(t("errDate"));
    const clash = volumes.find((v) => v.number === volume && v.year !== year);
    if (clash && year !== null) errors.push(t("errVolumeYear", { n: clash.number, year: clash.year }));
    const [p1, p2] = (r.pages || "").split(/[-–]/).map((x) => (x.trim() ? Number(x) : null));
    const pdfName = r.pdf_file || "";
    if (pdfName && pdfs.length && !byName.has(pdfName.toLowerCase())) errors.push(t("errPdf", { f: pdfName }));
    const authors = (r.authors || "").split(";").map((a) => a.trim()).filter(Boolean).map((a) => {
      const [name, affiliation, orcid] = a.split("|").map((x) => x.trim());
      return { name, ...(affiliation ? { affiliation } : {}), ...(orcid ? { orcid } : {}) };
    });
    const row: ImportRow | null = errors.length ? null : {
      volume: volume!, year: year!, issue: issue!, issue_date: r.issue_date, special: /^(yes|ha|да|1|true)$/i.test(r.special || ""), section: r.section || "",
      title: r.title, title_ru: r.title_ru || "", title_en: r.title_en || "", authors, abstract: r.abstract || "",
      keywords: (r.keywords || "").split(/[;,]/).map((k) => k.trim()).filter(Boolean), language: ["uz", "ru", "en"].includes(r.language) ? r.language : "uz",
      first_page: Number.isFinite(p1) ? p1 : null, last_page: Number.isFinite(p2) ? p2 : null, doi: r.doi || "", pdf_path: null, full_text: null,
    };
    return { line: i + 2, row, errors, pdfName };
  }), [records, pdfs, byName, t, volumes]);

  const ok = parsed.filter((p) => p.row);
  const matched = ok.filter((p) => p.pdfName && byName.has(p.pdfName.toLowerCase())).length;

  const run = async () => {
    setError(null); setResult(null);
    const total = ok.length, sum = { added: 0, skipped: 0 };
    setProgress({ done: 0, total });
    try {
      for (let i = 0; i < ok.length; i += 10) {
        const batch = await Promise.all(ok.slice(i, i + 10).map(async (p) => {
          const file = p.pdfName ? byName.get(p.pdfName.toLowerCase()) : undefined;
          if (!file) return p.row!;
          const [path, text] = await Promise.all([uploadArticlePdf(file), extractPdfText(file)]);
          return { ...p.row!, pdf_path: path, full_text: text };
        }));
        const r = await importArticles(batch, skipDoi);
        sum.added += r.added; sum.skipped += r.skipped;
        setProgress({ done: Math.min(i + 10, total), total });
      }
      setResult(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setProgress(null); }
  };

  const step = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-slate-50";
  return (
    <div className="mt-6 space-y-5">
      <section className="card flex gap-4 p-6">
        <span className={step}>1</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{t("step1")}</h2>
          <button onClick={downloadTemplate} className="btn-secondary mt-3 text-sm">{t("template")} (.csv)</button>
          <details className="mt-3 text-sm text-slate-600">
            <summary className="cursor-pointer text-slate-500">{t("columnsHelp")}</summary>
            <ul className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-2">
              {COLUMNS.map((c) => <li key={c}>{c}{(REQUIRED as readonly string[]).includes(c) ? " *" : ""}</li>)}
            </ul>
            <p className="mt-2 text-xs">authors: <code>Name | Affiliation | ORCID; Name 2 | Affiliation 2</code> · keywords: <code>a; b; c</code> · pages: <code>1-10</code> · special: <code>yes/no</code></p>
          </details>
        </div>
      </section>

      <section className="card flex gap-4 p-6">
        <span className={step}>2</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{t("step2")}</h2>
          <input type="file" accept=".csv,text/csv" className="mt-3 block text-sm" onChange={(e) => readCsv(e.target.files?.[0])} aria-label={t("step2")} />
          {fileError && <p className="mt-2 text-sm text-red-400" role="alert">{t("errFile")}</p>}
          {records && <p className="mt-2 text-sm text-slate-600">{csvName}: {t("rowsFound", { n: records.length })}</p>}
        </div>
      </section>

      <section className="card flex gap-4 p-6">
        <span className={step}>3</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{t("step3")}</h2>
          <input type="file" accept="application/pdf" multiple className="mt-3 block text-sm" onChange={(e) => setPdfs([...(e.target.files ?? [])])} aria-label={t("step3")} />
          {pdfs.length > 0 && records && <p className="mt-2 text-sm text-slate-600">{t("pdfMatched", { n: matched })} / {pdfs.length}</p>}
        </div>
      </section>

      {records && (
        <section className="card flex gap-4 p-6">
          <span className={step}>4</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{t("step4")}</h2>
            <p className="mt-2 text-sm">
              <span className="text-accent">{t("rowsOk", { n: ok.length })}</span>
              {parsed.length - ok.length > 0 && <> · <span className="text-red-400">{t("rowsBad", { n: parsed.length - ok.length })}</span></>}
            </p>
            <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-slate-100"><tr className="text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">{t("row")}</th><th className="px-3 py-2 font-medium">{t("title")}</th><th className="px-3 py-2 font-medium">Vol./No.</th><th className="px-3 py-2 font-medium">PDF</th><th className="px-3 py-2 font-medium">{t("status")}</th>
                </tr></thead>
                <tbody>
                  {parsed.slice(0, 300).map((p) => (
                    <tr key={p.line} className="border-t border-slate-200/70 align-top">
                      <td className="px-3 py-2 tabular-nums text-slate-500">{p.line}</td>
                      <td className="px-3 py-2 text-slate-900">{records[p.line - 2]?.title || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums text-slate-600">{records[p.line - 2]?.volume}/{records[p.line - 2]?.issue}</td>
                      <td className="px-3 py-2 text-slate-600">{p.pdfName ? (byName.has(p.pdfName.toLowerCase()) ? "✓" : p.pdfName) : "—"}</td>
                      <td className="px-3 py-2">{p.errors.length ? <span className="text-red-400">{p.errors.join("; ")}</span> : <span className="text-accent">{t("ok")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={skipDoi} onChange={(e) => setSkipDoi(e.target.checked)} /> {t("skipExisting")}
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button className="btn-primary" disabled={!ok.length || !!progress} onClick={run}>{t("startImport", { n: ok.length })}</button>
              {progress && (
                <span className="flex items-center gap-3 text-sm text-slate-600" role="status">
                  <span className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200"><span className="block h-full bg-accent transition-all" style={{ width: `${(100 * progress.done) / Math.max(progress.total, 1)}%` }} /></span>
                  {t("importing", { done: progress.done, total: progress.total })}
                </span>
              )}
              {result && (
                <span className="text-sm text-accent" role="status">
                  {t("importDone", { n: result.added })}{result.skipped ? ` (${result.skipped} ${t("skipped")})` : ""} <Link href="/archives" className="ml-2 font-semibold underline">{t("viewArchive")}</Link>
                </span>
              )}
              {error && <span className="text-sm text-red-400" role="alert">{error}</span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
