import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { PDFDocument } from 'pdf-lib';
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', code)(exports, name => Object.hasOwn(mocks, name) ? mocks[name] : require(name));
  return exports;
}
const signatures = load('../lib/agm-signatures.ts');
// A deterministic stroke fixture (no real person's signature).
const png = 'data:image/png;base64,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';
async function harness(authorized = true) {
  const pdf = await PDFDocument.create(); pdf.addPage();
  const unsignedPdf = Buffer.from(await pdf.save()).toString('base64');
  const records = [];
  const db = {
    create: async ({ data }) => { const row = { ...data, id: `copy-${records.length}`, signedAt: null }; records.push(row); return row; },
    findUnique: async ({ where }) => records.find(r => r.id === where.id),
    findFirst: async () => records.findLast(r => r.signedAt),
    updateMany: async ({ where, data }) => { const row = records.find(r => r.id === where.id && r.signedAt === null); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
  };
  let generation = 0;
  const mocks = {
    '@/lib/invoice-auth': { invoiceUser: async () => authorized ? { id: 'craig' } : null },
    '@/lib/prisma': { prisma: { annualAccountsApproval: db } },
    '@/lib/annual-accounts-pdf': { generateAnnualPdf: async () => { generation++; return Buffer.from(unsignedPdf, 'base64'); } },
    '@/lib/agm-signatures': signatures,
    'next/cache': { revalidatePath() {} },
    'next/server': { NextResponse: class { constructor(body, options = {}) { this.body = body; this.status = options.status ?? 200; } } },
  };
  return { ...load('../app/accounts/agm/actions.ts', mocks), route: load('../app/accounts/annual-pdf/route.ts', mocks), records, generated: () => generation, unsignedPdf };
}
test('prepared PDF is signed, immutable and used for annual downloads', async () => {
  const h = await harness();
  const { id } = await h.prepareAccounts('MENS', 2026);
  const result = await h.approveAccounts(id, '2026-11-09', png, png, true);
  assert.equal(result.success, true);
  const original = h.records[0].signedPdf;
  const document = await PDFDocument.load(Buffer.from(original, 'base64'));
  assert.equal(document.getPageCount(), 2);
  writeFileSync('/tmp/agm-signature-test.pdf', Buffer.from(original, 'base64'));
  const text = execFileSync('pdftotext', ['/tmp/agm-signature-test.pdf', '-'], { encoding: 'utf8' });
  assert.match(text, /Craig Reid - Treasurer/); assert.match(text, /Paul Thompson - Captain/); assert.match(text, /09\/11\/2026/);
  assert.ok((await h.approveAccounts(id, '2026-11-09', png, png, true)).error);
  assert.equal(h.records[0].signedPdf, original);
  const response = await h.route.GET({ url: 'https://example.test/accounts/annual-pdf?account=MENS&year=2026' });
  assert.deepEqual(response.body, Buffer.from(original, 'base64'));
  assert.equal(h.generated(), 1);
  await h.prepareAccounts('MENS', 2026);
  assert.equal(h.records.length, 2); assert.equal(h.records[0].signedPdf, original);
});
test('authorization, missing signatures, confirmation and dates are enforced', async () => {
  const blocked = await harness(false);
  assert.ok((await blocked.prepareAccounts('MENS', 2026)).error);
  assert.ok((await blocked.approveAccounts('id', '2026-11-09', png, png, true)).error);
  assert.equal(blocked.records.length, 0);
  const h = await harness();
  assert.ok((await h.prepareAccounts('ALL', 2026)).error);
  const { id } = await h.prepareAccounts('MENS', 2026);
  for (const [date, a, b, confirmed] of [['2026-11-09', '', png, true], ['2026-11-09', png, '', true], ['2026-11-09', png, png, false], ['2026-02-30', png, png, true], ['2026-10-30', png, png, true], ['2099-11-09', png, png, true]]) {
    assert.ok((await h.approveAccounts(id, date, a, b, confirmed)).error);
    assert.equal(h.records[0].signedAt, null);
  }
});
test('concurrent approvals cannot overwrite the approved document', async () => {
  const h = await harness(); const { id } = await h.prepareAccounts('CLUB', 2026);
  const results = await Promise.all([h.approveAccounts(id, '2026-11-09', png, png, true), h.approveAccounts(id, '2026-11-09', png, png, true)]);
  assert.equal(results.filter(r => r.success).length, 1);
});
