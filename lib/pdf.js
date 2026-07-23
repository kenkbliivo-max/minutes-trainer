import path from "path";
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// CJS/ESM相互運用: 環境によって本体がdefault側に入ることがある
const pdfjs = pdfjsLib.getDocument ? pdfjsLib : pdfjsLib.default;

// 日本語CMap等の同梱ファイルの場所を探す(見つからなくても動作は継続)
function pdfjsAssetPath(sub) {
  const candidates = [
    path.join(process.cwd(), "node_modules", "pdfjs-dist", sub),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c + path.sep;
    } catch {}
  }
  return null;
}

// pdfjs-distでPDFからテキストを抽出する
export async function extractPdfText(buffer) {
  const opts = {
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  };
  const cMapUrl = pdfjsAssetPath("cmaps");
  if (cMapUrl) {
    opts.cMapUrl = cMapUrl;
    opts.cMapPacked = true;
  }
  const standardFontDataUrl = pdfjsAssetPath("standard_fonts");
  if (standardFontDataUrl) opts.standardFontDataUrl = standardFontDataUrl;

  const doc = await pdfjs.getDocument(opts).promise;

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
