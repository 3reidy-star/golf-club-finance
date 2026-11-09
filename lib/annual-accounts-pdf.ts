import { PDFDocument, rgb } from "pdf-lib";
import { embedReportFont } from "./pdf-fonts";
import { loadAnnualAccounts } from "./annual-accounts-data";
import { annualActivityRows, type AnnualReport } from "./annual-accounts";
const money = (value: number | null) => value === null ? "Not confirmed" : `${value < 0 ? "-" : ""}£${(Math.abs(value) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function renderAnnualPack(current: AnnualReport, summaryOnly = false) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`The Essex - ${current.name} - Annual accounts ${current.year}`);
  const normal = await embedReportFont(pdf), bold = normal;
  const W = 595.28, H = 841.89, L = 48, R = W - L;
  const navy = rgb(0.08, 0.18, 0.23), green = rgb(0.08, 0.35, 0.28), grey = rgb(0.40, 0.45, 0.46), pale = rgb(0.94, 0.96, 0.95), line = rgb(0.82, 0.86, 0.84), amber = rgb(0.56, 0.31, 0.06);
  let page = pdf.addPage([W, H]), y = 700;
  const clean = (value: string) => value.replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7e£\n]/g, " ");
  const text = (value: string, x: number, baseline: number, size = 10, strong = false, color = navy) => page.drawText(clean(value), { x, y: baseline, size, font: strong ? bold : normal, color });
  function wrap(value: string, width: number, size = 10, strong = false) {
    const font = strong ? bold : normal, lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        if (font.widthOfTextAtSize(`${current} ${word}`, size) > width && current) { lines.push(current); current = word; }
        else current = current ? `${current} ${word}` : word;
      }
      lines.push(current);
    }
    return lines;
  }
  function header(title: string, subtitle: string) {
    page.drawRectangle({ x: 0, y: H - 106, width: W, height: 106, color: navy });
    text("THE ESSEX", L, H - 35, 21, true, rgb(1, 1, 1));
    text("GOLF & COUNTRY CLUB", L, H - 55, 9, false, rgb(0.78, 0.85, 0.81));
    text(current.name.toUpperCase(), L, H - 81, 11, true, rgb(1, 1, 1));
    text(String(current.year), R - 58, H - 45, 25, true, rgb(1, 1, 1));
    text(title, L, 710, 22, true); text(subtitle, L, 688, 10, false, grey); y = 655;
  }
  function newPage(title: string, subtitle = `Year ended 31 October ${current.year}`) { page = pdf.addPage([W, H]); header(title, subtitle); }
  function room(height: number, title = "Accounts - continued") { if (y - height < 76) newPage(title); }
  function paragraph(value: string, size = 10, color = grey) {
    for (const valueLine of wrap(value, R - L, size)) { room(15); text(valueLine, L, y, size, false, color); y -= size + 5; } y -= 7;
  }
  function section(title: string) { room(45); y -= 9; text(title.toUpperCase(), L, y, 10, true, green); y -= 13; page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.8, color: line }); y -= 23; }
  function row(label: string, value: number | null, strong = false) {
    const lines = wrap(label, R - L - 155, 10, strong); const h = Math.max(22, lines.length * 13 + 7); room(h);
    if (strong) page.drawRectangle({ x: L - 5, y: y - h + 11, width: R - L + 10, height: h, color: pale });
    for (let i = 0; i < lines.length; i++) text(lines[i], L + 3, y - i * 13, 10, strong);
    const amount = money(value); text(amount, R - (strong ? bold : normal).widthOfTextAtSize(amount, 11) - 3, y, 11, strong, value === null ? amber : navy); y -= h;
  }
  function activityHeading() {
    text("Activity", L + 3, y, 9, true, grey);
    for (const [label, right] of [["Revenue", 350], ["Expenditure", 448], ["Net", R]] as const) text(label, right - normal.widthOfTextAtSize(label, 9), y, 9, true, grey);
    y -= 25;
  }
  function activityRow(name: string, revenue: number, expenditure: number, net: number, total = false) {
    const lines = wrap(name, 192, 10), height = Math.max(26, lines.length * 13 + 9);
    if (y - height < 76) { newPage("Revenue and expenditure - continued"); activityHeading(); }
    if (total) page.drawRectangle({ x: L - 5, y: y - height + 11, width: R - L + 10, height, color: pale });
    lines.forEach((value, i) => text(value, L + 3, y - i * 13, 10, total));
    for (const [value, right] of [[revenue, 350], [expenditure, 448], [net, R]] as const) {
      const display = money(value); text(display, right - normal.widthOfTextAtSize(display, 10), y, 10, total);
    }
    y -= height;
  }
  header("Annual accounts - AGM summary", `1 November ${current.year - 1} to 31 October ${current.year}`);
  // This first page stands alone as the presentation handout.
  const cards: [string, number | null][] = [["OPENING BANK", current.openingBank], ["CLOSING BANK", current.closingBank], ["AVAILABLE BANK & CASH", current.closingFunds]];
  cards.forEach(([label, value], i) => {
    const x = L + i * 171; page.drawRectangle({ x, y: 571, width: 157, height: 77, color: pale });
    text(label, x + 10, 628, 8, true, green); text(money(value), x + 10, 596, value === null ? 14 : 19, true);
  });
  y = 544; section("The year in figures"); activityHeading();
  activityRow("Annual total", current.totalIncome, current.totalExpense, current.surplus, true);
  paragraph("Net shows revenue less expenditure. A negative amount is a deficit.", 9);
  section("Year-end funds");
  row("Bank and cash on hand", current.closingCash === null ? null : current.closingBank + current.closingCash);
  if (current.code === "MENS") row("Less Thommo's Charity funds held", -current.charity.closing);
  if (current.code === "MENS") row("Less Juniors' money held", current.juniorClosing === null ? null : -current.juniorClosing);
  row("Available bank and cash before other balances", current.closingFunds, true);
  const narrative = current.commentary || `The account closed with ${money(current.closingBank)} in the bank${current.closingCash === null ? "; cash is awaiting confirmation" : ` and ${money(current.closingCash)} cash on hand`}. ${current.code === "MENS" ? "Charity and Juniors' funds are held separately from the section's available funds." : "The Club and Men's accounts are reported separately."}`;
  section("Treasurer's commentary");
  // Keep the handout to one page; full commentary is repeated with the notes.
  for (const value of wrap(narrative, R - L, 10).slice(0, 4)) { text(value, L, y, 10, false, grey); y -= 15; }
  if (current.issues.length) text(`Draft: ${current.issues.length} review item(s). See the reconciliation notes.`, L, 88, 9, true, amber);

  if (!summaryOnly) {
    newPage("Revenue and expenditure", `1 November ${current.year - 1} to 31 October ${current.year}`);
    activityHeading();
    for (const item of annualActivityRows(current)) activityRow(item.name, item.revenue, item.expenditure, item.net);
    activityRow("Total", current.totalIncome, current.totalExpense, current.surplus, true);
    paragraph("Related fees and costs are grouped by activity. Net shows revenue less expenditure; negative amounts are deficits.", 9);
    paragraph("Money collected or spent for Thommo's Charity is excluded from section income and expenditure. The section's own charity contribution is included as expenditure. Juniors' receipts and payments remain in their recorded categories; the movement in funds held is reconciled below.", 9);
    newPage("Year-end financial position");
    section("Opening position"); row("Carried Forward - bank", current.openingBank); row(`Cash at 31 October ${current.year - 1}`, current.openingCash);
    if (current.code === "MENS") { row("Less Thommo's Charity brought forward", -current.charity.opening); row("Less junior money brought forward", current.juniorOpening === null ? null : -current.juniorOpening); } row("Net Opening Balance - recorded funds", current.openingFunds, true);
    section("Closing position"); row("Account - closing bank", current.closingBank); row("Cash", current.closingCash);
    if (current.code === "MENS") { row("Less Thommo's Charity", -current.charity.closing); row("Less junior money", current.juniorClosing === null ? null : -current.juniorClosing); } row("Net balance - available bank and cash", current.closingFunds, true);
    section("Other assets and liabilities"); row("Debtors - amounts owed to the account", current.debtors); row("Other creditors - amounts owed by the account", current.otherCreditors); row(current.stockValue === null ? "Net assets" : "Net assets before stock", current.netAssetsBeforeStock, true);
    if (current.stockValue !== null) paragraph("Stock is a non-cash asset and is shown separately in the notes. It is not added to available bank and cash. Charity and Juniors' funds are already deducted above.", 9);
    newPage("Reconciliation and notes");
    section("Bank reconciliation"); row("Opening bank balance", current.openingBank); row("Bank receipts during the year", current.credit); row("Bank payments during the year", -current.debit); row("Closing bank balance", current.closingBank, true);
    section("Movement in available funds"); row("Net opening recorded funds", current.openingFunds); row("Surplus / (deficit) per income and expenditure", current.surplus);
    if (current.code === "MENS") row("Release / (increase) in Juniors' funds held", current.juniorOpening === null || current.juniorClosing === null ? null : current.juniorOpening - current.juniorClosing);
    row("Change in cash held outside the bank", current.openingCash === null || current.closingCash === null ? null : current.closingCash - current.openingCash);
    row("Closing available bank and cash", current.closingFunds, true);
    if (current.year === 2026 && current.code === "MENS" && current.openingBank === 741545) paragraph("Opening reconciliation: nine December entries in the source workbook were dated 2025 within the 2024/25 transaction sequence. Correcting them to December 2024 increases the 1 November 2025 opening bank balance by £758.51. Total receipts, payments and the closing bank balance across all years are unchanged. Original dates are retained in the correction audit trail. The prior workbook summary also added £290 labelled Stock to income; that manual amount is not treated as a bank receipt here.", 9);
    if (current.year === 2026 && current.code === "CLUB" && current.openingCash === 0 && current.closingCash === 0) paragraph("Opening reconciliation: the 1 November 2025 bank balance agrees to the source workbook. Opening and closing cash are confirmed as nil.", 9);
    paragraph("These are management accounts on a recorded receipts-and-payments basis, with separately identified funds and year-end assets/liabilities. Opening balances are carried forward from the dated ledger.", 9);
    section("Review status");
    if (current.issues.length) current.issues.forEach(issue => paragraph(issue, 10, amber)); else paragraph("Cash, Juniors' funds and other debtors/creditors are recorded. No uncategorised or flagged charity transactions remain for this period.");
    if (current.stockValue !== null) {
      room(140, "Stock held at year end");
      section("Stock held at year end");
      for (const item of current.stockItems) row(`${item.description} - ${item.quantity} x ${money(item.unitCostPence)}`, item.quantity * item.unitCostPence);
      row("Total stock value (non-cash)", current.stockValue, true);
      row("Net assets including separately valued stock", current.netAssetsBeforeStock === null ? null : current.netAssetsBeforeStock + current.stockValue, true);
    }
    if (current.commentary) { section("Treasurer's commentary - full text"); paragraph(current.commentary); }

  }
  const pages = pdf.getPages();
  for (let index = 0; index < pages.length; index++) {
    page = pages[index]; page.drawLine({ start: { x: L, y: 58 }, end: { x: R, y: 58 }, thickness: 0.6, color: line });
    text(`THE ESSEX  /  ${current.code === "MENS" ? "MEN'S ACCOUNT" : "CLUB ACCOUNT"}  /  ${current.year}`, L, 41, 8, false, grey);
    text(`${index + 1} / ${pages.length}`, R - 30, 41, 8, false, grey);
  }
  return Buffer.from(await pdf.save());
}
export async function generateAnnualPdf(code: "MENS" | "CLUB", year: number, summaryOnly = false) {
  const { current } = await loadAnnualAccounts(code, year);
  return renderAnnualPack(current, summaryOnly);
}
