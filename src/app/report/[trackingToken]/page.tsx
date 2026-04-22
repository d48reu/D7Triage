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
    <main className="min-h-screen bg-[#f7f4ee] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-600 underline">
          Home
        </Link>

        <section className="mt-8 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Tracking link
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {formatStatus(report.status)}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
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
              <div key={event.id} className="border-l-2 border-teal-600 pl-4">
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
