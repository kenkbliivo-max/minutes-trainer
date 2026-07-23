import path from "path";
import { createRequire } from "module";

const require_ = createRequire(import.meta.url);

// pdfjs-dist(日本語CMap同梱)でPDFからテキストを抽出する
export async function extractPdfText(buffer) {
  const pdfjs = require_("pdfjs-dist/legacy/build/pdf.js");
  const pkgDir = path.dirname(require_.resolve("pdfjs-dist/package.json"));
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: path.join(pkgDir, "cmaps") + path.sep,
    cMapPacked: true,
    standardFontDataUrl: path.join(pkgDir, "standard_fonts") + path.sep,
    useSystemFonts: true,
  }).promise;

  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let last = null;
    let line = "";
    const lines = [];
    for (const item of tc.items) {
      if (last && Math.abs(item.transform[5] - last.transform[5]) > 2) {
        lines.push(line);
        line = "";
      }
      line += item.str;
      last = item;
    }
    if (line) lines.push(line);
    text += lines.join("\n") + "\n";
  }
  await doc.destroy();
  return text.trim();
}
