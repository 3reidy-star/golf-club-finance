import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

async function render(role, sectionCodes) {
  let query;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    '@prisma/client': { SectionCode: { MENS: 'MENS', SENIORS: 'SENIORS' } },
    'next/link': { default: 'a' },
    'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
    '@/auth': { auth: async () => ({ user: { role, sectionCodes } }) },
    '@/lib/prisma': { prisma: { payoutTopUp: { findMany: async args => { query = args; return []; } } } },
    './actions': { completeSectionBatch() {} },
  };
  const source = readFileSync(new URL('../app/payouts/section-payments/page.tsx', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => mocks[name], Map: { groupBy: () => new Map() }, Intl, Object, Set, Math, Number,
  });
  return { tree: await exports.default(), query };
}
function types(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(types);
  return [node.type, ...types(node.props?.children)];
}
test('section access is restricted to assigned sections and completed transfers without payment forms', async () => {
  const { tree, query } = await render('SECTION_USER', ['SENIORS']);
  assert.equal(query.where.completed, true);
  assert.deepEqual(Array.from(query.where.payoutRequest.section.code.in), ['SENIORS']);
  assert.equal(types(tree).includes('form'), false);
});
test('missing or invalid section assignments fail closed', async () => {
  await assert.rejects(render('SECTION_USER', []), /redirect:/);
  await assert.rejects(render('SECTION_USER', ['INVALID']), /redirect:/);
});
test('unrelated roles cannot read section payment history', async () => {
  await assert.rejects(render('TOPUP_ADMIN', []), /redirect:/);
});
test('Treasurer retains access across sections', async () => {
  const { query } = await render('TREASURER', []);
  assert.equal(query.where.payoutRequest, undefined);
  assert.equal(query.where.completed, undefined);
});
