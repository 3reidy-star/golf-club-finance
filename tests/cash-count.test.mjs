import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as invoices from '../lib/invoices.ts';
const require = createRequire(import.meta.url);
function harness({ allowed = true, current = null, account = true, changed = false } = {}) {
  const written = [], history = [], refreshed = [];
  const tx = {
    financeAccount: { findUnique: async () => account ? { code: 'MENS' } : null },
    cashYearEnd: {
      findUnique: async () => current,
      create: async ({ data }) => { written.push(data); return { id: 'count-1' }; },
      updateMany: async ({ data }) => { if (changed) return { count: 0 }; written.push(data); return { count: 1 }; },
    },
    cashYearEndHistory: { create: async ({ data }) => history.push(data) },
  };
  class PrismaError extends Error {}
  const mocks = {
    '@prisma/client': { Prisma: { PrismaClientKnownRequestError: PrismaError } },
    'next/cache': { revalidatePath: path => refreshed.push(path) },
    '@/lib/invoice-auth': { invoiceUser: async () => allowed ? { id: 'treasurer' } : null },
    '@/lib/invoices': invoices,
    '@/lib/prisma': { prisma: { $transaction: async fn => fn(tx) } },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../app/accounts/cash/actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  return { ...exports, written, history, refreshed };
}
function data(overrides = {}) { const form = new FormData(); for (const [key, value] of Object.entries({ accountCode: 'MENS', year: '2026', version: '0', amount: '12.34', note: 'Counted cash', ...overrides })) form.set(key, value); return form; }
test('records a separate year-end count including zero and keeps an audit record', async () => {
  for (const amount of ['12.34', '0.00']) {
    const h = harness(); const result = await h.saveCashCount({}, data({ amount }));
    assert.match(result.success, /31 October 2026/); assert.equal(result.version, 1);
    assert.equal(h.written[0].amountPence, Math.round(Number(amount) * 100));
    assert.equal(h.history[0].amountPence, h.written[0].amountPence); assert.equal(h.history[0].recordedById, 'treasurer');
    assert.ok(h.refreshed.includes('/accounts/annual-pdf'));
  }
});
test('restricts access, validates amounts and rejects stale updates', async () => {
  for (const [opts, values] of [[{ allowed: false }, {}], [{}, { amount: '-1' }], [{}, { amount: '1.001' }], [{}, { year: '1999' }], [{}, { accountCode: 'OTHER' }], [{ account: false }, {}], [{ current: { id: 'count-1', version: 2 } }, { version: '1' }], [{ current: { id: 'count-1', version: 1 }, changed: true }, { version: '1' }]]) {
    const h = harness(opts); const result = await h.saveCashCount({}, data(values)); assert.ok(result.error); assert.equal(h.history.length, 0);
  }
});
test('updates an existing count and adds a new audit version', async () => {
  const h = harness({ current: { id: 'count-1', version: 2 } }); const result = await h.saveCashCount({}, data({ version: '2', amount: '25.00' }));
  assert.equal(result.version, 3); assert.equal(h.written[0].amountPence, 2500); assert.equal(h.history[0].version, 3);
});
