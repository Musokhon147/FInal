import { NextResponse, type NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/supabase/env";

// Demo mode only: a one-page placeholder PDF for every file link.
export async function GET(req: NextRequest) {
  if (!IS_DEMO) return new NextResponse("Not found", { status: 404 });
  const name = (req.nextUrl.searchParams.get("f") ?? "file").replace(/[^\w./-]/g, "").slice(0, 80);
  const text = (s: string) => s.replace(/[()\\]/g, "");
  const stream = `BT /F1 22 Tf 72 740 Td (Demo file) Tj ET\nBT /F1 12 Tf 72 712 Td (${text(name)}) Tj ET\nBT /F1 12 Tf 72 690 Td (Real PDFs appear here once Supabase is connected.) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new NextResponse(pdf, {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="demo.pdf"` },
  });
}
