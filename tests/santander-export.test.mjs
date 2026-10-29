import { test } from "node:test";
import assert from "node:assert/strict";
import { santanderExportToTsv } from "../lib/santander-export.ts";

const header = '<tr><td></td><th>Date</th><td></td><th>Description</th><td></td><th>Money in</th><th>Money out</th><th>Balance</th></tr>';
const row = (date, description, incoming, outgoing, balance) => `<tr><td></td><td>${date}</td><td></td><td>${description}</td><td></td><td>${incoming}</td><td>${outgoing}</td><td>${balance}</td></tr>`;

test("reads Santander receipts and payments without importing balance", () => {
  const html = header + row("29/10/2026", "Receipt &amp; fees", "£ 1,200.50", "", "£ 5,000.00") + row("28/10/2026", "Payment", "", "£ 25.00", "£ 3,799.50");
  assert.equal(santanderExportToTsv(html), "Date\tDescription\tMoney in\tMoney out\n29/10/2026\tReceipt & fees\t£ 1,200.50\t\n28/10/2026\tPayment\t\t£ 25.00");
});

test("rejects an invalid transaction or unknown file before import", () => {
  assert.throws(() => santanderExportToTsv(header + row("29/10/2026", "Payment", "£ 10.00", "£ 5.00", "")), /unrecognised/);
  assert.throws(() => santanderExportToTsv("not a statement"), /not a recognised/);
});
