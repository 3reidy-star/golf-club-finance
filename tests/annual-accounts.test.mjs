import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path) {
 const exports = {};
 const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
 new Function('exports', 'require', source)(exports, name => name === './charity-ledger' ? load('../lib/charity-ledger.ts') : require(name));
 return exports;
}
const { calculateAnnualAccounts, annualActivityRows } = load('../lib/annual-accounts.ts');
const day = value => new Date(value+'T00:00:00Z');
const row = (id, date, credit, debit = 0, category = 'Competition Fees') => ({ id, transactionDate: day(date), credit, debit, category });
const account = rows => ({ code: 'CLUB', name: 'Club Account', openingBalance: 100, openingDate: day('2024-01-01'), transactions: rows });
const reviews = [{ year: 2026, debtorsPence: 0, otherCreditorsPence: 0, stockConfirmed: false, stockItems: [], commentary: '' }];
test('AGM dates use November to October, including boundary dates exactly once', () => {
 const a = account([row('before','2025-10-31',10),row('start','2025-11-01',20),row('last','2026-10-31',0,5),row('next','2026-11-01',999)]);
 const r=calculateAnnualAccounts(a,2026,[{year:2025,amountPence:0},{year:2026,amountPence:0}],[],reviews);
 assert.equal(r.openingBank,11000); assert.equal(r.credit,2000); assert.equal(r.debit,500); assert.equal(r.closingBank,12500); assert.equal(r.rows,2);
});
test('moving prior-year dated entries fixes opening without changing closing or totals across years', () => {
 const before=account([row('date-error','2025-12-18',1200)]);
 const after=account([row('date-error','2024-12-18',1200)]);
 const a=calculateAnnualAccounts(before,2026,[],[],[]), b=calculateAnnualAccounts(after,2026,[],[],[]);
 assert.equal(b.openingBank-a.openingBank,120000); assert.equal(a.closingBank,b.closingBank); assert.equal(a.credit-b.credit,120000);
});
test('unconfirmed cash stays unknown, explicit zero is accepted, and stock never increases cash', () => {
 const a=account([]), cash=[{year:2025,amountPence:0},{year:2026,amountPence:0}];
 const missing=calculateAnnualAccounts(a,2026,[],[],reviews); assert.equal(missing.closingFunds,null); assert.ok(missing.issues.length);
 const zero=calculateAnnualAccounts(a,2026,cash,[],reviews); assert.equal(zero.closingFunds,10000); assert.equal(zero.netAssetsBeforeStock,10000); assert.equal(zero.stockValue,null);
 const stock=calculateAnnualAccounts(a,2026,cash,[],[{...reviews[0],stockConfirmed:true,stockItems:[{description:'Golf balls',quantity:12,unitCostPence:300}]}]);
 assert.equal(stock.stockValue,3600); assert.equal(stock.closingFunds,10000); assert.equal(stock.netAssetsBeforeStock,10000);
});
test('restricted funds and changes in cash reconcile the available balance', () => {
 const a={...account([row('charity','2026-10-20',100,0,'Thommo Charity'),row('ordinary','2026-03-01',500)]),code:'MENS'};
 const r=calculateAnnualAccounts(a,2026,[{year:2025,amountPence:0},{year:2026,amountPence:24500}],[],reviews);
 assert.equal(r.charity.closing,10000); assert.equal(r.totalIncome,50000);
 assert.equal(r.openingFunds+r.surplus+r.juniorOpening-r.juniorClosing+r.closingCash-r.openingCash,r.closingFunds);
});

test('activity comparison pairs related fees and costs and preserves both totals', () => {
 const report = { income: [{name:'Curry Cup Fees',amount:100500},{name:'Curry Cup Cost',amount:18350},{name:'Junior Comp Fee',amount:2823},{name:'Other',amount:50}], expense: [{name:'Curry Cup Fees',amount:51750},{name:'Curry Cup Cost',amount:128100},{name:'Junior Sponsorship',amount:135194},{name:'Junior Competition Cost',amount:110350}] };
 const rows = annualActivityRows(report);
 assert.deepEqual(rows.find(row=>row.name==='Curry Cup'),{name:'Curry Cup',revenue:118850,expenditure:179850,net:-61000});
 assert.equal(rows.find(row=>row.name==='Juniors').revenue,2823);
 assert.equal(rows.find(row=>row.name==='Juniors').expenditure,245544);
 assert.equal(rows.reduce((sum,row)=>sum+row.revenue,0),report.income.reduce((sum,row)=>sum+row.amount,0));
 assert.equal(rows.reduce((sum,row)=>sum+row.expenditure,0),report.expense.reduce((sum,row)=>sum+row.amount,0));
 assert.ok(rows.find(row=>row.name==='Other'));
});

test('external debtor increases net assets without changing cash, revenue or the other account', () => {
 const cash=[{year:2025,amountPence:0},{year:2026,amountPence:0}];
 const before=calculateAnnualAccounts(account([]),2026,cash,[],reviews);
 const after=calculateAnnualAccounts(account([]),2026,cash,[],[{...reviews[0],debtorsPence:30000}]);
 assert.equal(after.netAssetsBeforeStock-before.netAssetsBeforeStock,30000);
 assert.equal(after.closingBank,before.closingBank); assert.equal(after.closingFunds,before.closingFunds);
 assert.equal(after.totalIncome,before.totalIncome); assert.equal(after.totalExpense,before.totalExpense);
 assert.equal(calculateAnnualAccounts(account([]),2026,cash,[],reviews).otherCreditors,0);
});
