"use client";
import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { approveAccounts, prepareAccounts } from "./actions";

function SignaturePad({ name, onChange, disabled }: { name: string; onChange: (value: string) => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false), moved = useRef(false);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 800 / bounds.width, y: (event.clientY - bounds.top) * 240 / bounds.height };
  };
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const p = point(event);
    context.beginPath(); context.moveTo(p.x, p.y); context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#14243a";
    drawing.current = true; moved.current = false;
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const p = point(event), context = event.currentTarget.getContext("2d");
    context?.lineTo(p.x, p.y); context?.stroke(); moved.current = true;
  }
  function finish() {
    if (drawing.current && moved.current && canvas.current) onChange(canvas.current.toDataURL("image/png"));
    drawing.current = false;
  }
  return <fieldset disabled={disabled} className="space-y-2"><legend className="font-semibold">{name}</legend><p className="text-sm text-slate-600">Draw your signature using your finger, pen or mouse.</p><canvas ref={canvas} width={800} height={240} aria-label={`${name} signature drawing area`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} className="block w-full touch-none rounded-lg border-2 border-slate-400 bg-white" /><button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50" onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 240); onChange(""); }}>Clear signature</button></fieldset>;
}

export default function AgmForm({ accountCode, year, revised }: { accountCode: string; year: number; revised: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [treasurer, setTreasurer] = useState(""), [captain, setCaptain] = useState("");
  const [date, setDate] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  function prepare() {
    setError("");
    startTransition(async () => {
      try {
        const result = await prepareAccounts(accountCode, year);
        if (result.error) setError(result.error);
        else if (result.id) { setId(result.id); setTreasurer(""); setCaptain(""); setConfirmed(false); }
      } catch { setError("Unable to prepare the accounts. Please try again."); }
    });
  }
  if (done) return <section className="rounded-xl bg-emerald-50 p-5" role="status"><h2 className="text-xl font-bold">Accounts approved and saved</h2><a className="mt-3 inline-block font-semibold underline" href={`/accounts/agm/${id}/pdf`} target="_blank" rel="noreferrer">Open signed accounts PDF</a></section>;
  return <section className="space-y-5 rounded-xl border bg-white p-5">
    <h2 className="text-xl font-semibold">{revised ? "Prepare revised accounts for fresh sign-off" : "Prepare accounts for sign-off"}</h2>
    <p className="text-sm text-slate-600">Prepare a fixed copy, review it, then sign below. Later ledger changes cannot alter an approved copy. Each account is approved separately.</p>
    <button type="button" onClick={prepare} disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending && !id ? "Preparing…" : id ? "Prepare a fresh copy" : "Prepare accounts"}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {id && <form className="space-y-6" onSubmit={event => {
      event.preventDefault(); setError("");
      startTransition(async () => {
        try {
          const result = await approveAccounts(id, date, treasurer, captain, confirmed);
          if (result.error) setError(result.error);
          else if (result.success) { setDone(true); router.refresh(); }
        } catch { setError("Unable to save. Please try again; your signatures are still here."); }
      });
    }}>
      <a className="block font-semibold text-emerald-900 underline" href={`/accounts/agm/${id}/pdf`} target="_blank" rel="noreferrer">Open the exact prepared accounts PDF for review</a>
      <label className="block font-semibold">AGM date<input type="date" value={date} onChange={event => setDate(event.target.value)} min={`${year}-10-31`} required disabled={pending} className="mt-2 block rounded border p-2" /></label>
      <SignaturePad key={`${id}-treasurer`} name="Craig Reid — Treasurer" onChange={setTreasurer} disabled={pending} />
      <SignaturePad key={`${id}-captain`} name="Paul Thompson — Captain" onChange={setCaptain} disabled={pending} />
      <label className="flex items-start gap-3"><input type="checkbox" required checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} className="mt-1" /><span>We have both reviewed this prepared copy and approve these annual accounts at the AGM. Each signature was drawn by the person named.</span></label>
      <button type="submit" disabled={pending || !treasurer || !captain || !confirmed} className="rounded-lg bg-emerald-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving approval…" : "Approve and save signed accounts"}</button>
    </form>}
  </section>;
}
