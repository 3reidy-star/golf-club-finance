import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reportCharity } from "@/lib/charity-ledger";

export const dynamic = "force-dynamic";
const pennies = (n: unknown) => Math.round(Number(n) * 100);
const money = (pence: number) => `${pence < 0 ? "-" : ""}£${(Math.abs(pence) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const period = (date: Date) => date.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(" ", "-");

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "TREASURER") return new NextResponse("Forbidden", { status: 403 });
  const params = new URL(request.url).searchParams;
  const code = params.get("account"), year = Number(params.get("year"));
  if ((code !== "MENS" && code !== "CLUB") || !Number.isInteger(year) || year < 2000 || year > 2100) return new NextResponse("Invalid account or year", { status: 400 });
  const start = new Date(Date.UTC(year - 1, 10, 1)), end = new Date(Date.UTC(year, 10, 1));
  const [account, currentCash, previousCash, charityEntries] = await Promise.all([
    prisma.financeAccount.findUnique({ where: { code }, include: { transactions: { where: { transactionDate: { lt: end } }, include: { invoicePayments: { where: { removedAt: null }, select: { amountPence: true } } }, orderBy: { transactionDate: "asc" } } } }),
    prisma.cashYearEnd.findUnique({ where: { accountCode_year: { accountCode: code, year } } }),
    prisma.cashYearEnd.findUnique({ where: { accountCode_year: { accountCode: code, year: year - 1 } } }),
    code === "MENS" ? prisma.charityEntry.findMany({ where: { accountCode: "MENS" } }) : Promise.resolve([]),
  ]);
  if (!account) return new NextResponse("Account not found", { status: 404 });
  const openingBank = pennies(account.openingBalance) + account.transactions.filter(t => t.transactionDate < start).reduce((n, t) => n + pennies(t.credit) - pennies(t.debit), 0);
  const rows = account.transactions.filter(t => t.transactionDate >= start);
  const bankMovement = rows.reduce((n, t) => n + pennies(t.credit) - pennies(t.debit), 0);
  const closingBank = openingBank + bankMovement;
  const charity = reportCharity(charityEntries, code === "MENS" ? account.transactions : [], start, end);
  const categories = new Map<string, { income: number; expense: number }>();
  for (const t of rows) { const v = categories.get(t.category) ?? { income: 0, expense: 0 }; v.income += pennies(t.credit); v.expense += pennies(t.debit); categories.set(t.category, v); }
  for (const [name, change] of charity.adjustments) {
    const value = categories.get(name);
    if (!value) throw new Error("Charity allocation has no matching transaction in the reporting period.");
    value.income += change.income; value.expense += change.expense;
  }
  if (charity.contribution) { const value = categories.get("Charity contribution") ?? { income: 0, expense: 0 }; value.expense += charity.contribution; categories.set("Charity contribution", value); }
  const income = [...categories].filter(([, v]) => v.income !== 0).map(([name, v]) => ({ name, amount: v.income })).sort((a, b) => b.amount - a.amount);
  const expense = [...categories].filter(([, v]) => v.expense !== 0).map(([name, v]) => ({ name, amount: v.expense })).sort((a, b) => b.amount - a.amount);
  const totalIn = income.reduce((n, v) => n + v.amount, 0), totalOut = expense.reduce((n, v) => n + v.amount, 0);

  const pdf = await PDFDocument.create(), normal = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, left = 60, right = W - 60, grey = rgb(0.68, 0.68, 0.68), pale = rgb(0.90, 0.90, 0.90), ink = rgb(0.08, 0.08, 0.08);
  // Match the supplied AGM statement, shrinking rows only as needed to keep
  // ordinary annual statements on a page; unusually long ones continue safely.
  const count = income.length + expense.length + 16;
  const rowH = Math.min(12, Math.max(8.3, (H - 230) / Math.max(count, 1)));
  const fontSize = Math.min(9, Math.max(7.2, rowH - 1.3));
  let page = pdf.addPage([W, H]), y = H - 44, pageNumber = 1;
  const label = (text: string, x: number, baseline: number, size = fontSize, strong = false) => page.drawText(text, { x, y: baseline, size, font: strong ? bold : normal, color: ink });
  const rightText = (text: string, baseline: number, strong = false) => label(text, right - 4 - (strong ? bold : normal).widthOfTextAtSize(text, fontSize), baseline, fontSize, strong);
  const center = (text: string, baseline: number, size: number, strong = false) => label(text, (W - (strong ? bold : normal).widthOfTextAtSize(text, size)) / 2, baseline, size, strong);
  function newPage() { page = pdf.addPage([W, H]); pageNumber++; y = H - 40; center("Golf AGM Financial Statement (continued)", y, 12, true); y -= 24; }
  function room(height: number) { if (y - height < 35) newPage(); }
  function bar(text: string) { room(rowH + 5); page.drawRectangle({ x: left, y: y - rowH, width: right - left, height: rowH, color: grey }); center(text, y - rowH + 2, fontSize, true); y -= rowH + 2; }
  function row(name: string, amount: number | null | undefined, shade = false, strong = false) {
    room(rowH + 2);
    if (shade) page.drawRectangle({ x: left, y: y - rowH, width: right - left, height: rowH, color: pale });
    const value = amount === undefined ? "" : amount === null ? "Not entered" : money(amount);
    let display = name; const maxWidth = right - left - 135;
    while (normal.widthOfTextAtSize(display, fontSize) > maxWidth && display.length > 4) display = display.slice(0, -2);
    if (display !== name) display += "...";
    label(display, left + 3, y - rowH + 2, fontSize, strong); rightText(value, y - rowH + 2, strong); y -= rowH + 1;
  }
  function section(title: string, items: { name: string; amount: number }[], total: number) {
    y -= 5; bar(title);
    if (!items.length) row("No transactions recorded", undefined);
    else for (const item of items) row(item.name, item.amount);
    row("Sub-Total", total, true, true);
  }
  center("Golf AGM Financial Statement", y, 15, true); y -= 25;
  center("The Essex Golf & Country Club", y, 13, true); y -= 24;
  room(rowH + 3); page.drawRectangle({ x: left, y: y - rowH, width: right - left, height: rowH, color: grey });
  label("Period", left + 3, y - rowH + 2, fontSize, true);
  label(`${period(start)}                 to                 ${period(new Date(end.getTime() - 86400000))}`, left + 158, y - rowH + 2); y -= rowH + 9;
  row("Carried Forward - bank", openingBank);
  row("Cash", previousCash?.amountPence ?? null);
  if (code === "MENS" && charity.opening) row("Less Thommo's Charity brought forward", -charity.opening);
  row("Net Opening Balance", previousCash ? openingBank + previousCash.amountPence - (code === "MENS" ? charity.opening : 0) : null, true, true);
  section("Income", income, totalIn);
  section("Expenses", expense, totalOut);
  y -= 5; bar("Creditors");
  if (code === "MENS") row("Thommo's Charity", charity.closing);
  else row("Other creditors: not assessed", undefined);
  y -= 5; bar("Debtors"); row("Not assessed", undefined);
  y -= 5; bar("Closing Balance"); row("Account", closingBank); row("Cash", currentCash?.amountPence ?? null);
  if (code === "MENS") row("Less Thommo's Charity", -charity.closing);
  y -= 5; bar("Carried Forward");
  row("Net balance", currentCash ? closingBank + currentCash.amountPence - (code === "MENS" ? charity.closing : 0) : null, false, true);
  y -= 4; room(30);
  if (!previousCash || !currentCash) { label("Cash must be entered before the corresponding net balance can be calculated.", left + 3, y - fontSize, Math.max(7, fontSize - 0.5)); y -= rowH; }
  if (code === "MENS") {
    room(30);
    label(`Charity: recorded transactions; ${charity.review.length} transaction(s) need review.`, left + 3, y - fontSize, Math.max(7, fontSize - 0.5)); y -= rowH;
    label("Check other charity funds, creditors and debtors separately.", left + 3, y - fontSize, Math.max(7, fontSize - 0.5));
  }
  if (pageNumber > 1) label(`Page ${pageNumber}`, right - 35, 20, 7);
  return new NextResponse(Buffer.from(await pdf.save()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="the-essex-${code.toLowerCase()}-annual-accounts-${year}.pdf"`, "Cache-Control": "private, no-store" } });
}
