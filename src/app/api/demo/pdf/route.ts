import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { db } from "@/lib/demo/engine";
import { demoSections } from "@/lib/demo/body";

// Demo mode only: sample PDFs. Article files get a typeset multi-page paper; anything else a one-page note.

/** Standard PDF fonts only cover Latin, so other scripts are spelled out in Latin letters. */
const CYR: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ў:"o'",қ:"q",ғ:"g'",ҳ:"h" };
const latin = (s: string) => s.replace(/[а-яёўқғҳ]/gi, (c) => { const l = CYR[c.toLowerCase()] ?? ""; return c === c.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1); })
  .replace(/[‘’ʻʼ]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7e]/g, "");
const esc = (s: string) => latin(s).replace(/[()\\]/g, (c) => "\\" + c);

function wrap(text: string, size: number, width: number) {
  const max = Math.floor(width / (size * 0.45)), lines: string[] = [];
  let line = "";
  for (const w of latin(text).split(/\s+/)) {
    if ((line + " " + w).trim().length > max) { lines.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function buildPdf(pages: string[]) {
  const objs: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids: string[] = [];
  for (const content of pages) {
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const c = objs.length;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${c} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`);
    kids.push(`${objs.length} 0 R`);
  }
  objs[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  return pdf + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
}

type DemoArticle = { title: string; title_i18n?: Record<string, string>; authors: { name: string; affiliation?: string }[]; keywords: string[]; abstract: string; abstract_i18n?: Record<string, string>; first_page?: number; doi?: string };

function articlePages(a: DemoArticle, journal: string) {
  const L = 64, W = 595 - 2 * L;
  const pages: string[] = [];
  let ops: string[] = [], y = 0, page = 0;
  const newPage = () => {
    if (ops.length) pages.push(ops.join("\n"));
    page++; ops = []; y = 770;
    ops.push(`0.35 0.38 0.48 rg BT /F3 8 Tf ${L} 805 Td (${esc(journal)}) Tj ET`);
    ops.push(`BT /F3 8 Tf ${595 - L - 30} 805 Td (${(a.first_page ?? 1) + page - 1}) Tj ET 0 0 0 rg`);
    ops.push(`0.8 0.8 0.85 RG 0.5 w ${L} 798 m ${595 - L} 798 l S`);
  };
  const text = (s: string, font: string, size: number, lead: number, center = false) => {
    for (const ln of wrap(s, size, W)) {
      if (y < 70) newPage();
      const x = center ? Math.max(L, (595 - ln.length * size * 0.48) / 2) : L;
      ops.push(`BT /${font} ${size} Tf ${x.toFixed(1)} ${y} Td (${ln.replace(/[()\\]/g, (c) => "\\" + c)}) Tj ET`);
      y -= lead;
    }
  };
  newPage();
  y = 730;
  text(a.title_i18n?.en || a.title, "F2", 17, 22, true); y -= 8;
  text(a.authors.map((x) => x.name).join(", "), "F1", 11.5, 15, true);
  text(a.authors.map((x) => x.affiliation).filter(Boolean).join("; "), "F1", 9, 12, true); y -= 6;
  if (a.doi) text(`DOI: ${a.doi}`, "F3", 8, 12, true);
  y -= 14;
  for (const s of demoSections(a)) {
    text(s.h, "F2", 11.5, 17); y -= 2;
    for (let k = 0; k < (s.h === "Abstract" ? 1 : 2); k++) { text(s.p, "F1", 10.5, 14.5); y -= 6; }
    if (s.h === "Abstract") { text(`Keywords: ${a.keywords.join(", ")}`, "F1", 10, 14); }
    y -= 10;
  }
  text("References", "F2", 11.5, 17);
  ["Abdullaev, J. (2024). Regional development in Central Asia. Economic Review, 12(3), 45-61.", "World Bank (2025). Uzbekistan country economic update. Washington, DC.", "Smith, A., & Karimov, B. (2023). Institutions and growth. Journal of Development, 8(1), 1-19."].forEach((r, i) => text(`${i + 1}. ${r}`, "F1", 9.5, 13));
  pages.push(ops.join("\n"));
  return pages;
}

/** Simple centred text page (title pages, templates). */
function textPage(lines: [string, number, boolean?][], top = 700) {
  let y = top;
  return lines.map(([txt, size, bold]) => {
    const out = wrap(txt, size, 467).map((ln) => {
      const x = Math.max(64, (595 - ln.length * size * 0.48) / 2);
      const op = `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y} Td (${ln.replace(/[()\\]/g, (c) => "\\" + c)}) Tj ET`;
      y -= size * 1.45;
      return op;
    }).join("\n");
    y -= size * 0.6;
    return out;
  }).join("\n");
}

const TEMPLATE_TITLES: Record<string, string> = {
  "templates/journal-article.pdf": "Sample: scientific journal article",
  "templates/local-thesis.pdf": "Sample: local conference thesis",
  "templates/international-thesis.pdf": "Sample: international conference thesis",
};

function templatePdf(name: string, journal: string) {
  const title = TEMPLATE_TITLES[name] ?? "Sample file";
  return buildPdf([textPage([
    [journal, 10], [title, 18, true], ["", 8],
    ["UDC 000.00", 10], ["TITLE OF THE PAPER (14 pt, bold, centred)", 13, true],
    ["First Author 1, Second Author 2", 11], ["1 University, City, Country; 2 Institute, City, Country", 9], ["e-mail: author@example.uz  ORCID: 0000-0000-0000-0000", 9], ["", 8],
    ["Abstract. 150-250 words describing the aim, methods, results and conclusions of the study.", 10],
    ["Keywords: 5-8 keywords separated by semicolons.", 10], ["", 8],
    ["INTRODUCTION", 11, true], ["State the problem, why it matters and the aim of the paper.", 10],
    ["METHODS", 11, true], ["Describe the data, sample and methods so that the study can be repeated.", 10],
    ["RESULTS AND DISCUSSION", 11, true], ["Present the findings with tables and figures, and compare them with earlier studies.", 10],
    ["CONCLUSION", 11, true], ["Summarise the main results and their practical value.", 10],
    ["REFERENCES", 11, true], ["1. Author, A. (2025). Title of the article. Journal Name, 12(3), 45-61. https://doi.org/...", 9],
    ["Times New Roman 14 pt, line spacing 1.5, margins 2 cm.", 9],
  ], 770)]);
}

function issuePdf(issue: { id: string; title?: Record<string, string>; number: number; is_special?: boolean }, arts: DemoArticle[], journal: string) {
  const name = issue.title?.en || `${issue.is_special ? "Special issue" : "Issue"} ${issue.number}`;
  const cover = textPage([[journal, 14], ["", 30], [name, 22, true], ["", 20], [`${arts.length} papers`, 12], ["", 200], ["Demo collection - generated from the sample articles", 9]], 640);
  const contents = textPage([["Contents", 16, true], ...arts.map((a, i) => [`${i + 1}. ${a.title_i18n?.en || a.title} - ${a.authors.map((x) => x.name).join(", ")}`, 10] as [string, number])], 760);
  return buildPdf([cover, contents, ...arts.flatMap((a) => articlePages(a, journal))]);
}

export async function GET(req: NextRequest) {
  if (!IS_DEMO) return new NextResponse("Not found", { status: 404 });
  const name = (req.nextUrl.searchParams.get("f") ?? "file").replace(/[^\w./-]/g, "").slice(0, 80);
  const data = db();
  const art = data.articles?.find((a) => a.pdf_path === name);
  const journal = data.journals?.[0]?.title?.en ?? "Scientific Journal";
  const issue = !art ? data.issues?.find((i) => i.pdf_path === name) : undefined;
  const pdf = art
    ? buildPdf(articlePages(art, journal))
    : issue
    ? issuePdf(issue, (data.articles ?? []).filter((a) => a.issue_id === issue.id).sort((a, b) => (a.first_page ?? 0) - (b.first_page ?? 0)), journal)
    : TEMPLATE_TITLES[name]
    ? templatePdf(name, journal)
    : buildPdf([`BT /F2 22 Tf 72 760 Td (Demo file) Tj ET\nBT /F1 12 Tf 72 732 Td (${esc(name)}) Tj ET\nBT /F1 12 Tf 72 710 Td (Real PDFs appear here once Supabase is connected.) Tj ET`]);
  return new NextResponse(pdf, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${art ? art.id : issue ? issue.id : name.split("/").pop()?.replace(/\.pdf$/, "") || "demo"}.pdf"`, "cache-control": "public, max-age=300" } });
}
