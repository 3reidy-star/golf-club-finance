import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as charity from '../lib/charity-ledger.ts';
import * as invoices from '../lib/invoices.ts';
const require = createRequire(import.meta.url);
const date = new Date('2026-10-27T00:00:00Z');
const seed = { id: 'awards', type: 'CONTRIBUTION', amountPence: 8300, effectiveDate: date, transactionId: null, removedAt: null };
function harness({ user = { id: 'treasurer' }, bank, existing = [seed] } = {}) {
  const written = [];
  const tx = {
    accountTransaction: {
      findUnique: async () => bank,
      findMany: async () => bank ? (Array.isArray(bank) ? bank : [bank]) : [],
    },
    charityEntry: {
      findMany: async () => existing,
      findFirst: async () => null,
      create: async ({ data }) => { written.push(data); },
      createMany: async ({ data }) => { written.push(...data); },
    },
  };
  class PrismaError extends Error {}
  const mocks = {
    '@prisma/client': { Prisma: { PrismaClientKnownRequestError: PrismaError } },
    'next/cache': { revalidatePath() {} },
    '@/lib/invoice-auth': { invoiceUser: async () => user },
    '@/lib/prisma': { prisma: { $transaction: async fn => fn(tx) } },
    '@/lib/invoices': invoices,
    '@/lib/charity-ledger': charity,
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../app/accounts/charity/actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  return { ...exports, written };
}
const receipt = { category: 'Other', id: 'bank-1', accountCode: 'MENS', transactionDate: date, description: 'Raffle', credit: 100, debit: 0, charityEntries: [], invoicePayments: [] };
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) data.append(key, String(item)); return data; }

test('allocation checks account, direction, invoice allocations and duplicate charity matches', async () => {
  for (const bank of [ { ...receipt, accountCode: 'CLUB' }, { ...receipt, credit: 0, debit: 100 }, { ...receipt, charityEntries: [{}] }, { ...receipt, invoicePayments: [{ amountPence: 9500 }] } ]) {
    const h = harness({ bank }); const result = await h.allocateCharity({}, form({ transactionId: 'bank-1', type: 'RECEIPT', amount: '10' }));
    assert.ok(result.error); assert.equal(h.written.length, 0);
  }
  const h = harness({ bank: receipt }); const result = await h.allocateCharity({}, form({ transactionId: 'bank-1', type: 'RECEIPT', amount: '75.50' }));
  assert.equal(result.success, 'Charity allocation saved.'); assert.equal(h.written[0].amountPence, 7550);
});
test('payment cannot exceed recorded funds and anonymous users cannot change accounts', async () => {
  const bank = { ...receipt, credit: 0, debit: 200 };
  const h = harness({ bank }); const result = await h.allocateCharity({}, form({ transactionId: 'bank-1', type: 'PAYMENT', amount: '100' }));
  assert.match(result.error, /negative/); assert.equal(h.written.length, 0);
  const denied = harness({ user: null, bank: receipt }); const deniedResult = await denied.allocateCharity({}, form({ transactionId: 'bank-1', type: 'RECEIPT', amount: '10' }));
  assert.match(deniedResult.error, /Treasurer/); assert.equal(denied.written.length, 0);
});
test('bulk allocation records exactly the reviewed receipts and rejects stale totals or duplicates', async () => {
  const bank = [receipt, { ...receipt, id: 'bank-2', credit: 25 }];
  const h = harness({ bank }); const input = form({ transactionId: ['bank-1', 'bank-2'], expectedPence: 12500 });
  const result = await h.allocateCategorisedReceipts({}, input); assert.match(result.success, /2 charity receipts/); assert.equal(h.written.length, 2);
  const stale = harness({ bank }); assert.match((await stale.allocateCategorisedReceipts({}, form({ transactionId: ['bank-1', 'bank-2'], expectedPence: 12000 }))).error, /changed/); assert.equal(stale.written.length, 0);
  const duplicate = harness({ bank }); assert.ok((await duplicate.allocateCategorisedReceipts({}, form({ transactionId: ['bank-1', 'bank-1'], expectedPence: 20000 }))).error); assert.equal(duplicate.written.length, 0);
});

test('fundraising costs can be allocated before charity receipts without inventing a bank movement', async () => {
  const bank = { ...receipt, transactionDate: new Date('2026-10-01T00:00:00Z'), credit: 0, debit: 100 };
  const h = harness({ bank });
  const result = await h.allocateCharity({}, form({ transactionId: 'bank-1', type: 'COST', amount: '100' }));
  assert.equal(result.success, 'Charity allocation saved.');
  assert.equal(h.written[0].type, 'COST');
  assert.equal(h.written[0].transactionId, 'bank-1');
});
