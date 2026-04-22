import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStatus } from "@/lib/issue-types";
import {
  getIssueReportByToken,
  listStatusEvents,
} from "@/lib/issues-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const report = getIssueReportByToken(trackingToken);

  if (!report) {
    notFound();
  }

  const events = listStatusEvents(report.id);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Report status</h1>
          </div>
          <Link
            href="/report"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            New Report
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Current status
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {formatStatus(report.status)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tracking token: {report.publicTrackingToken}
          </p>

          <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
            <Detail label="Category" value={report.category} />
            <Detail label="Location" value={report.addressText} />
            <Detail
              label="Submitted"
              value={new Date(report.createdAt).toLocaleString()}
            />
            <Detail
              label="Last updated"
              value={new Date(report.updatedAt).toLocaleString()}
            />
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-700">
              Your description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.description}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Status timeline</h2>
          <div className="mt-4 space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-l-2 border-sky-700 pl-4">
                <div className="text-sm font-semibold">
                  {formatStatus(event.status)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
                {event.publicNote ? (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {event.publicNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}
