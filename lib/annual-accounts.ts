import { reportCharity, toPence, type BankRow, type Entry } from "./charity-ledger";
export type StockItem = { description: string; quantity: number; unitCostPence: number };
export type YearReview = { year: number; otherCreditorsPence: number | null; debtorsPence: number | null; stockItems: unknown; stockConfirmed: boolean; commentary: string };
export type CashCount = { year: number; amountPence: number };
export type AnnualAccount = { code: "MENS" | "CLUB"; name: string; openingBalance: unknown; openingDate: Date; transactions: BankRow[] };
// Source: The Essex Accounts workbook, annual statements and confirmed 2026 count.
export const juniorYearEndPence: Record<number, number> = { 2023: 36693, 2024: 26093, 2025: 210795, 2026: 14828 };
export function calculateAnnualAccounts(account: AnnualAccount, year: number, cashCounts: CashCount[], entries: Entry[], reviews: YearReview[]) {
  const start = new Date(Date.UTC(year - 1, 10, 1)), end = new Date(Date.UTC(year, 10, 1));
  const transactions = account.transactions.filter(row => row.transactionDate >= account.openingDate && row.transactionDate < end);
  const rows = transactions.filter(row => row.transactionDate >= start);
  const openingBank = toPence(account.openingBalance) + transactions.filter(row => row.transactionDate < start).reduce((sum, row) => sum + toPence(row.credit) - toPence(row.debit), 0);
  const credit = rows.reduce((sum, row) => sum + toPence(row.credit), 0), debit = rows.reduce((sum, row) => sum + toPence(row.debit), 0);
  const closingBank = openingBank + credit - debit;
  const charity = reportCharity(account.code === "MENS" ? entries : [], account.code === "MENS" ? transactions : [], start, end);
  const categories = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const value = categories.get(row.category) ?? { income: 0, expense: 0 };
    value.income += toPence(row.credit); value.expense += toPence(row.debit); categories.set(row.category, value);
  }
  for (const [name, change] of charity.adjustments) {
    const value = categories.get(name);
    if (!value) throw new Error("Charity allocation has no matching transaction in the reporting period.");
    value.income += change.income; value.expense += change.expense;
  }
  if (charity.contribution) { const value = categories.get("Charity contribution") ?? { income: 0, expense: 0 }; value.expense += charity.contribution; categories.set("Charity contribution", value); }
  const income = [...categories].filter(([, value]) => value.income !== 0).map(([name, value]) => ({ name, amount: value.income })).sort((a, b) => b.amount - a.amount);
  const expense = [...categories].filter(([, value]) => value.expense !== 0).map(([name, value]) => ({ name, amount: value.expense })).sort((a, b) => b.amount - a.amount);
  const totalIncome = income.reduce((sum, row) => sum + row.amount, 0), totalExpense = expense.reduce((sum, row) => sum + row.amount, 0);
  const openingCash = cashCounts.find(row => row.year === year - 1)?.amountPence ?? null;
  const closingCash = cashCounts.find(row => row.year === year)?.amountPence ?? null;
  const juniorOpening = account.code === "MENS" ? juniorYearEndPence[year - 1] ?? null : 0;
  const juniorClosing = account.code === "MENS" ? juniorYearEndPence[year] ?? null : 0;
  const review = reviews.find(row => row.year === year);
  const debtors = review?.debtorsPence ?? null, otherCreditors = review?.otherCreditorsPence ?? null;
  const openingFunds = openingCash === null || juniorOpening === null ? null : openingBank + openingCash - charity.opening - juniorOpening;
  const closingFunds = closingCash === null || juniorClosing === null ? null : closingBank + closingCash - charity.closing - juniorClosing;
  const netAssetsBeforeStock = closingFunds === null || debtors === null || otherCreditors === null ? null : closingFunds + debtors - otherCreditors;
  const stockItems = (Array.isArray(review?.stockItems) ? review.stockItems : []) as StockItem[];
  const stockValue = review?.stockConfirmed ? stockItems.reduce((sum, item) => sum + item.quantity * item.unitCostPence, 0) : null;
  const issues = [];
  if (openingCash === null) issues.push(`Opening cash at 31 October ${year - 1} has not been confirmed.`);
  if (closingCash === null) issues.push(`Closing cash at 31 October ${year} has not been confirmed.`);
  if (juniorOpening === null || juniorClosing === null) issues.push("A Juniors' balance has not been confirmed for this year.");
  if (debtors === null || otherCreditors === null) issues.push("Other debtors and creditors have not been confirmed. Blank is different from zero.");
  if (charity.review.length) issues.push(`${charity.review.length} charity transaction(s) require review.`);
  if (rows.some(row => row.category === "Uncategorised")) issues.push("Some transactions are uncategorised.");
  if (account.openingDate > start) issues.push("The ledger begins during this reporting year; the preceding period is not covered.");
  return { code: account.code, name: account.name, year, start, end, openingBank, closingBank, openingCash, closingCash, juniorOpening, juniorClosing, openingFunds, closingFunds, debtors, otherCreditors, netAssetsBeforeStock, stockItems, stockValue, commentary: review?.commentary ?? "", charity, income, expense, totalIncome, totalExpense, surplus: totalIncome - totalExpense, credit, debit, bankMovement: credit - debit, issues, rows: rows.length };
}
export type AnnualReport = ReturnType<typeof calculateAnnualAccounts>;
