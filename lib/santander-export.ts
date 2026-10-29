// Santander exports an HTML table with an .xls extension, encoded as Windows-1252.
function cellText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|nbsp|amp|lt|gt|quot|apos|pound);/gi, (_, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", pound: "£" } as Record<string, string>)[key];
  }).replace(/\s+/g, " ").trim();
}

export function santanderExportToTsv(html: string) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map((cell) => cellText(cell[1])),
  );
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const headerIndex = rows.findIndex((row) => ["date", "description", "moneyin", "moneyout"].every((name) => row.some((cell) => normalise(cell) === name)));
  if (headerIndex < 0) throw new Error("This is not a recognised Santander transaction export. Expected Date, Description, Money in and Money out columns.");
  const header = rows[headerIndex].map(normalise);
  const indexes = ["date", "description", "moneyin", "moneyout"].map((name) => header.indexOf(name));
  const result = ["Date\tDescription\tMoney in\tMoney out"];
  for (const row of rows.slice(headerIndex + 1)) {
    const [date, description, credit, debit] = indexes.map((index) => row[index] ?? "");
    if (!date && !description && !credit && !debit) continue;
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) throw new Error("A Santander transaction has an unrecognised date. No transactions were imported.");
    const money = (value: string) => !value || /^£?\s*\d[\d,]*\.\d{2}$/.test(value);
    if (!description || !money(credit) || !money(debit) || (!credit && !debit) || (credit && debit)) {
      throw new Error("A Santander transaction has an unrecognised description or amount. No transactions were imported.");
    }
    result.push([date, description, credit, debit].join("\t"));
  }
  if (result.length === 1) throw new Error("No Santander transactions were found in the file.");
  return result.join("\n");
}
