import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import * as charity from '../lib/charity-ledger.ts';
const require = createRequire(import.meta.url);
const day = date => new Date(`${date}T00:00:00.000Z`);
const bank = [
  { id: 'event', transactionDate: day('2026-10-20'), category: 'Awards Night', credit: 500, debit: 0 },
  { id: 'receipt', transactionDate: day('2026-10-21'), category: 'Thommo Charity', credit: 100, debit: 0 },
  { id: 'payment', transactionDate: day('2026-11-03'), category: 'Thommo Charity', credit: 0, debit: 183 },
];
const entries = [
  { type: 'CONTRIBUTION', amountPence: 8300, effectiveDate: day('2026-10-27'), transactionId: null, removedAt: null },
  { type: 'RECEIPT', amountPence: 10000, effectiveDate: day('2026-10-21'), transactionId: 'receipt', removedAt: null },
  { type: 'PAYMENT', amountPence: 18300, effectiveDate: day('2026-11-03'), transactionId: 'payment', removedAt: null },
];
function route(cashCount = null) {
  class NextResponse { constructor(body, opts = {}) { this.body = body; this.status = opts.status ?? 200; } }
  const mocks = {
    'next/server': { NextResponse },
    '@/auth': { auth: async () => ({ user: { role: 'TREASURER' } }) },
    '@/lib/prisma': { prisma: {
      financeAccount: { findUnique: async args => ({ openingBalance: 1000, transactions: bank.filter(t => t.transactionDate < args.include.transactions.where.transactionDate.lt) }) },
      charityEntry: { findMany: async () => entries },
      cashYearEnd: { findUnique: async ({ where }) => cashCount && where.accountCode_year.accountCode === cashCount.accountCode && where.accountCode_year.year === cashCount.year ? cashCount : null },
    } },
    '@/lib/charity-ledger': charity,
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../app/accounts/annual-pdf/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  return exports.GET;
}
async function document(year) {
  const response = await route()({ url: `https://example.test/accounts/annual-pdf?account=MENS&year=${year}` });
  assert.equal(response.status, 200);
  const path = `/tmp/golf-charity-example-${year}.pdf`;
  writeFileSync(path, response.body);
  return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
}
test('2026 PDF records £83 expense, £183 charity liability and unchanged bank balance', async () => {
  const text = await document(2026);
  assert.match(text, /Awards Night\s+£500\.00/);
  assert.match(text, /Charity contribution\s+£83\.00/);
  assert.match(text, /TOTAL RECORDED CHARITY PAYABLE\s+£183\.00/);
  assert.match(text, /TOTAL CLOSING BANK POSITION\s+£1,600\.00/);
  assert.match(text, /TOTAL BANK LESS RECORDED CHARITY\s+£1,417\.00/);
  assert.match(text, /Unallocated Thommo Charity bank transactions to review: 0/);
});
test('November payment clears liability in next year without a second charity expense', async () => {
  const text = await document(2027);
  assert.match(text, /Opening charity balance\s+£183\.00/);
  assert.match(text, /TOTAL RECORDED CHARITY PAYABLE\s+£0\.00/);
  assert.match(text, /TOTAL CLOSING BANK POSITION\s+£1,417\.00/);
  assert.doesNotMatch(text, /Charity contribution\s+£83\.00/);
  assert.doesNotMatch(text, /Thommo Charity\s+£183\.00/);
});

test('optional October 29 estimate includes the £83 once and remains separate from recorded liability', async () => {
  const response = await route()({ url: 'https://example.test/accounts/annual-pdf?account=MENS&year=2026&charityIncome=9563.32&charityCosts=1109.07&awardsAllocation=83.00' });
  assert.equal(response.status, 200);
  const path = '/tmp/golf-charity-estimate-2026.pdf';
  writeFileSync(path, response.body);
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.match(text, /TOTAL CHARITY ESTIMATE - MANUAL\s+£8,537\.25/);
  assert.match(text, /TOTAL RECORDED CHARITY PAYABLE\s+£183\.00/);
  assert.match(text, /not saved or added to the/);
  assert.match(text, /recorded payable above/);
});
test('incomplete, malformed or negative provisional estimates are rejected', async () => {
  for (const input of [
    'charityIncome=12&charityCosts=1',
    'charityIncome=-12&charityCosts=1&awardsAllocation=0',
    'charityIncome=12&charityCosts=20&awardsAllocation=0',
  ]) {
    const response = await route()({ url: `https://example.test/accounts/annual-pdf?account=MENS&year=2026&${input}` });
    assert.equal(response.status, 400);
  }
});


test('cash on hand is reported as a separate year-end asset and included in the balance after charity', async () => {
  const response = await route({ accountCode: 'MENS', year: 2026, amountPence: 12345 })({ url: 'https://example.test/accounts/annual-pdf?account=MENS&year=2026' });
  const path = '/tmp/golf-cash-check-2026.pdf'; writeFileSync(path, response.body);
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.match(text, /TOTAL CLOSING BANK POSITION\s+£1,600\.00/);
  assert.match(text, /TOTAL CASH ON HAND\s+£123\.45/);
  assert.match(text, /TOTAL BANK AND CASH ON HAND\s+£1,723\.45/);
  assert.match(text, /TOTAL BANK AND CASH LESS RECORDED CHARITY\s+£1,540\.45/);
});
test('unentered cash is explicitly marked, while a counted zero is reported as zero', async () => {
  const absent = await document(2026); assert.match(absent, /Cash on hand at year end has not been entered/);
  const response = await route({ accountCode: 'MENS', year: 2026, amountPence: 0 })({ url: 'https://example.test/accounts/annual-pdf?account=MENS&year=2026' });
  const path = '/tmp/golf-cash-zero-2026.pdf'; writeFileSync(path, response.body);
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.match(text, /TOTAL CASH ON HAND\s+£0\.00/);
  assert.doesNotMatch(text, /Cash on hand at year end has not been entered/);
});

test('cash counts are scoped to the selected account and year', async () => {
  const get = route({ accountCode: 'MENS', year: 2026, amountPence: 12345 });
  for (const input of ['account=CLUB&year=2026', 'account=MENS&year=2027']) {
    const response = await get({ url: `https://example.test/accounts/annual-pdf?${input}` });
    const path = '/tmp/golf-cash-scope.pdf'; writeFileSync(path, response.body);
    const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
    assert.match(text, /Cash on hand at year end has not been entered/);
    assert.doesNotMatch(text, /TOTAL CASH ON HAND\s+£123\.45/);
  }
});
