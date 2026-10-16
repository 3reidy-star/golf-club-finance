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
 const label=(s:string,x:number,yy:number,size=10,isBold=false,color=ink)=>page.drawText(s.replace(/–/g,"-"),{x,y:yy,size,font:isBold?bold:normal,color});
 const right=(s:string,yy:number,size=10,isBold=false,color=ink)=>label(s,W-48-(isBold?bold:normal).widthOfTextAtSize(s,size),yy,size,isBold,color);
 const rule=(yy:number)=>page.drawLine({start:{x:48,y:yy},end:{x:W-48,y:yy},thickness:0.7,color:gold});
 const footer=()=>{rule(55);label("THE ESSEX  |  ANNUAL ACCOUNTS",48,39,8,true,grey);right("Page "+pdf.getPageCount(),39,8,false,grey);};
 const newPage=()=>{footer();page=pdf.addPage([W,H]);y=H-92;label("THE ESSEX  |  "+(code==="MENS"?"MEN'S ACCOUNT":"CLUB ACCOUNT"),48,H-53,12,true,green);rule(H-66);};
 const ensure=(height:number)=>{if(y-height<90)newPage();};
 // Reproduce the approved AGM design: white paper, centred crest/wordmark,
 // understated green section headings, alternating pale rows and fine gold totals.
 const crest = (cx:number,top:number,scale:number) => {
   const px=(n:number)=>cx+(n-50)*scale, py=(n:number)=>top-n*scale;
   const strokes=[[[50,0],[19,8],[13,28],[13,54],[23,77],[36,91],[46,96]],
                  [[50,0],[81,8],[87,28],[87,54],[77,77],[64,91],[54,96]]];
   for(const points of strokes)for(let i=1;i<points.length;i++)page.drawLine({start:{x:px(points[i-1][0]),y:py(points[i-1][1])},end:{x:px(points[i][0]),y:py(points[i][1])},thickness:3*scale,color:ink});
   for(const offset of [0,7,14])page.drawLine({start:{x:px(23),y:py(48+offset/2)},end:{x:px(72),y:py(46+offset/2)},thickness:1.4*scale,color:ink});
 };
 const title = (text:string,yy:number,size:number,color=ink) => label(text,(W-bold.widthOfTextAtSize(text,size))/2,yy,size,true,color);
 const subtitle=(text:string,yy:number,size:number,color=green)=>label(text,(W-normal.widthOfTextAtSize(text,size))/2,yy,size,false,color);
 const footerText=()=>{rule(44);label("THE ESSEX  |  AGM FINANCIAL STATEMENT",59,30,7,true,grey);right("Page "+pdf.getPageCount(),30,7,false,grey);};
 // Replace the original header and compact card layout.
 page.drawRectangle({x:0,y:0,width:W,height:H,color:rgb(1,1,1)});
 crest(W/2,H-47,0.72);
 title("THE ESSEX",H-157,21);
 title("BY THE CLUB COMPANY",H-174,8);
 title("ANNUAL GENERAL MEETING",H-226,20);
 subtitle((code==="MENS"?"MEN'S ACCOUNT":"CLUB ACCOUNT")+"  |  "+displayDate(start)+" - "+displayDate(new Date(end.getTime()-86400000)),H-246,9);
 y=H-285;
 const next = () => {footerText();page=pdf.addPage([W,H]);y=H-86;title("THE ESSEX",H-45,13);subtitle(code==="MENS"?"MEN'S ACCOUNT":"CLUB ACCOUNT",H-62,9);rule(H-73);};
 const room=(height:number)=>{if(y-height<76)next();};
 const row=(name:string,amount:number,index:number,strong=false)=>{
   room(26);
   if(index%2===1)page.drawRectangle({x:48,y:y-21,width:W-96,height:25,color:pale});
   label(name.slice(0,64),70,y-14,9,strong,strong?green:ink);
   right(money(amount),y-14,9,strong,strong?green:ink);
   y-=26;
 };
 const section2=(heading:string,items:{name:string;amount:number}[],total?:number)=>{
   room(76);label(heading.toUpperCase(),64,y-10,11,true,green);y-=30;
   if(!items.length){row("No transactions recorded",0,0); }
   else items.forEach((r,i)=>row(r.name,r.amount,i));
   if(total!==undefined){room(32);rule(y-1);row("TOTAL "+heading.toUpperCase(),total,0,true);y-=8;}
   y-=16;
 };
 section2("Opening position",[{name:"Balance carried forward",amount:opening}],opening);
 section2("Income",income.map(x=>({name:x.name,amount:x.amount})),totalIn);
 section2("Expenditure",expense.map(x=>({name:x.name,amount:x.amount})),totalOut);
 room(116);
 section2("Closing position",[{name:"Opening balance",amount:opening},{name:"Net movement",amount:totalIn-totalOut}],opening+totalIn-totalOut);
 room(38);label("CLOSING BALANCE / CARRIED FORWARD",70,y-12,10,true,green);right(money(opening+totalIn-totalOut),y-12,12,true,green);y-=30;
 room(55);label("Prepared from recorded bank transactions. Cash, debtors, creditors and",64,y-8,8,false,grey);label("restricted funds should be reviewed separately for the AGM.",64,y-22,8,false,grey);
 footerText();
 const bytes=await pdf.save();
 return new NextResponse(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="the-essex-'+code.toLowerCase()+'-annual-accounts-'+year+'.pdf"',"Cache-Control":"private, no-store"}});
}
