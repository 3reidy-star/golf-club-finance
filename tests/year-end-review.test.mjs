import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks={}) {
 const exports={};
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('exports','require',code)(exports,name=>Object.hasOwn(mocks,name)?mocks[name]:require(name));return exports;
}
function harness(authorized=true) {
 let record=null;
 const tx={ annualAccountsReview:{
  findUnique:async()=>record,
  create:async({data})=>{record={...data,id:'review',version:1};return record;},
  updateMany:async({where,data})=>{if(record?.version!==where.version)return{count:0}; record={...record,...data,version:record.version+1};return{count:1};},
 }};
 const mocks={
  '@/lib/invoice-auth':{invoiceUser:async()=>authorized?{id:'craig'}:null},
  '@/lib/prisma':{prisma:{$transaction:async fn=>fn(tx)}},
  '@/lib/invoices':load('../lib/invoices.ts'),
  'next/cache':{revalidatePath(){}},
 };
 return {...load('../app/accounts/year-end/actions.ts',mocks),record:()=>record};
}
function form(extra={}) {
 const data=new FormData();
 for(const [key,value]of Object.entries({accountCode:'MENS',year:'2026',version:'0',debtors:'0',creditors:'0',...extra}))data.set(key,value);
 return data;
}
test('year-end review saves explicit zero and valued stock without changing bank or cash',async()=>{
 const h=harness();const result=await h.saveYearEndReview({},form({'description:0':'Golf balls','quantity:0':'12','cost:0':'2.50',stockConfirmed:'on'}));
 assert.equal(result.version,1);assert.equal(h.record().debtorsPence,0);assert.equal(h.record().otherCreditorsPence,0);
 assert.deepEqual(h.record().stockItems,[{description:'Golf balls',quantity:12,unitCostPence:250}]);
 assert.equal(h.record().stockConfirmed,true);assert.equal(h.record().updatedById,'craig');
 assert.equal('amountPence'in h.record(),false);
});
test('unconfirmed other balances remain null and stale edits are rejected',async()=>{
 const h=harness();await h.saveYearEndReview({},form({debtors:'',creditors:''}));
 assert.equal(h.record().debtorsPence,null);assert.equal(h.record().otherCreditorsPence,null);
 assert.ok((await h.saveYearEndReview({},form())).error);assert.equal(h.record().version,1);
});
test('unauthorised users and incomplete or fractional stock counts cannot save',async()=>{
 const blocked=harness(false);assert.ok((await blocked.saveYearEndReview({},form())).error);assert.equal(blocked.record(),null);
 for(const quantity of ['','0','1.5','100000']){
  const h=harness();assert.ok((await h.saveYearEndReview({},form({'description:0':'Kit','quantity:0':quantity,'cost:0':'20'}))).error);assert.equal(h.record(),null);
 }
});
