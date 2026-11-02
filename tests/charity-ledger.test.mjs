import test from 'node:test';
import assert from 'node:assert/strict';
import { charityBalance, reportCharity, validateTimeline } from '../lib/charity-ledger.ts';

const day = date => new Date(`${date}T00:00:00.000Z`);
const contribution = { type: 'CONTRIBUTION', effectiveDate: day('2026-10-27'), amountPence: 8300, transactionId: null, removedAt: null };
const receipt = { type: 'RECEIPT', effectiveDate: day('2026-10-20'), amountPence: 10000, transactionId: 'credit', removedAt: null };
const payment = { type: 'PAYMENT', effectiveDate: day('2026-11-03'), amountPence: 18300, transactionId: 'debit', removedAt: null };
const rows = [
  { id: 'credit', transactionDate: day('2026-10-20'), category: 'Thommo Charity', credit: 100, debit: 0 },
  { id: 'debit', transactionDate: day('2026-11-03'), category: 'Thommo Charity', credit: 0, debit: 183 },
  { id: 'unmatched', transactionDate: day('2026-10-22'), category: 'Thommo Charity', credit: 10, debit: 0 },
];

test('October includes Awards contribution and allocated fundraising; November payment clears the payable', () => {
  const entries = [contribution, receipt, payment];
  assert.equal(charityBalance(entries, day('2026-11-01')), 18300);
  assert.equal(charityBalance(entries, day('2026-11-04')), 0);
  assert.doesNotThrow(() => validateTimeline(entries));
  const previous = reportCharity(entries, rows, day('2025-11-01'), day('2026-11-01'));
  assert.equal(previous.contribution, 8300); assert.equal(previous.closing, 18300);
  assert.deepEqual(previous.adjustments.get('Thommo Charity'), { income: -10000, expense: 0 });
  assert.deepEqual(previous.unmatched.map(r => r.id), ['unmatched']);
  const next = reportCharity(entries, rows, day('2026-11-01'), day('2027-11-01'));
  assert.equal(next.opening, 18300); assert.equal(next.closing, 0); assert.equal(next.contribution, 0);
  assert.deepEqual(next.adjustments.get('Thommo Charity'), { income: 0, expense: -18300 });
});
test('partial allocation only removes the allocated amount from the bank category', () => {
  const partial = { ...receipt, amountPence: 4000 };
  const report = reportCharity([partial], rows, day('2025-11-01'), day('2026-11-01'));
  assert.equal(report.closing, 4000);
  assert.equal(report.adjustments.get('Thommo Charity').income, -4000);
});
test('prevent payments exceeding the recorded balance on any date and ignore removed entries', () => {
  assert.throws(() => validateTimeline([receipt, { ...payment, effectiveDate: day('2026-10-25') }, contribution]), /negative/);
  assert.doesNotThrow(() => validateTimeline([{ ...contribution, removedAt: day('2026-10-28') }, receipt]));
  assert.equal(charityBalance([{ ...receipt, removedAt: day('2026-10-25') }], day('2026-11-01')), 0);
  assert.throws(() => validateTimeline([payment]), /negative/);
});
test('a broken link does not silently corrupt annual accounts', () => {
  assert.throws(() => reportCharity([receipt], [], day('2025-11-01'), day('2026-11-01')), /missing its bank/);
});

test('charity event costs reduce the amount owed, even when paid before receipts arrive', () => {
  const eventCosts = { type: 'COST', effectiveDate: day('2026-10-10'), amountPence: 110907, transactionId: 'event-costs', removedAt: null };
  const raised = { type: 'RECEIPT', effectiveDate: day('2026-10-20'), amountPence: 956332, transactionId: 'fundraising', removedAt: null };
  const settlement = { type: 'PAYMENT', effectiveDate: day('2026-11-03'), amountPence: 853725, transactionId: 'settlement', removedAt: null };
  const entries = [eventCosts, raised, contribution, settlement];
  assert.doesNotThrow(() => validateTimeline(entries));
  assert.equal(charityBalance(entries, day('2026-11-01')), 853725);
  assert.equal(charityBalance(entries, day('2026-11-04')), 0);
  const bankRows = [
    { id: 'event-costs', transactionDate: day('2026-10-10'), category: 'Thommo Charity', credit: 0, debit: 1109.07 },
    { id: 'fundraising', transactionDate: day('2026-10-20'), category: 'Thommo Charity', credit: 9563.32, debit: 0 },
  ];
  const report = reportCharity(entries, bankRows, day('2025-11-01'), day('2026-11-01'));
  assert.deepEqual(report.adjustments.get('Thommo Charity'), { income: -956332, expense: -110907 });
  assert.equal(report.contribution, 8300);
});
