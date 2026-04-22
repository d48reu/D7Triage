import Link from "next/link";
import { formatStatus } from "@/lib/issue-types";
import { listIssueReports } from "@/lib/issues-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function StaffPage() {
  const reports = listIssueReports();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-slate-600 underline">
              Back
            </Link>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight">
              Staff inbox
            </h1>
            <p className="mt-3 text-slate-700">
              Local-first triage queue for submitted constituent reports.
            </p>
          </div>
          <Link
            href="/report"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            New Report
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="All reports" value={reports.length} />
          <Metric
            label="Needs review"
            value={reports.filter((report) => report.status === "received").length}
          />
          <Metric
            label="In progress"
            value={
              reports.filter((report) =>
                ["needs_review", "routed", "awaiting_agency"].includes(
                  report.status,
                ),
              ).length
            }
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {reports.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/staff/reports/${report.id}`}
                  className="grid gap-3 p-5 transition hover:bg-slate-50 md:grid-cols-[1fr_180px_160px]"
                >
                  <div>
                    <div className="font-semibold">{report.category}</div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {report.description}
                    </p>
                    <div className="mt-2 text-xs text-slate-500">
                      {report.addressText}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">
                    {formatStatus(report.status)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-slate-600">
              No reports yet. Submit one through the public report form to test
              the local flow.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
}
