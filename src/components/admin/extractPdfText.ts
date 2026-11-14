/** Pulls the text out of a PDF in the browser (pdf.js), so the article can be found by its full text. */
export async function extractPdfText(file: File, maxChars = 200_000): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages && out.length < maxChars; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      out += content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("") + "\n\n";
    }
    await doc.destroy();
    return out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxChars) || null;
  } catch {
    return null; // scanned PDFs have no text layer; the article is still searchable by title and abstract
  }
}
