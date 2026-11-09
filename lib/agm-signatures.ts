import { PDFDocument, StandardFonts } from "pdf-lib";

export function validateAgmDate(value: string, year: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter the AGM date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < `${year}-10-31`) throw new Error("The AGM date must be on or after the financial year end.");
  if (value > new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" })) throw new Error("Sign the accounts on or after the AGM date.");
  return value;
}

export async function signAnnualPdf(unsignedPdf: string, signatures: [string, string], agmDate: string, signedAt: Date, accountCode: "MENS" | "CLUB", year: number) {
  const pdf = await PDFDocument.load(Buffer.from(unsignedPdf, "base64"));
  const images = [];
  for (const signature of signatures) {
    if (signature.length > 350000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signature)) throw new Error("Draw both signatures before approving.");
    let image;
    try { image = await pdf.embedPng(Buffer.from(signature.split(",")[1], "base64")); }
    catch { throw new Error("The signature could not be read. Clear it and sign again."); }
    if (image.width > 1200 || image.height > 600 || image.width < 10 || image.height < 10) throw new Error("Invalid signature dimensions.");
    images.push(image);
  }
  const page = pdf.addPage([595.28, 841.89]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (value: string, y: number, size = 11, strong = false) => page.drawText(value, { x: 55, y, size, font: strong ? bold : normal });
  text("AGM approval of annual accounts", 775, 18, true);
  text("The Essex Golf & Country Club", 745, 13);
  text(`${accountCode === "MENS" ? "Men's" : "Club"} accounts: 1 November ${year - 1} to 31 October ${year}`, 725, 11);
  text(`Approved at the AGM on ${agmDate.split("-").reverse().join("/")}`, 700);
  text("We approve the annual accounts on the preceding pages.", 675);
  const names = ["Craig Reid - Treasurer", "Paul Thompson - Captain"];
  for (let i = 0; i < images.length; i++) {
    const top = 620 - i * 220;
    text(names[i], top, 13, true);
    const size = images[i].scaleToFit(460, 140);
    page.drawImage(images[i], { x: 55, y: top - 155, ...size });
  }
  text(`Signatures recorded: ${signedAt.toLocaleString("en-GB", { timeZone: "Europe/London" })} (UK time)`, 145, 10);
  text("This approved document is retained as a fixed version.", 120, 10);
  return Buffer.from(await pdf.save()).toString("base64");
}
