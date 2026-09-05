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
  if (delimiter === "\t") {
    return line.split("\t").map((value) => value.trim());
  }

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
  const cleaned = value
    .replace(/[£,$\s]/g, "")
    .replace(/^\((.*)\)$/, "-$1");
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

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

function buildParsedRows(text: string, accountCode: "CLUB" | "MENS") {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("Paste or upload a header row followed by at least one transaction.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map(normaliseHeader);
  const find = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const dateIndex = find("date", "transactiondate", "valuedate", "posteddate");
  const descriptionIndex = find(
    "description",
    "details",
    "transaction",
    "narrative",
    "memo",
    "transactiondescription",
  );
  const creditIndex = find("credit", "moneyin", "paidin", "income");
  const debitIndex = find("debit", "moneyout", "paidout", "expense");
  const amountIndex = find("amount", "transactionamount");
  const categoryIndex = find("category");
  const referenceIndex = find("reference", "transactionid", "id");

  if (
    dateIndex < 0 ||
    descriptionIndex < 0 ||
    (amountIndex < 0 && creditIndex < 0 && debitIndex < 0)
  ) {
    throw new Error(
      "The pasted data needs a header row with Date and Description, plus either Amount or Credit/Debit columns.",
    );
  }

  const parsedRows: Array<{
    transactionDate: Date;
    description: string;
    credit: number;
    debit: number;
    category: string;
    sourceKey: string;
  }> = [];

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
    const category =
      suppliedCategory &&
      ACCOUNT_CATEGORIES.includes(
        suppliedCategory as (typeof ACCOUNT_CATEGORIES)[number],
      )
        ? suppliedCategory
        : "Uncategorised";

    const reference = referenceIndex >= 0 ? values[referenceIndex]?.trim() : "";
    const base = reference
      ? `${accountCode}|${reference}`
      : `${accountCode}|${transactionDate.toISOString().slice(0, 10)}|${description}|${credit.toFixed(2)}|${debit.toFixed(2)}`;

    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);

    const sourceKey = createHash("sha256")
      .update(`${base}|${occurrence}`)
      .digest("hex");

    parsedRows.push({
      transactionDate,
      description,
      credit,
      debit,
      category,
      sourceKey,
    });
  }

  return parsedRows;
}

async function saveImportedRows({
  accountCode,
  fileName,
  rows,
  userId,
}: {
  accountCode: "CLUB" | "MENS";
  fileName: string;
  rows: ReturnType<typeof buildParsedRows>;
  userId: string;
}) {
  if (rows.length === 0) {
    return { success: "No non-zero transactions were found." };
  }

  const existing = await prisma.accountTransaction.findMany({
    where: { sourceKey: { in: rows.map((row) => row.sourceKey) } },
    select: { sourceKey: true },
  });

  const existingKeys = new Set(existing.map((row) => row.sourceKey));
  const newRows = rows.filter((row) => !existingKeys.has(row.sourceKey));

  if (newRows.length === 0) {
    return { success: "No new transactions found — all rows were already imported." };
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.accountImportBatch.create({
      data: {
        accountCode,
        fileName,
        rowCount: newRows.length,
        importedById: userId,
      },
    });

    await tx.accountTransaction.createMany({
      data: newRows.map((row) => ({
        ...row,
        accountCode,
        importBatchId: batch.id,
      })),
    });
  });

  revalidatePath("/accounts");
  revalidatePath("/accounts/import");
  revalidatePath("/accounts/summary");

  return {
    success: `${newRows.length} new transaction${newRows.length === 1 ? "" : "s"} imported. ${rows.length - newRows.length} duplicate${rows.length - newRows.length === 1 ? "" : "s"} skipped.`,
  };
}

export type ImportState = {
  error?: string;
  success?: string;
};

export async function importTransactions(
  _previousState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireTreasurer();
  const accountCode = String(formData.get("accountCode") ?? "");

  if (accountCode !== "CLUB" && accountCode !== "MENS") {
    return { error: "Choose an account." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Please export the transaction list as CSV before uploading." };
  }

  try {
    const rows = buildParsedRows(await file.text(), accountCode);
    return await saveImportedRows({
      accountCode,
      fileName: file.name,
      rows,
      userId: user.id,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to read the CSV.",
    };
  }
}

export async function importPastedTransactions(
  _previousState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireTreasurer();
  const accountCode = String(formData.get("accountCode") ?? "");

  if (accountCode !== "CLUB" && accountCode !== "MENS") {
    return { error: "Choose an account." };
  }

  const pastedData = String(formData.get("pastedData") ?? "").trim();
  if (!pastedData) {
    return { error: "Paste the bank transactions into the box first." };
  }

  try {
    const rows = buildParsedRows(pastedData, accountCode);
    return await saveImportedRows({
      accountCode,
      fileName: `Pasted bank transactions ${new Date().toISOString().slice(0, 10)}`,
      rows,
      userId: user.id,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to read the pasted transactions.",
    };
  }
}

export async function updateTransactionCategory(formData: FormData) {
  await requireTreasurer();
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "");

  if (
    !id ||
    !ACCOUNT_CATEGORIES.includes(category as (typeof ACCOUNT_CATEGORIES)[number])
  ) {
    throw new Error("Invalid category update.");
  }

  await prisma.accountTransaction.update({
    where: { id },
    data: { category },
  });

  revalidatePath("/accounts");
  revalidatePath("/accounts/summary");
}
