"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CATEGORIES } from "./categories";

async function requireTreasurer() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TREASURER") {
    throw new Error("Treasurer access only.");
  }
  return session.user;
}

function parseDelimitedLine(line: string, delimiter: string) {
  if (delimiter === "\t") return line.split("\t").map((value) => value.trim());

  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function detectDelimiter(line: string) {
  if (line.includes("\t")) return "\t";
  if (line.includes(",")) return ",";
  if (line.includes(";")) return ";";
  return "\t";
}

function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMoney(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/[£,$\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const uk = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (uk) {
    const year = uk[3].length === 2 ? 2000 + Number(uk[3]) : Number(uk[3]);
    return new Date(Date.UTC(year, Number(uk[2]) - 1, Number(uk[1])));
  }

  const lloyds = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (lloyds) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(lloyds[2].toLowerCase());
    if (month < 0) throw new Error(`Invalid date: ${value}`);
    const year = lloyds[3].length === 2 ? 2000 + Number(lloyds[3]) : Number(lloyds[3]);
    return new Date(Date.UTC(year, month, Number(lloyds[1])));
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

type ParsedRow = {
  transactionDate: Date;
  description: string;
  credit: number;
  debit: number;
  category: string;
  sourceKey: string;
};

function makeSourceKey(
  accountCode: "CLUB" | "MENS",
  transactionDate: Date,
  description: string,
  credit: number,
  debit: number,
  occurrence: number,
) {
  const base = `${accountCode}|${transactionDate.toISOString().slice(0, 10)}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;
  return createHash("sha256").update(`${base}|${occurrence}`).digest("hex");
}

function buildLloydsRows(text: string, accountCode: "CLUB" | "MENS") {
  const rows: ParsedRow[] = [];
  const occurrences = new Map<string, number>();

  const clean = text
    .replace(/\[[^\]]*\]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ""))
    .replace(/\r/g, "");

  const lines = clean.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Markdown/table copy: | 07 Sep 26 | Description | FPI | 50.00 | | |
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (cells.length >= 4 && /^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}$/.test(cells[0])) {
        const transactionDate = parseDate(cells[0]);
        const description = cells[1] || "No description";
        const credit = parseMoney(cells[3]);
        const debit = parseMoney(cells[4]);
        if (credit || debit) {
          const base = `${accountCode}|${transactionDate.toISOString().slice(0, 10)}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;
          const occurrence = (occurrences.get(base) ?? 0) + 1;
          occurrences.set(base, occurrence);
          rows.push({
            transactionDate,
            description,
            credit,
            debit,
            category: "Uncategorised",
            sourceKey: makeSourceKey(accountCode, transactionDate, description, credit, debit, occurrence),
          });
        }
      }
      continue;
    }

    // Plain/tabbed copy: 07 Sep 26    DESCRIPTION    FPI    50.00
    const dateMatch = line.match(/^(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\s+(.+)$/);
    if (!dateMatch) continue;

    const transactionDate = parseDate(dateMatch[1]);
    const rest = dateMatch[2].trim();

    const typeMatch = rest.match(/^(.*?)\s+(FPI|FPO|SO|DD|DEB|TFR|BGC|CHQ|BP|CPT|ATM|CDM|POS)\s+(.+)$/i);
    if (!typeMatch) continue;

    const description = typeMatch[1].trim() || "No description";
    const tail = typeMatch[3].trim();
    const amounts = [...tail.matchAll(/(?:£\s*)?(-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+\.\d{2})/g)].map((m) => parseMoney(m[1]));
    if (amounts.length === 0) continue;

    // Lloyds copied transaction rows list In, then Out, then Balance. In most pasted
    // text only the populated In/Out amount survives. Treat the first amount as the
    // transaction amount; if a minus sign is present it is an outgoing transaction.
    const first = amounts[0];
    const credit = first >= 0 ? first : 0;
    const debit = first < 0 ? Math.abs(first) : 0;

    const base = `${accountCode}|${transactionDate.toISOString().slice(0, 10)}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);

    rows.push({
      transactionDate,
      description,
      credit,
      debit,
      category: "Uncategorised",
      sourceKey: makeSourceKey(accountCode, transactionDate, description, credit, debit, occurrence),
    });
  }

  return rows;
}

function buildParsedRows(text: string, accountCode: "CLUB" | "MENS") {
  const lloydsRows = buildLloydsRows(text, accountCode);
  if (lloydsRows.length > 0) return lloydsRows;

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Paste or upload a header row followed by at least one transaction.");

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map(normaliseHeader);
  const find = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const dateIndex = find("date", "transactiondate", "valuedate", "posteddate");
  const descriptionIndex = find("description", "details", "transaction", "narrative", "memo", "transactiondescription");
  const creditIndex = find("credit", "moneyin", "paidin", "income", "in");
  const debitIndex = find("debit", "moneyout", "paidout", "expense", "out");
  const amountIndex = find("amount", "transactionamount");
  const categoryIndex = find("category");
  const referenceIndex = find("reference", "transactionid", "id");

  if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && creditIndex < 0 && debitIndex < 0)) {
    throw new Error("No Lloyds transaction rows were recognised. Paste the transaction list directly from the Lloyds page, including the dates and amounts.");
  }

  const parsedRows: ParsedRow[] = [];
  const occurrences = new Map<string, number>();

  for (const line of lines.slice(1)) {
    const values = parseDelimitedLine(line, delimiter);
    const description = values[descriptionIndex]?.trim() || "No description";
    const transactionDate = parseDate(values[dateIndex] ?? "");
    let credit = parseMoney(values[creditIndex]);
    let debit = parseMoney(values[debitIndex]);

    if (amountIndex >= 0) {
      const amount = parseMoney(values[amountIndex]);
      if (amount >= 0) credit = amount;
      else debit = Math.abs(amount);
    }

    if (credit === 0 && debit === 0) continue;

    const suppliedCategory = categoryIndex >= 0 ? values[categoryIndex]?.trim() : "";
    const category = suppliedCategory && ACCOUNT_CATEGORIES.includes(suppliedCategory as (typeof ACCOUNT_CATEGORIES)[number])
      ? suppliedCategory
      : "Uncategorised";

    const reference = referenceIndex >= 0 ? values[referenceIndex]?.trim() : "";
    const base = reference
      ? `${accountCode}|${reference}`
      : `${accountCode}|${transactionDate.toISOString().slice(0, 10)}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);

    parsedRows.push({
      transactionDate,
      description,
      credit,
      debit,
      category,
      sourceKey: createHash("sha256").update(`${base}|${occurrence}`).digest("hex"),
    });
  }

  return parsedRows;
}

async function saveImportedRows({ accountCode, fileName, rows, userId }: {
  accountCode: "CLUB" | "MENS";
  fileName: string;
  rows: ReturnType<typeof buildParsedRows>;
  userId: string;
}) {
  if (rows.length === 0) return { error: "No transaction rows were recognised in the pasted text." };

  const existing = await prisma.accountTransaction.findMany({
    where: { sourceKey: { in: rows.map((row) => row.sourceKey) } },
    select: { sourceKey: true },
  });

  const existingKeys = new Set(existing.map((row) => row.sourceKey));
  const newRows = rows.filter((row) => !existingKeys.has(row.sourceKey));

  if (newRows.length === 0) return { success: "No new transactions found — all rows were already imported." };

  await prisma.$transaction(async (tx) => {
    const batch = await tx.accountImportBatch.create({
      data: { accountCode, fileName, rowCount: newRows.length, importedById: userId },
    });
    await tx.accountTransaction.createMany({
      data: newRows.map((row) => ({ ...row, accountCode, importBatchId: batch.id })),
    });
  });

  revalidatePath("/accounts");
  revalidatePath("/accounts/import");
  revalidatePath("/accounts/summary");

  return {
    success: `${newRows.length} new transaction${newRows.length === 1 ? "" : "s"} imported. ${rows.length - newRows.length} duplicate${rows.length - newRows.length === 1 ? "" : "s"} skipped.`,
  };
}

export type ImportState = { error?: string; success?: string };

export async function importTransactions(_previousState: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireTreasurer();
  const accountCode = String(formData.get("accountCode") ?? "");
  if (accountCode !== "CLUB" && accountCode !== "MENS") return { error: "Choose an account." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (!file.name.toLowerCase().endsWith(".csv")) return { error: "Please export the transaction list as CSV before uploading." };

  try {
    return await saveImportedRows({ accountCode, fileName: file.name, rows: buildParsedRows(await file.text(), accountCode), userId: user.id });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to read the CSV." };
  }
}

export async function importPastedTransactions(_previousState: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireTreasurer();
  const accountCode = String(formData.get("accountCode") ?? "");
  if (accountCode !== "CLUB" && accountCode !== "MENS") return { error: "Choose an account." };

  const pastedData = String(formData.get("pastedData") ?? "").trim();
  if (!pastedData) return { error: "Paste the bank transactions into the box first." };

  try {
    return await saveImportedRows({
      accountCode,
      fileName: `Pasted Lloyds transactions ${new Date().toISOString().slice(0, 10)}`,
      rows: buildParsedRows(pastedData, accountCode),
      userId: user.id,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to read the pasted transactions." };
  }
}

export async function updateTransactionCategory(formData: FormData) {
  await requireTreasurer();
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "");

  if (!id || !ACCOUNT_CATEGORIES.includes(category as (typeof ACCOUNT_CATEGORIES)[number])) {
    throw new Error("Invalid category update.");
  }

  await prisma.accountTransaction.update({ where: { id }, data: { category } });
  revalidatePath("/accounts");
  revalidatePath("/accounts/summary");
}
