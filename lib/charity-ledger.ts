export type Entry = {
  type: "CONTRIBUTION" | "RECEIPT" | "COST" | "PAYMENT";
  amountPence: number;
  effectiveDate: Date;
  transactionId: string | null;
  removedAt: Date | null;
};
export type BankRow = { id: string; transactionDate: Date; category: string; credit: unknown; debit: unknown };
export const toPence = (amount: unknown) => Math.round(Number(amount) * 100);
export const pounds = (amountPence: number) => amountPence / 100;
export function charityBalance(entries: Entry[], endExclusive: Date) {
  return entries.filter(e => !e.removedAt && e.effectiveDate < endExclusive).reduce((sum, e) => sum + (e.type === "PAYMENT" || e.type === "COST" ? -e.amountPence : e.amountPence), 0);
}
export function validateTimeline(entries: Entry[]) {
  const days = new Map<string, { movement: number; payments: number }>();
  for (const e of entries) if (!e.removedAt) {
    const date = e.effectiveDate.toISOString().slice(0, 10);
    const day = days.get(date) ?? { movement: 0, payments: 0 };
    day.movement += e.type === "PAYMENT" || e.type === "COST" ? -e.amountPence : e.amountPence;
    if (e.type === "PAYMENT") day.payments += e.amountPence;
    days.set(date, day);
  }
  let balance = 0;
  for (const [, day] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    balance += day.movement;
    // Event costs may precede fundraising receipts. A payment to the charity
    // still cannot exceed the balance held for it on the payment date.
    if (day.payments && balance < 0) throw new Error("This would make the charity balance negative when a payment is made. Check the dates and amounts first.");
  }
}
export function reportCharity(entries: Entry[], rows: BankRow[], start: Date, end: Date) {
  const active = entries.filter(e => !e.removedAt && e.effectiveDate < end);
  const current = active.filter(e => e.effectiveDate >= start);
  const adjustments = new Map<string, { income: number; expense: number }>();
  const byId = new Map(rows.map(row => [row.id, row]));
  for (const entry of current) if (entry.transactionId) {
    const row = byId.get(entry.transactionId);
    if (!row) throw new Error("A charity allocation is missing its bank transaction.");
    const change = adjustments.get(row.category) ?? { income: 0, expense: 0 };
    if (entry.type === "RECEIPT") change.income -= entry.amountPence;
    if (entry.type === "PAYMENT" || entry.type === "COST") change.expense -= entry.amountPence;
    adjustments.set(row.category, change);
  }
  const contribution = current.filter(e => e.type === "CONTRIBUTION").reduce((n, e) => n + e.amountPence, 0);
  const matchedIds = new Set(active.flatMap(e => e.transactionId ? [e.transactionId] : []));
  const unmatched = rows.filter(row => row.transactionDate < end && row.category.trim().toLowerCase() === "thommo charity" && !matchedIds.has(row.id));
  return { opening: charityBalance(active, start), closing: charityBalance(active, end), contribution, adjustments, unmatched };
}
