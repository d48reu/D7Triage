import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffHeader } from "@/components/staff-header";
import {
  getHistoricalEventById,
  listHistoricalEventAttachments,
  listHistoricalEventUpdates,
} from "@/lib/historical-archive-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HistoricalEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const event = getHistoricalEventById(id);
  if (!event) notFound();

  const updates = listHistoricalEventUpdates(event.id);
  const attachments = listHistoricalEventAttachments(event.id);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="history"
        title={event.title}
        subtitle={
          event.externalItemId
            ? `Read-only Monday.com event ${event.externalItemId}`
            : "Read-only historical event"
        }
      />

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/staff/history"
            className="text-sm font-semibold text-sky-800 hover:underline"
          >
            ← Back to historical archive
          </Link>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
            Historical event · read only
          </span>
        </div>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                {event.sourceGroup || "D7 Events"}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{event.title}</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">
              {event.rawStatus || "No Monday status"}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Timeline" value={formatEventTimeline(event)} />
            <Detail label="Owner" value={event.owners || "Not entered"} />
            <Detail
              label="Collaborators"
              value={event.collaborators || "Not entered"}
            />
            <Detail label="Priority" value={event.priority || "Not entered"} />
            <Detail label="D7 role" value={event.role || "Not entered"} />
            <Detail label="Partners" value={event.partners || "Not entered"} />
            <Detail
              label="Commissioner attending"
              value={event.commissionerAttending || "Not entered"}
            />
            <Detail
              label="Monday item ID"
              value={event.externalItemId || "Not available"}
            />
          </dl>

          {event.relevantInfo ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Relevant information
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {event.relevantInfo}
              </p>
            </div>
          ) : null}

          {event.subitems.length > 0 ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Monday subtasks</h3>
                <span className="text-sm text-slate-500">
                  {event.subitems.length.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {event.subitems.map((subitem) => (
                  <div
                    key={subitem.externalItemId}
                    className="rounded-md bg-slate-50 p-3 text-sm"
                  >
                    <div className="font-semibold">
                      {subitem.name || "Unnamed subtask"}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {subitem.owner || "No owner"} ·{" "}
                      {subitem.rawStatus || "No status"}
                      {subitem.dueOn ? ` · ${formatDate(subitem.dueOn)}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Monday event timeline</h2>
              <span className="text-sm text-slate-500">
                {updates.length.toLocaleString()} updates and replies
              </span>
            </div>

            {updates.length > 0 ? (
              <div className="mt-4 space-y-3">
                {updates.map((update) => (
                  <article
                    key={update.id}
                    className={`rounded-md border p-4 ${
                      update.contentType === "Reply"
                        ? "ml-5 border-slate-200 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {update.authorName || "Unknown historical user"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {update.contentType}
                        </span>
                        {update.itemName && update.itemName !== event.title ? (
                          <span className="text-xs text-slate-500">
                            {update.itemName}
                          </span>
                        ) : null}
                      </div>
                      <time className="text-xs text-slate-500">
                        {update.createdAt
                          ? formatDateTime(update.createdAt)
                          : update.createdAtRaw || "Date unknown"}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {update.body || "No update text."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                No Monday updates were recorded for this event.
              </p>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Archived event files</h2>
              <p className="mt-1 text-sm text-slate-600">
                {attachments.length.toLocaleString()} file references
              </p>
              {attachments.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {attachments.map((attachment) =>
                    attachment.storagePath ? (
                      <Link
                        key={attachment.id}
                        href={`/historical-attachments/${attachment.id}`}
                        target="_blank"
                        className="block rounded-md border border-slate-200 p-3 text-sm font-semibold text-sky-800 hover:bg-slate-50"
                      >
                        {attachment.fileName ||
                          `Monday file ${attachment.externalAssetId}`}
                      </Link>
                    ) : (
                      <div
                        key={attachment.id}
                        className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600"
                      >
                        Monday file {attachment.externalAssetId}
                        <div className="mt-1 text-xs text-slate-500">
                          Reference preserved; file bytes not uploaded.
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  No files were attached to this event.
                </p>
              )}
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 text-sm shadow-sm">
              <h2 className="font-semibold">Archive handling</h2>
              <p className="mt-2 leading-6 text-slate-600">
                Owners, collaborators, subtasks, files, and Carol&apos;s original
                Monday updates are preserved here. Active planning remains
                separate from the constituent case queue.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function formatEventTimeline(event: {
  timelineStart: string | null;
  timelineEnd: string | null;
  occurredOn: string | null;
  dateText: string;
}) {
  if (event.timelineStart && event.timelineEnd) {
    if (event.timelineStart === event.timelineEnd) {
      return formatDate(event.timelineStart);
    }
    return `${formatDate(event.timelineStart)} – ${formatDate(event.timelineEnd)}`;
  }
  if (event.timelineStart) return formatDate(event.timelineStart);
  if (event.occurredOn) return formatDate(event.occurredOn);
  return event.dateText || "Date not entered";
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "long",
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
