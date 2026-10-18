import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLines, parsePence, parseDate, invoiceStatus, validateAllocation } from '../lib/invoices.ts';

test('currency is converted to exact pence and rounds each quantity line', () => {
  assert.equal(parsePence('19.99'), 1999);
  assert.equal(parsePence('0.1'), 10);
  const result = calculateLines([{ description: 'Sponsorship', quantity: '3', unitPrice: '19.99' }, { description: 'Half unit', quantity: '0.5', unitPrice: '0.01' }]);
  assert.equal(result.totalPence, 5998);
  assert.equal(result.lines[1].totalPence, 1);
});

test('rejects invalid money, empty lines, negative quantities and overflow', () => {
  for (const value of ['1.001', '-1', 'NaN', 'Infinity', '', '10000000']) assert.throws(() => parsePence(value));
  assert.throws(() => calculateLines([]));
  for (const quantity of ['0', '-1', '1.001', '100000']) assert.throws(() => calculateLines([{ description: 'Item', quantity, unitPrice: '1' }]));
  assert.throws(() => calculateLines([{ description: 'Item', quantity: '99999', unitPrice: '9999999' }]));
  assert.throws(() => calculateLines([{ description: 'Item', quantity: '1', unitPrice: '0' }]));
  assert.throws(() => calculateLines(Array(51).fill({ description: 'Item', quantity: '1', unitPrice: '1' })));
});

test('calendar dates are validated without silently rolling forward', () => {
  assert.equal(parseDate('2028-02-29').toISOString(), '2028-02-29T00:00:00.000Z');
  for (const value of ['2026-02-29', '2026-13-01', '2026-02-31', 'invalid']) assert.throws(() => parseDate(value));
});

const invoice = { status: 'ISSUED', dueDate: '2026-10-18', totalPence: 10000, payments: [] };
test('due today is not overdue; part payments, removed allocations and paid status are correct', () => {
  assert.equal(invoiceStatus(invoice, '2026-10-18'), 'Unpaid');
  assert.equal(invoiceStatus(invoice, '2026-10-19'), 'Overdue');
  assert.equal(invoiceStatus({ ...invoice, payments: [{ amountPence: 1000, removedAt: null }] }, '2026-10-18'), 'Part paid');
  assert.equal(invoiceStatus({ ...invoice, payments: [{ amountPence: 10000, removedAt: null }] }, '2026-10-19'), 'Paid');
  assert.equal(invoiceStatus({ ...invoice, payments: [{ amountPence: 10000, removedAt: new Date() }] }, '2026-10-18'), 'Unpaid');
  assert.equal(invoiceStatus({ ...invoice, status: 'DRAFT' }, '2026-10-19'), 'Draft');
  assert.equal(invoiceStatus({ ...invoice, status: 'VOID' }, '2026-10-19'), 'Void');
});

const allocationInvoice = { status: 'ISSUED', accountCode: 'MENS', totalPence: 10000, paidPence: 2000 };
const receipt = { accountCode: 'MENS', creditPence: 20000, debitPence: 0, allocatedPence: 15000 };
test('split receipts and part payments allow only the remaining bank and invoice amounts', () => {
  assert.doesNotThrow(() => validateAllocation(allocationInvoice, receipt, 5000));
  assert.throws(() => validateAllocation(allocationInvoice, receipt, 5001), /bank receipt/);
  assert.throws(() => validateAllocation(allocationInvoice, { ...receipt, allocatedPence: 0 }, 8001), /invoice balance/);
  assert.throws(() => validateAllocation(allocationInvoice, { ...receipt, accountCode: 'CLUB' }, 100), /invoice's account/);
  assert.throws(() => validateAllocation(allocationInvoice, { ...receipt, debitPence: 200 }, 100));
  for (const amount of [0, -1, 1.5, NaN]) assert.throws(() => validateAllocation(allocationInvoice, receipt, amount));
  for (const status of ['DRAFT', 'VOID']) assert.throws(() => validateAllocation({ ...allocationInvoice, status }, receipt, 100));
});
