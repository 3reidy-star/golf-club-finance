import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), Date, Intl, Math, Number, String, Error });
  return exports;
}

function deletion(role, active = true, exists = true) {
  const deleted = [], refreshed = [];
  let checkedRole;
  const { deletePayout } = load('../app/payouts/history/actions.ts', {
    '@/auth': { auth: async () => role ? { user: { id: 'user', role } } : null },
    '@/lib/prisma': { prisma: {
      user: { findFirst: async ({ where }) => { checkedRole = where; return active && where.role.in.includes(role) ? { id: 'user' } : null; } },
      payoutRequest: { findUnique: async () => exists ? { id: 'duplicate' } : null, delete: async args => deleted.push(args.where.id) },
    } },
    'next/cache': { revalidatePath: path => refreshed.push(path) },
  });
  return { run: () => deletePayout('duplicate'), deleted, refreshed, checked: () => checkedRole };
}
test('Treasurer and Administrator can delete duplicate payouts and refresh all affected views', async () => {
  for (const role of ['TREASURER', 'ADMIN']) {
    const h = deletion(role); await h.run();
    assert.deepEqual(h.deleted, ['duplicate']);
    assert.equal(h.checked().active, true);
    for (const path of ['/competitions/mens-payouts', '/payouts/history', '/payouts/top-ups', '/payouts/section-payments']) assert.ok(h.refreshed.includes(path));
  }
});
test('other roles, inactive users, anonymous users and missing payouts cannot delete', async () => {
  for (const role of ['TOPUP_ADMIN', 'SECTION_USER', 'COMPETITIONS', null]) {
    const h = deletion(role); await assert.rejects(h.run(), /administrator or treasurer/); assert.equal(h.deleted.length, 0);
  }
  const inactive = deletion('TREASURER', false); await assert.rejects(inactive.run()); assert.equal(inactive.deleted.length, 0);
  const missing = deletion('TREASURER', true, false); await assert.rejects(missing.run(), /not found/); assert.equal(missing.deleted.length, 0);
});

const Share = load('../app/competitions/mens-payouts/MensTopUpShare.tsx').default;
test('WhatsApp message includes exactly one competition, players and their total', () => {
  const markup = renderToStaticMarkup(React.createElement(Share, {
    competitionName: 'October Medal', competitionDate: '25/10/2026',
    players: [{ name: 'Alex', amountPence: 1010 }, { name: 'Ben', amountPence: 2020 }],
  }));
  const href = markup.match(/href="(https:\/\/wa.me\/\?text=[^"]+)"/)[1];
  assert.equal(decodeURIComponent(href.split('?text=')[1]), 'Men’s player top-ups\nOctober Medal — 25/10/2026\n\nAlex — £10.10\nBen — £20.20\n\nTotal: £30.30');
});
test('Men’s competition sharing rejects other logins before querying payouts', async () => {
  let queried = false;
  const Page = load('../app/competitions/mens-payouts/page.tsx', {
    'next/link': () => null,
    'next/navigation': { redirect: () => { throw new Error('redirected'); } },
    '@/lib/invoice-auth': { invoiceUser: async () => null },
    '@/lib/prisma': { prisma: { payoutRequest: { findMany: async () => { queried = true; return []; } } } },
    '@/app/payouts/history/DeletePayoutButton': () => null,
    './MensTopUpShare': Share,
  }).default;
  await assert.rejects(Page(), /redirected/); assert.equal(queried, false);
});
test('competition page keeps completed player amounts available and queries only linked Men’s competitions', async () => {
  const competitions = ['October Medal', 'Autumn Cup'];
  let query;
  const Page = load('../app/competitions/mens-payouts/page.tsx', {
    'next/link': ({ children }) => React.createElement('a', null, children),
    'next/navigation': { redirect: () => { throw new Error('redirected'); } },
    '@/lib/invoice-auth': { invoiceUser: async () => ({ id: 'treasurer' }) },
    '@/lib/prisma': { prisma: { payoutRequest: { findMany: async args => { query = args; return competitions.map((name, i) => ({ id: String(i), reference: `COMP-${i}`, status: i ? 'PAID' : 'REQUESTED', competition: { name, competitionDate: new Date('2026-10-25T12:00:00Z') }, topUps: [{ recipientName: name + ' Winner', amount: '10', completed: Boolean(i) }] })); } } } },
    '@/app/payouts/history/DeletePayoutButton': () => null,
    './MensTopUpShare': Share,
  }).default;
  const html = renderToStaticMarkup(await Page());
  assert.equal(query.where.section.code, 'MENS');
  assert.equal(query.include.topUps.where.recipientType, 'PLAYER');
  assert.equal(query.include.topUps.where.completed, undefined);
  const messages = [...html.matchAll(/href="https:\/\/wa.me\/\?text=([^"]+)"/g)].map(match => decodeURIComponent(match[1]));
  assert.equal(messages.length, 2);
  assert.ok(messages[0].includes('October Medal Winner')); assert.ok(!messages[0].includes('Autumn Cup'));
  assert.ok(messages[1].includes('Autumn Cup Winner')); assert.ok(!messages[1].includes('October Medal'));
});
