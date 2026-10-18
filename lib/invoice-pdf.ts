import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { dateText, money } from "./invoices";
export type PrintableInvoice = {
  number: string | null; status: string; accountCode: string; customerName: string; customerAddress: string; customerEmail: string; reference: string;
  issuerName: string; issuerAddress: string; issuerEmail: string; paymentInstructions: string; invoiceDate: Date; dueDate: Date; notes: string; totalPence: number; voidReason: string | null;
  lines: { description: string; quantity: { toString(): string }; unitPricePence: number; totalPence: number }[];
  payments: { amountPence: number; removedAt: Date | null }[];
};
export async function createInvoicePdf(invoice: PrintableInvoice) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.1, .18, .21), green = rgb(.06, .29, .24), muted = rgb(.4, .47, .5), pale = rgb(.95, .97, .96);
  const W = 595.28, H = 841.89, left = 48, right = W - 48;
  let page = pdf.addPage([W, H]), y = H - 140;
  const safe = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\t/g, " ").split("").map(c => { if (c === "\n" || c === "\r") return c; try { normal.encodeText(c); return c; } catch { return "?"; } }).join("");
  const draw = (text: string, x: number, yy: number, size = 10, strong = false, color = ink) => page.drawText(safe(text), { x, y: yy, size, font: strong ? bold : normal, color });
  const rightText = (text: string, xx: number, yy: number, size = 10, strong = false) => draw(text, xx - (strong ? bold : normal).widthOfTextAtSize(safe(text), size), yy, size, strong);
  const line = (yy: number) => page.drawLine({ start: { x: left, y: yy }, end: { x: right, y: yy }, thickness: .6, color: rgb(.8, .85, .83) });
  function wrap(text: string, width: number, size = 10, strong = false) {
    const font = strong ? bold : normal;
    const result: string[] = [];
    for (const paragraph of safe(text).split(/\r?\n/)) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (font.widthOfTextAtSize((current ? current + " " : "") + word, size) <= width) { current += (current ? " " : "") + word; continue; }
        if (current) { result.push(current); current = ""; }
        for (const character of word) {
          if (font.widthOfTextAtSize(current + character, size) > width) { result.push(current); current = ""; }
          current += character;
        }
      }
      result.push(current);
    }
    return result;
  }
  function header() {
    page.drawRectangle({ x: 0, y: H - 103, width: W, height: 103, color: green });
    draw("THE ESSEX", left, H - 40, 20, true, rgb(1, 1, 1));
    draw(invoice.accountCode === "MENS" ? "MEN'S ACCOUNT" : "CLUB ACCOUNT", left, H - 61, 9, true, rgb(.8, .9, .85));
    draw(invoice.status === "DRAFT" ? "DRAFT INVOICE" : invoice.status === "VOID" ? "VOID INVOICE" : "INVOICE", left, H - 84, 11, true, rgb(1, 1, 1));
    const number = invoice.number ?? "Not yet issued";
    page.drawText(number, { x: right - bold.widthOfTextAtSize(number, 11), y: H - 43, size: 11, font: bold, color: rgb(1, 1, 1) });
  }
  function room(height: number) { if (y - height < 66) { page = pdf.addPage([W, H]); header(); y = H - 130; return true; } return false; }
  function block(heading: string, text: string) {
    if (!text.trim()) return;
    room(44); draw(heading.toUpperCase(), left, y, 9, true, muted); y -= 16;
    for (const row of wrap(text, right - left)) { room(13); draw(row, left, y); y -= 13; }
    y -= 12;
  }
  header();
  draw(`Invoice date: ${dateText(invoice.invoiceDate)}`, left, y);
  draw(`Payment due: ${dateText(invoice.dueDate)}`, 325, y); y -= 26;
  if (invoice.status === "DRAFT") block("Draft", "For review only. This invoice has not been issued.");
  if (invoice.status === "VOID") block("Voided", invoice.voidReason ?? "This invoice has been voided.");
  block("From", [invoice.issuerName, invoice.issuerAddress, invoice.issuerEmail].filter(Boolean).join("\n"));
  block("Bill to", [invoice.customerName, invoice.customerAddress, invoice.customerEmail].filter(Boolean).join("\n"));
  if (invoice.reference) block("Customer reference", invoice.reference);
  function tableHeader() {
    room(38); page.drawRectangle({ x: left, y: y - 9, width: right - left, height: 27, color: pale });
    draw("DESCRIPTION", left + 8, y, 8, true); rightText("QTY", 366, y, 8, true); rightText("UNIT PRICE", 451, y, 8, true); rightText("AMOUNT", right - 8, y, 8, true); y -= 31;
  }
  tableHeader();
  for (const item of invoice.lines) {
    const rows = wrap(item.description, 250, 10), height = Math.max(32, rows.length * 14 + 16);
    if (room(height + 10)) tableHeader();
    rows.forEach((row, index) => draw(row, left + 8, y - index * 14));
    rightText(item.quantity.toString(), 366, y); rightText(money(item.unitPricePence), 451, y, 9); rightText(money(item.totalPence), right - 8, y, 9);
    y -= height; line(y + 10);
  }
  const paid = invoice.payments.filter(p => !p.removedAt).reduce((sum, p) => sum + p.amountPence, 0);
  room(118); y -= 15;
  draw("TOTAL (GBP)", 325, y, 11, true); rightText(money(invoice.totalPence), right - 8, y, 12, true); y -= 23;
  draw("Payments allocated", 325, y, 10); rightText(money(paid), right - 8, y); y -= 24;
  draw(invoice.status === "VOID" ? "VOID" : "BALANCE DUE", 325, y, 11, true); rightText(invoice.status === "VOID" ? "-" : money(invoice.totalPence - paid), right - 8, y, 12, true); y -= 38;
  block("Payment instructions", invoice.paymentInstructions + (invoice.number ? `\nPlease quote ${invoice.number} when paying.` : ""));
  block("Notes", invoice.notes);
  for (const [i, p] of pdf.getPages().entries()) {
    p.drawLine({ start: { x: left, y: 46 }, end: { x: right, y: 46 }, thickness: .6, color: rgb(.8, .85, .83) });
    p.drawText(`THE ESSEX | ${invoice.number ?? "DRAFT"}`, { x: left, y: 31, size: 8, font: normal, color: muted });
    const footer = `Page ${i + 1} of ${pdf.getPageCount()}`;
    p.drawText(footer, { x: right - normal.widthOfTextAtSize(footer, 8), y: 31, size: 8, font: normal, color: muted });
  }
  return pdf.save();
}
