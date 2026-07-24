"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type ImportResult = {
  ok: true;
  cases: number;
  newCases: number;
  updates: number;
  newUpdates: number;
  attachmentReferences: number;
  events: number;
  uploadedAssets: number;
  storedAssets: number;
};

export function HistoryImportForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/history/import", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json()) as
        | ImportResult
        | { error?: string };

      if (!response.ok || !("ok" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Historical import failed.",
        );
      }

      setResult(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Historical import failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submitImport}
      className="space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="history-manifest"
          className="block text-sm font-semibold text-slate-900"
        >
          Verified history manifest
        </label>
        <input
          id="history-manifest"
          name="manifest"
          type="file"
          accept="application/json,.json"
          required
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Re-importing the same manifest refreshes existing Monday records by
          item ID; it does not create duplicates.
        </p>
      </div>

      <div>
        <label
          htmlFor="history-assets"
          className="block text-sm font-semibold text-slate-900"
        >
          Archived case files
        </label>
        <input
          id="history-assets"
          name="assets"
          type="file"
          multiple
          className="mt-2 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Optional. Files must retain the Monday asset ID at the beginning of
          the filename.
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Importing archive…" : "Import or refresh archive"}
      </button>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          <p className="font-semibold">Historical archive imported.</p>
          <p className="mt-1">
            {result.cases.toLocaleString()} cases ({result.newCases.toLocaleString()} new),{" "}
            {result.updates.toLocaleString()} updates ({result.newUpdates.toLocaleString()} new),{" "}
            {result.events.toLocaleString()} event, and{" "}
            {result.storedAssets.toLocaleString()} archived files stored.
          </p>
          <Link
            href="/staff/history"
            className="mt-3 inline-block font-semibold text-sky-800 underline"
          >
            Open historical archive
          </Link>
        </div>
      ) : null}
    </form>
  );
}
