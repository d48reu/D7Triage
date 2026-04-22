import Link from "next/link";
import { notFound } from "next/navigation";
import { formatStatus, ISSUE_STATUSES } from "@/lib/issue-types";
import {
  getIssueReportById,
  listStaffNotes,
  listStatusEvents,
} from "@/lib/issues-repository";
import {
  addStaffNoteAction,
  updateIssueStatusAction,
} from "@/server-actions/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = getIssueReportById(id);

  if (!report) {
    notFound();
  }

  const events = listStatusEvents(report.id);
  const notes = listStaffNotes(report.id);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/staff" className="text-sm font-medium text-sky-700">
              Staff inbox
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Case detail</h1>
          </div>
          <Link
            href={`/report/${report.publicTrackingToken}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tracking Page
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {report.category}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {formatStatus(report.status)}
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
            <Detail label="Location" value={report.addressText} />
            <Detail label="Email" value={report.residentEmail} />
            <Detail label="Name" value={report.residentName || "Not provided"} />
            <Detail label="Phone" value={report.residentPhone || "Not provided"} />
            <Detail label="Language" value={report.preferredLanguage} />
            <Detail
              label="Submitted"
              value={new Date(report.createdAt).toLocaleString()}
            />
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-700">
              Resident description
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.description}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Update status</h2>
            <form action={updateIssueStatusAction} className="mt-4 space-y-4">
              <input type="hidden" name="reportId" value={report.id} />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={report.status}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                >
                  {ISSUE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Public note
                </span>
                <textarea
                  name="publicNote"
                  className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  placeholder="Optional note shown on the tracking page"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Save Status
              </button>
            </form>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Internal note</h2>
            <form action={addStaffNoteAction} className="mt-4 space-y-4">
              <input type="hidden" name="reportId" value={report.id} />
              <textarea
                name="body"
                required
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                placeholder="Add staff-only context, referral attempts, or next steps."
              />
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Add Note
              </button>
            </form>
          </section>
        </aside>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Status events
              </h3>
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

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Staff notes
              </h3>
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-xs text-slate-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {note.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  No internal notes have been added yet.
                </p>
              )}
            </div>
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
