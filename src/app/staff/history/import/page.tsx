import Link from "next/link";
import { HistoryImportForm } from "@/components/history-import-form";
import { StaffHeader } from "@/components/staff-header";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HistoricalImportPage() {
  await requireStaffSession();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="history"
        title="Import Historical Archive"
        subtitle="Load the verified Monday.com history without changing the active case queue."
      />

      <div className="mx-auto max-w-3xl px-5 py-6">
        <Link
          href="/staff/history"
          className="text-sm font-semibold text-sky-800 hover:underline"
        >
          ← Back to historical archive
        </Link>

        <div className="my-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          This import is isolated from live cases. It does not send
          notifications, mark assignments as seen, or reopen old
          work.
        </div>

        <HistoryImportForm />
      </div>
    </main>
  );
}
