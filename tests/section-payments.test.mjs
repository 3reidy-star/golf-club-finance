import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ lines = [{ id: 'a', payoutRequestId: 'p1', amount: '10.10' }, { id: 'b', payoutRequestId: 'p2', amount: '20.20' }], outstanding = 0, authorised = true, count = lines.length } = {}) {
  const updates = [], paid = [];
  const tx = { payoutTopUp: { findMany: async () => lines, updateMany: async args => { updates.push(args); return { count }; }, count: async () => outstanding }, payoutRequest: { update: async args => paid.push(args) } };
  const mocks = {
    'node:crypto': { randomUUID: () => 'batch-123' },
    '@prisma/client': { PayoutStatus: { APPROVED: 'APPROVED', PAID: 'PAID' }, Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } } },
    'next/cache': { revalidatePath() {} }, '@/auth': { auth: async () => ({ user: { id: 'treasurer' } }) },
    '@/lib/prisma': { prisma: { user: { findFirst: async () => authorised ? { id: 'treasurer' } : null }, $transaction: async fn => fn(tx) } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/payouts/section-payments/actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: name => mocks[name], Date, Set, Math, Number, String, Error });
  const form = new FormData(); form.set('reference', 'BANK-001');
  return { run: (ids = ['a', 'b'], amount = 3030) => exports.completeSectionBatch('s1', ids, amount, form), updates, paid };
}
test('one transfer preserves all lines, shared reference and completion time', async () => {
  const h = harness(); await h.run();
  assert.equal(h.updates.length, 1);
  assert.equal(h.updates[0].data.sectionPaymentReference, 'BANK-001');
  assert.equal(h.updates[0].data.sectionPaymentBatchId, 'batch-123');
  assert.equal(h.updates[0].where.payoutRequest.sectionId, 's1');
  assert.equal(h.paid.length, 2);
  assert.equal(h.paid[0].data.paidById, 'treasurer');
});
test('player top-ups outstanding keep payout approved', async () => {
  const h = harness({ outstanding: 1 }); await h.run(); assert.equal(h.paid.length, 0);
});
test('changed totals, missing or completed lines, duplicate submissions and unauthorised users are rejected', async () => {
  await assert.rejects(harness().run(['a', 'b'], 3000), /changed/);
  await assert.rejects(harness({ lines: [] }).run(), /changed/);
  await assert.rejects(harness().run(['a', 'a']), /reference/);
  await assert.rejects(harness({ authorised: false }).run(), /authorised/);
  await assert.rejects(harness({ count: 0 }).run(), /changed/);
});
