export const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
export const dateText = (date: Date | string) => new Date(date).toLocaleDateString("en-GB", { timeZone: "UTC" });
export const todayUK = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
export const ACCOUNT_NAMES = { CLUB: "Club Account", MENS: "Men's Account" };
export function parsePence(value: string, allowZero = false) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) throw new Error("Enter amounts with up to two decimal places (maximum £9,999,999.99).");
  const [whole, fraction = ""] = value.split(".");
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (pence < (allowZero ? 0 : 1)) throw new Error("Enter a positive amount.");
  return pence;
}
export function parseDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Enter a valid date.");
  return date;
}
export type LineInput = { description: string; quantity: string; unitPrice: string };
export function calculateLines(raw: unknown) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 50) throw new Error("Add between 1 and 50 invoice lines.");
  const lines = raw.map((line: LineInput, position) => {
    if (!line || typeof line.description !== "string" || !line.description.trim() || line.description.trim().length > 500) throw new Error("Each line needs a description (up to 500 characters).");
    if (typeof line.quantity !== "string" || !/^\d{1,5}(\.\d{1,2})?$/.test(line.quantity)) throw new Error("Enter a positive quantity with up to two decimal places.");
    const quantityHundredths = Math.round(Number(line.quantity) * 100);
    if (!quantityHundredths) throw new Error("Quantities must be greater than zero.");
    if (typeof line.unitPrice !== "string") throw new Error("Enter a unit price.");
    const unitPricePence = parsePence(line.unitPrice, true);
    const totalPence = Math.round(quantityHundredths * unitPricePence / 100);
    if (totalPence > 999999999) throw new Error("Each invoice must total less than £10 million.");
    return { position, description: line.description.trim(), quantity: line.quantity, unitPricePence, totalPence };
  });
  const totalPence = lines.reduce((sum, line) => sum + line.totalPence, 0);
  if (totalPence < 1 || totalPence > 999999999) throw new Error("Invoice total must be between £0.01 and £9,999,999.99.");
  return { lines, totalPence };
}
export function invoiceStatus(invoice: { status: string; dueDate: Date | string; totalPence: number; payments: { amountPence: number; removedAt: Date | string | null }[] }, today = todayUK()) {
  const paid = invoice.payments.filter(p => !p.removedAt).reduce((sum, p) => sum + p.amountPence, 0);
  if (invoice.status === "DRAFT") return "Draft";
  if (invoice.status === "VOID") return "Void";
  if (paid >= invoice.totalPence) return "Paid";
  if (new Date(invoice.dueDate).toISOString().slice(0, 10) < today) return "Overdue";
  return paid ? "Part paid" : "Unpaid";
}
export function validateAllocation(invoice: { status: string; accountCode: string; totalPence: number; paidPence: number }, bank: { accountCode: string; creditPence: number; debitPence: number; allocatedPence: number }, amountPence: number) {
  if (invoice.status !== "ISSUED") throw new Error("Only issued invoices can receive payments.");
  if (invoice.accountCode !== bank.accountCode || bank.creditPence <= 0 || bank.debitPence !== 0) throw new Error("Choose a money-in transaction from the invoice's account.");
  if (!Number.isSafeInteger(amountPence) || amountPence <= 0) throw new Error("Enter a positive payment amount.");
  if (amountPence > invoice.totalPence - invoice.paidPence) throw new Error("Payment exceeds the invoice balance.");
  if (amountPence > bank.creditPence - bank.allocatedPence) throw new Error("Payment exceeds the unallocated bank receipt.");
}
