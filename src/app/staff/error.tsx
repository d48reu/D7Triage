"use client";

import { useEffect } from "react";
import { reportStaffClientEvent } from "@/components/staff-client-monitor";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportStaffClientEvent({
      eventType: "staff_error_boundary",
      severity: "error",
      action: "render_staff_page",
      outcome: "failed",
      errorCode: error.digest ? "next_render_error" : error.name || "Error",
    });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">This staff page hit a problem</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your case data was not cleared. Try loading the page again. A private
          diagnostic code was recorded for follow-up.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
