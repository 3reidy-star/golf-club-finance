import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument } from "pdf-lib";
// Embed the font already shipped in the pinned Next.js package. Embedded glyphs
// keep spacing stable across PDF viewers and printers without system fonts.
export async function embedReportFont(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  const bytes = await readFile(join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"));
  return pdf.embedFont(bytes, { subset: true });
}
