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
    '@/lib/invoice-auth': { invoiceUser: async () => ({ id: 'treasurer' }) },
    '@/lib/prisma': { prisma: {
      annualAccountsApproval: { findFirst: async () => null },
      financeAccount: { findUnique: async args => ({ code: args.where.code, name: args.where.code === 'MENS' ? "Men's Account" : 'Club Account', openingDate: day('2023-01-01'), openingBalance: 1000, transactions: bank.filter(t => t.transactionDate < args.include.transactions.where.transactionDate.lt) }) },
      charityEntry: { findMany: async () => entries },
      cashYearEnd: { findMany: async ({ where }) => cashCount && where.accountCode === cashCount.accountCode ? [cashCount] : [] },
      annualAccountsReview: { findMany: async () => [] },
    } },
    '@/lib/charity-ledger': charity,
  };
  function load(path) {
    const exports = {};
    const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    new Function('exports', 'require', source)(exports, name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('./annual-accounts')) return load('../lib/' + name.slice(2) + '.ts');
      if (name === './pdf-fonts') return load('../lib/pdf-fonts.ts');
      if (name === './charity-ledger') return charity;
      return require(name);
    });
    return exports;
  }
  mocks['@/lib/annual-accounts-pdf'] = load('../lib/annual-accounts-pdf.ts');
  const exports = load('../app/accounts/annual-pdf/route.ts');
  return exports.GET;
}
async function document(year) {
  const response = await route()({ url: `https://example.test/accounts/annual-pdf?account=MENS&year=${year}` });
  assert.equal(response.status, 200);
  const path = `/tmp/golf-charity-example-${year}.pdf`;
  writeFileSync(path, response.body);
  return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
}
test('AGM statement shows the contribution and one charity liability', async () => {
  const text = await document(2026);
  assert.match(text, /Annual accounts - AGM summary/);
  assert.match(text, /Awards Night\s+£500\.00/);
  assert.match(text, /Charity contribution\s+£83\.00/);
  assert.match(text, /Less Thommo's Charity\s+-£183\.00/);
  assert.match(text, /Account - closing bank\s+£1,600\.00/);
  assert.match(text, /Less Thommo's Charity\s+-£183\.00/);
  assert.doesNotMatch(text, /Thommo Charity\s+£100\.00/);
});
test('November payment clears liability without a second charity expense', async () => {
  const text = await document(2027);
  assert.match(text, /Less Thommo's Charity brought forward\s+-£183\.00/);
  assert.match(text, /Thommo's Charity\s+£0\.00/);
  assert.match(text, /Account - closing bank\s+£1,417\.00/);
  assert.doesNotMatch(text, /Charity contribution\s+£83\.00/);
});
test('cash is included in the net balance and missing counts remain visible', async () => {
  const absent = await document(2026);
  assert.match(absent, /Cash\s+Not confirmed/);
  const response = await route({ accountCode: 'MENS', year: 2026, amountPence: 12345 })({ url: 'https://example.test/accounts/annual-pdf?account=MENS&year=2026' });
  const path = '/tmp/golf-cash-check-2026.pdf'; writeFileSync(path, response.body);
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.match(text, /Cash\s+£123\.45/);
  assert.match(text, /Less junior money\s+-£148\.28/);
  assert.match(text, /Less junior money\s+-£148\.28/);
  assert.match(text, /Net balance - available bank and cash\s+£1,392\.17/);
});
test('club accounts do not reclassify mens charity categories', async () => {
  const response = await route()({ url: 'https://example.test/accounts/annual-pdf?account=CLUB&year=2026' });
  const path = '/tmp/golf-club-check-2026.pdf'; writeFileSync(path, response.body);
  const text = execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.match(text, /Thommo Charity\s+£100\.00/);
  assert.doesNotMatch(text, /Less Thommo's Charity/);
});
