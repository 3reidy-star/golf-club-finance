"use client";

import { useRef, useState } from "react";

type PlayerTopUp = { name: string; amountPence: number };
const money = (pence: number) => new Intl.NumberFormat("en-GB", {
  style: "currency", currency: "GBP",
}).format(pence / 100);

export default function MensTopUpShare({ players, competitionName, competitionDate }: { players: PlayerTopUp[]; competitionName: string; competitionDate: string }) {
  const [feedback, setFeedback] = useState("");
  const preview = useRef<HTMLTextAreaElement>(null);
  const message = [
    "Men’s player top-ups",
    competitionDate ? `${competitionName} — ${competitionDate}` : competitionName,
    "",
    ...players.map(player => `${player.name} — ${money(player.amountPence)}`),
    "",
    `Total: ${money(players.reduce((sum, player) => sum + player.amountPence, 0))}`,
  ].join("\n");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("Message copied. Paste it into your WhatsApp group.");
    } catch {
      preview.current?.focus();
      preview.current?.select();
      setFeedback("Select and copy the message below, then paste it into WhatsApp.");
    }
  }

  if (!players.length) return null;
  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Men’s player top-ups for WhatsApp</h2>
      <p className="mt-2 text-sm text-slate-600">Player top-ups for this competition. Choose your group in WhatsApp, then send.</p>
      <textarea
        ref={preview}
        aria-label="Men’s player top-ups message"
        readOnly
        value={message}
        rows={Math.min(players.length + 6, 14)}
        className="mt-4 block w-full rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">Share to WhatsApp</a>
        <button type="button" onClick={copyMessage} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-50">Copy message</button>
      </div>
      <p role="status" className="mt-3 text-sm text-slate-600">{feedback}</p>
    </section>
  );
}
