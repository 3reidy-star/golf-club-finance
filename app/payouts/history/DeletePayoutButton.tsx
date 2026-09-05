"use client";

import {
  useState,
  useTransition,
} from "react";

import { deletePayout } from "./actions";

type Props = {
  payoutId: string;
  reference: string;
};

export default function DeletePayoutButton({
  payoutId,
  reference,
}: Props) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete payout ${reference}?\n\nThis permanently removes the payout and its associated top-ups. This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(
      async () => {
        try {
          await deletePayout(
            payoutId,
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to delete payout.",
          );
        }
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Deleting..."
          : "Delete"}
      </button>

      {error && (
        <p className="max-w-48 text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
