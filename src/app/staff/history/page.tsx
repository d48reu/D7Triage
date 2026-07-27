import Link from "next/link";
import { StaffHeader } from "@/components/staff-header";
import {
  getHistoricalArchiveFilterOptions,
  getHistoricalArchiveSummary,
  listHistoricalCases,
  listHistoricalEvents,
} from "@/lib/historical-archive-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function HistoricalArchivePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const query = readSearchParam(params, "q").trim();
  const status = readSearchParam(params, "status").trim();
  const year = readSearchParam(params, "year").trim();
  const page = Math.max(1, Number(readSearchParam(params, "page")) || 1);
  const summary = getHistoricalArchiveSummary();
  const filters = getHistoricalArchiveFilterOptions();
  const result = listHistoricalCases({
    query,
    status,
    year,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const events = listHistoricalEvents();
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="history"
        title="Historical Archive"
        subtitle="Searchable Monday.com case history, preserved separately from active work."
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-3xl text-sm text-slate-600">
            Imported records are read-only history. They do not affect active
            dashboard counts, assignments, acknowledgments, or notifications.
          </p>
          <Link
            href="/staff/history/import"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Import or refresh
          </Link>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Historical cases" value={summary.caseCount} />
          <Metric label="Timeline updates" value={summary.updateCount} />
          <Metric
            label="Cases with updates"
            value={summary.casesWithUpdates}
          />
          <Metric
            label="Archived files"
            value={summary.storedAttachmentCount}
            detail={
              summary.attachmentCount
                ? `of ${summary.attachmentCount.toLocaleString()} referenced`
                : undefined
            }
          />
          <Metric
            label="Historical events"
            value={summary.eventCount}
            detail={
              summary.eventUpdateCount || summary.eventAttachmentCount
                ? `${summary.eventUpdateCount.toLocaleString()} updates · ${summary.eventAttachmentCount.toLocaleString()} files`
                : undefined
            }
          />
        </section>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_150px_auto]">
            <label className="text-sm font-semibold text-slate-700">
              Search
              <input
                name="q"
                defaultValue={query}
                placeholder="Name, address, summary, phone, email, service number"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Monday status
              <select
                name="status"
                defaultValue={status}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">All statuses</option>
                {filters.statuses
                  .filter((option) => option.value)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Year
              <select
                name="year"
                defaultValue={year}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                <option value="">All years</option>
                {filters.years.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} ({option.count})
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
                href="/staff/history"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </Link>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
            <span>
              Showing {result.cases.length.toLocaleString()} of{" "}
              {result.total.toLocaleString()} matching cases.
            </span>
            {summary.earliestCaseDate && summary.latestCaseDate ? (
              <span>
                Archive range {formatDate(summary.earliestCaseDate)} –{" "}
                {formatDate(summary.latestCaseDate)}
              </span>
            ) : null}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {result.cases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Constituent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="min-w-80 px-4 py-3">Call summary</th>
                    <th className="px-4 py-3 text-right">Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.cases.map((historicalCase) => (
                    <tr key={historicalCase.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {historicalCase.occurredOn
                          ? formatDate(historicalCase.occurredOn)
                          : "Date unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {historicalCase.residentName || "Name not entered"}
                        </div>
                        {historicalCase.phone ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {historicalCase.phone}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {historicalCase.rawStatus || "No status"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {historicalCase.assignedPeople || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 leading-5 text-slate-700">
                        {truncate(historicalCase.summary, 220) ||
                          "No summary entered."}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          href={`/staff/history/${historicalCase.id}`}
                          className="font-semibold text-sky-800 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-600">
              {summary.caseCount === 0 ? (
                <>
                  No history has been imported yet.{" "}
                  <Link
                    href="/staff/history/import"
                    className="font-semibold text-sky-800 underline"
                  >
                    Import the verified archive.
                  </Link>
                </>
              ) : (
                "No historical cases match these filters."
              )}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <Link
                href={pageHref({
                  page: Math.max(1, page - 1),
                  query,
                  status,
                  year,
                })}
                aria-disabled={page <= 1}
                className={`font-semibold ${
                  page <= 1
                    ? "pointer-events-none text-slate-300"
                    : "text-sky-800 hover:underline"
                }`}
              >
                Previous
              </Link>
              <span className="text-slate-600">
                Page {Math.min(page, totalPages)} of {totalPages}
              </span>
              <Link
                href={pageHref({
                  page: Math.min(totalPages, page + 1),
                  query,
                  status,
                  year,
                })}
                aria-disabled={page >= totalPages}
                className={`font-semibold ${
                  page >= totalPages
                    ? "pointer-events-none text-slate-300"
                    : "text-sky-800 hover:underline"
                }`}
              >
                Next
              </Link>
            </div>
          ) : null}
        </section>

        {events.length > 0 ? (
          <section
            id="historical-events"
            className="mt-6 scroll-mt-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Historical events</h2>
            <p className="mt-1 text-sm text-slate-600">
              Event planning data is stored separately from constituent cases.
            </p>
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        <Link
                          href={`/staff/history/events/${event.id}`}
                          className="text-sky-900 hover:underline"
                        >
                          {event.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {event.timelineStart || event.occurredOn
                          ? formatDate(event.timelineStart || event.occurredOn || "")
                          : event.dateText || "Date not entered"}
                      </p>
                    </div>
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">
                      Event history
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                    <Detail
                      label="Owner"
                      value={event.owners || "Not entered"}
                    />
                    <Detail
                      label="Collaborators / partners"
                      value={
                        event.collaborators ||
                        event.partners ||
                        "Not entered"
                      }
                    />
                    <Detail
                      label="Status"
                      value={event.rawStatus || "Not entered"}
                    />
                  </dl>
                  {event.relevantInfo ? (
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {truncate(event.relevantInfo, 320)}
                    </p>
                  ) : null}
                  <Link
                    href={`/staff/history/events/${event.id}`}
                    className="mt-3 inline-block text-sm font-semibold text-sky-800 hover:underline"
                  >
                    Open event record
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {summary.lastImportedAt ? (
          <p className="mt-4 text-xs text-slate-500">
            Last archive refresh {formatDateTime(summary.lastImportedAt)}.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  name: string,
) {
  const value = params[name];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageHref(input: {
  page: number;
  query: string;
  status: string;
  year: string;
}) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.status) params.set("status", input.status);
  if (input.year) params.set("year", input.year);
  if (input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/staff/history?${query}` : "/staff/history";
}

function truncate(value: string, maximum: number) {
  if (value.length <= maximum) return value;
  return `${value.slice(0, maximum - 1).trimEnd()}…`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      })
    : value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : value;
}
