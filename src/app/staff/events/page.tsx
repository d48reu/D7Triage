import Link from "next/link";
import { StaffHeader } from "@/components/staff-header";
import {
  getLiveEventSummary,
  LIVE_EVENT_STATUSES,
  listLiveEvents,
  type LiveEvent,
} from "@/lib/live-events-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const query = readSearchParam(params, "q").trim();
  const status = readSearchParam(params, "status").trim();
  const events = listLiveEvents({ query, status });
  const summary = getLiveEventSummary();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="events"
        title="Events"
        subtitle="Plan new District 7 events and keep every update, task, contact, and file together."
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Live event planning is separate from constituent cases. Carol and
            other staff can create and maintain events here; imported Monday
            records remain available in the historical archive.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/staff/history#historical-events"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Historical events
            </Link>
            <Link
              href="/staff/events/new"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              New Event
            </Link>
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="All events" value={summary.eventCount} />
          <Metric label="Upcoming" value={summary.upcomingCount} />
          <Metric label="In progress" value={summary.inProgressCount} />
          <Metric label="Completed" value={summary.completedCount} />
        </section>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px_auto]">
            <label className="text-sm font-semibold text-slate-700">
              Search events
              <input
                name="q"
                defaultValue={query}
                placeholder="Event, location, owner, partner, or POC"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Status
              <select
                name="status"
                defaultValue={status}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">All statuses</option>
                {LIVE_EVENT_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Search
              </button>
              <Link
                href="/staff/events"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </Link>
            </div>
          </form>
          <p className="mt-3 text-sm text-slate-600">
            Showing {events.length.toLocaleString()} event
            {events.length === 1 ? "" : "s"}.
          </p>
        </section>

        <section className="mt-5 space-y-3">
          {events.length > 0 ? (
            events.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold">
                {summary.eventCount === 0
                  ? "No live events have been created yet"
                  : "No events match these filters"}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {summary.eventCount === 0
                  ? "Create Carol’s first event here and use the record for dates, contacts, updates, tasks, and files."
                  : "Clear the search or choose another status to see more events."}
              </p>
              {summary.eventCount === 0 ? (
                <Link
                  href="/staff/events/new"
                  className="mt-4 inline-block rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Create the first event
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EventCard({ event }: { event: LiveEvent }) {
  const collaboratorNames = event.collaborators
    .map((collaborator) => collaborator.name)
    .join(", ");

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {event.priority} priority
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">
            <Link
              href={`/staff/events/${event.id}`}
              className="text-sky-950 hover:underline"
            >
              {event.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {formatDateRange(event.startDate, event.endDate)}
          </p>
          {event.location ? (
            <p className="mt-1 text-sm text-slate-600">{event.location}</p>
          ) : null}
        </div>
        <Link
          href={`/staff/events/${event.id}`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open event
        </Link>
      </div>

      {event.description ? (
        <p className="mt-4 text-sm leading-6 text-slate-700">
          {truncate(event.description, 260)}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Owner" value={event.ownerName} />
        <Detail
          label="Collaborators"
          value={collaboratorNames || "None selected"}
        />
        <Detail
          label="Tasks"
          value={
            event.subtaskCount
              ? `${event.completedSubtaskCount} of ${event.subtaskCount} done`
              : "No tasks"
          }
        />
        <Detail
          label="Activity"
          value={`${event.updateCount} update${event.updateCount === 1 ? "" : "s"} · ${event.attachmentCount} file${event.attachmentCount === 1 ? "" : "s"}`}
        />
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-700">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: LiveEvent["status"] }) {
  const colors =
    status === "Done"
      ? "bg-emerald-100 text-emerald-800"
      : status === "In progress"
        ? "bg-sky-100 text-sky-800"
        : status === "Cancelled"
          ? "bg-slate-200 text-slate-700"
          : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors}`}>
      {status}
    </span>
  );
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "Date not set";
  if (!endDate || endDate === startDate) return formatDate(startDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1).trim()}…` : value;
}

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
