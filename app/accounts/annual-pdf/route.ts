import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const ink = rgb(0.09,0.16,0.20);
const green = rgb(0.08,0.28,0.24);
const gold = rgb(0.71,0.56,0.32);
const grey = rgb(0.43,0.48,0.49);
const pale = rgb(0.95,0.97,0.96);
const pennies = (n: unknown) => Math.round(Number(n)*100);
const money = (n:number) => (n<0?"-":"")+"£"+(Math.abs(n)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
const displayDate = (d:Date) => d.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});

export async function GET(request:Request) {
 const user = await auth();
 if (!user?.user || user.user.role !== "TREASURER") return new NextResponse("Forbidden",{status:403});
 const params = new URL(request.url).searchParams;
 const code = params.get("account");
 const year = Number(params.get("year"));
 if ((code!=="CLUB"&&code!=="MENS") || !Number.isInteger(year) || year<2000 || year>2100) return new NextResponse("Invalid account or year",{status:400});
 const start = new Date(Date.UTC(year-1,10,1));
 const end = new Date(Date.UTC(year,10,1));
 const account = await prisma.financeAccount.findUnique({where:{code},include:{transactions:{where:{transactionDate:{lt:end}},orderBy:{transactionDate:"asc"}}}});
 if (!account) return new NextResponse("Account not found",{status:404});
 const opening = pennies(account.openingBalance)+account.transactions.filter(t=>t.transactionDate<start).reduce((n,t)=>n+pennies(t.credit)-pennies(t.debit),0);
 const rows = account.transactions.filter(t=>t.transactionDate>=start);
 const categories = new Map<string,{income:number;expense:number}>();
 for(const t of rows){const v=categories.get(t.category)??{income:0,expense:0};v.income+=pennies(t.credit);v.expense+=pennies(t.debit);categories.set(t.category,v);}
 const income=[...categories].filter(([,v])=>v.income).map(([name,v])=>({name,amount:v.income})).sort((a,b)=>b.amount-a.amount);
 const expense=[...categories].filter(([,v])=>v.expense).map(([name,v])=>({name,amount:v.expense})).sort((a,b)=>b.amount-a.amount);
 const totalIn=income.reduce((n,v)=>n+v.amount,0),totalOut=expense.reduce((n,v)=>n+v.amount,0);
 const pdf=await PDFDocument.create();
 const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const W=595.28,H=841.89;
 let page=pdf.addPage([W,H]),y=H-210;
 const label=(s:string,x:number,yy:number,size=10,isBold=false,color=ink)=>page.drawText(s.replace(/[^\x20-\x7E]/g,c=>c==="£"?"GBP ":c==="–"?"-":" "),{x,y:yy,size,font:isBold?bold:normal,color});
 const right=(s:string,yy:number,size=10,isBold=false,color=ink)=>label(s,W-48-(isBold?bold:normal).widthOfTextAtSize(s.replaceAll("£","GBP "),size),yy,size,isBold,color);
 const rule=(yy:number)=>page.drawLine({start:{x:48,y:yy},end:{x:W-48,y:yy},thickness:0.7,color:gold});
 const footer=()=>{rule(55);label("THE ESSEX  |  ANNUAL ACCOUNTS",48,39,8,true,grey);right("Page "+pdf.getPageCount(),39,8,false,grey);};
 const newPage=()=>{footer();page=pdf.addPage([W,H]);y=H-92;label("THE ESSEX  |  "+(code==="MENS"?"MEN'S ACCOUNT":"CLUB ACCOUNT"),48,H-53,12,true,green);rule(H-66);};
 const ensure=(height:number)=>{if(y-height<90)newPage();};
 page.drawRectangle({x:0,y:H-177,width:W,height:177,color:green});
 page.drawRectangle({x:48,y:H-76,width:56,height:56,borderColor:gold,borderWidth:1.8});
 label("E",64,H-62,33,true,rgb(1,1,1));
 label("THE ESSEX",119,H-43,22,true,rgb(1,1,1));
 label("GOLF & COUNTRY CLUB",119,H-65,11,true,gold);
 label("ANNUAL FINANCIAL STATEMENT",48,H-116,19,true,rgb(1,1,1));
 label(code==="MENS"?"MEN'S ACCOUNT":"CLUB ACCOUNT",48,H-140,12,true,gold);
 label(displayDate(start)+" to "+displayDate(new Date(end.getTime()-86400000)),48,H-160,10,false,rgb(1,1,1));
 const summary=(heading:string,amount:number,x:number)=>{page.drawRectangle({x,y:y-68,width:155,height:69,color:pale});label(heading,x+10,y-19,9,true,grey);label(money(amount),x+10,y-46,15,true,green);};
 summary("OPENING BALANCE",opening,48);summary("TOTAL INCOME",totalIn,220);summary("TOTAL EXPENSES",totalOut,392);y-=101;
 const section=(title:string,items:{name:string;amount:number}[],total:number)=>{
   ensure(85);page.drawRectangle({x:48,y:y-31,width:W-96,height:32,color:green});label(title,60,y-21,12,true,rgb(1,1,1));y-=45;
   if(!items.length){ensure(29);label("No transactions in this period",60,y-14,10,false,grey);y-=28;}
   for(const [i,item] of items.entries()){ensure(29);if(i%2===0)page.drawRectangle({x:48,y:y-22,width:W-96,height:26,color:pale});label(item.name.slice(0,56),60,y-14,10);right(money(item.amount),y-14,10);y-=27;}
   ensure(42);rule(y-3);label("SUBTOTAL",60,y-25,10,true,green);right(money(total),y-25,12,true,green);y-=50;
 };
 section("INCOME",income,totalIn);section("EXPENDITURE",expense,totalOut);
 ensure(126);page.drawRectangle({x:48,y:y-89,width:W-96,height:92,color:pale});label("NET MOVEMENT",62,y-24,10,true,grey);right(money(totalIn-totalOut),y-24,12,true);label("CLOSING BALANCE / CARRIED FORWARD",62,y-62,10,true,green);right(money(opening+totalIn-totalOut),y-63,16,true,green);y-=120;
 ensure(67);label("NOTES",48,y,10,true,green);y-=18;label("Statement calculated from recorded bank transactions and categories.",48,y,9,false,grey);y-=15;label("Cash, debtors, creditors and restricted funds require separate AGM adjustments.",48,y,9,false,grey);
 footer();
 const bytes=await pdf.save();
 return new NextResponse(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="the-essex-'+code.toLowerCase()+'-annual-accounts-'+year+'.pdf"',"Cache-Control":"private, no-store"}});
}
