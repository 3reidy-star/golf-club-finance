export type Entry = {
  type: "CONTRIBUTION" | "RECEIPT" | "COST" | "PAYMENT";
  amountPence: number;
  effectiveDate: Date;
  transactionId: string | null;
  removedAt: Date | null;
};
export type BankRow = { id: string; transactionDate: Date; category: string; credit: unknown; debit: unknown; invoicePayments?: { amountPence: number }[] };
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
    if (day.payments && balance < 0) throw new Error("This would make the charity balance negative when a payment is made. Check the dates and amounts first.");
  }
}
// Existing categories already identify these funds as Thommo's. Explicit
// allocations take precedence; removals and invoice conflicts need review.
export function charityCategoryEntries(entries: Entry[], rows: BankRow[]) {
  const historyIds = new Set(entries.flatMap(e => e.transactionId ? [e.transactionId] : []));
  const inferred: Entry[] = [], review: BankRow[] = [];
  for (const row of rows) {
    if (row.category.trim().toLowerCase() !== "thommo charity") continue;
    // The category was also used for an earlier appeal in 2024. This appeal's
    // first identified transactions are from October 2025; earlier rows must
    // not be silently carried into its payable.
    if (row.transactionDate < new Date("2025-10-01T00:00:00.000Z")) continue;
    if (historyIds.has(row.id)) {
      const allocated = entries.filter(e => e.transactionId === row.id && !e.removedAt);
      const credit = toPence(row.credit), debit = toPence(row.debit);
      const matched = allocated.reduce((n, e) => n + e.amountPence, 0);
      if (!allocated.length || (row.invoicePayments?.length ?? 0) > 0 || (credit > 0 && debit > 0) || matched !== Math.max(credit, debit) || allocated.some(e => credit > 0 ? e.type !== "RECEIPT" : e.type !== "COST" && e.type !== "PAYMENT")) review.push(row);
      continue;
    }
    const credit = toPence(row.credit), debit = toPence(row.debit);
    if ((row.invoicePayments?.length ?? 0) > 0 || (credit > 0 && debit > 0) || (credit <= 0 && debit <= 0)) { review.push(row); continue; }
    inferred.push({ type: credit > 0 ? "RECEIPT" : "COST", amountPence: credit > 0 ? credit : debit, effectiveDate: row.transactionDate, transactionId: row.id, removedAt: null });
  }
  return { inferred, review };
}
export function reportCharity(entries: Entry[], rows: BankRow[], start: Date, end: Date) {
  const bankBeforeEnd = rows.filter(row => row.transactionDate < end);
  const { inferred, review } = charityCategoryEntries(entries, bankBeforeEnd);
  const active = [...entries.filter(e => !e.removedAt && e.effectiveDate < end), ...inferred];
  const current = active.filter(e => e.effectiveDate >= start && e.effectiveDate < end);
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
  return { opening: charityBalance(active, start), closing: charityBalance(active, end), contribution, adjustments, inferred, review };
}
