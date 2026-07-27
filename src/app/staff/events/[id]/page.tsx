import Link from "next/link";
import { notFound } from "next/navigation";
import { EventAttachmentsForm } from "@/components/event-attachments-form";
import { EventEditorForm } from "@/components/event-editor-form";
import { EventSubtaskForm } from "@/components/event-subtask-form";
import { EventUpdateForm } from "@/components/event-update-form";
import { StaffHeader } from "@/components/staff-header";
import { listStaffMembers } from "@/lib/issues-repository";
import {
  getLiveEventById,
  LIVE_EVENT_SUBTASK_STATUSES,
  listLiveEventAttachments,
  listLiveEventSubtasks,
  listLiveEventUpdates,
  type LiveEvent,
} from "@/lib/live-events-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  addLiveEventAttachmentsAction,
  addLiveEventSubtaskAction,
  addLiveEventUpdateAction,
  updateLiveEventAction,
  updateLiveEventSubtaskAction,
} from "@/server-actions/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const event = getLiveEventById(id);
  if (!event) notFound();

  const query = (await searchParams) ?? {};
  const staffMembers = listStaffMembers().filter(
    (staffMember) => staffMember.isActive,
  );
  const updates = listLiveEventUpdates(id);
  const subtasks = listLiveEventSubtasks(id);
  const attachments = listLiveEventAttachments(id);
  const editAction = updateLiveEventAction.bind(null, id);
  const addUpdateAction = addLiveEventUpdateAction.bind(null, id);
  const addSubtaskAction = addLiveEventSubtaskAction.bind(null, id);
  const addAttachmentsAction = addLiveEventAttachmentsAction.bind(null, id);
  const flashMessage = getFlashMessage(query);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="events"
        title={event.title}
        subtitle="Live event workspace"
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/staff/events"
            className="text-sm font-semibold text-sky-800 hover:underline"
          >
            ← Back to events
          </Link>
          <div className="flex flex-wrap gap-2">
            <span className={statusClass(event.status)}>{event.status}</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {event.priority} priority
            </span>
          </div>
        </div>

        {flashMessage ? (
          <div
            role="status"
            className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {flashMessage}
          </div>
        ) : null}

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {formatDateRange(event.startDate, event.endDate)}
              </p>
              {event.location ? (
                <p className="mt-1 text-sm text-slate-600">{event.location}</p>
              ) : null}
              {event.description ? (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {event.description}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-slate-500">
                  No description has been entered.
                </p>
              )}
            </div>
            <dl className="grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
              <Detail label="Owner" value={event.ownerName} />
              <Detail
                label="Collaborators"
                value={
                  event.collaborators
                    .map((collaborator) => collaborator.name)
                    .join(", ") || "None selected"
                }
              />
              <Detail
                label="District 7 role"
                value={event.districtRole || "Not entered"}
              />
              <Detail
                label="Commissioner attending"
                value={event.commissionerAttending}
              />
            </dl>
          </div>

          <details className="mt-5 border-t border-slate-200 pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-sky-800">
              Edit event details, people, partners, or POC
            </summary>
            <div className="mt-5">
              <EventEditorForm
                action={editAction}
                staffMembers={staffMembers}
                event={event}
              />
            </div>
          </details>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-5">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Tasks</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {event.completedSubtaskCount} of {event.subtaskCount} tasks
                    complete.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {event.subtaskCount} total
                </span>
              </div>

              {subtasks.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {subtasks.map((subtask) => {
                    const updateSubtaskAction =
                      updateLiveEventSubtaskAction.bind(
                        null,
                        event.id,
                        subtask.id,
                      );
                    return (
                      <article
                        key={subtask.id}
                        className="rounded-md border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {subtask.title}
                          </h3>
                          <span className={taskStatusClass(subtask.status)}>
                            {subtask.status}
                          </span>
                        </div>
                        <form
                          action={updateSubtaskAction}
                          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <label className="text-xs font-semibold text-slate-600">
                            Status
                            <select
                              name="status"
                              defaultValue={subtask.status}
                              className={smallInputClass}
                            >
                              {LIVE_EVENT_SUBTASK_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            Assigned to
                            <select
                              name="assignedStaffId"
                              defaultValue={subtask.assignedStaffId ?? ""}
                              className={smallInputClass}
                            >
                              <option value="">Unassigned</option>
                              {staffMembers.map((staffMember) => (
                                <option
                                  key={staffMember.id}
                                  value={staffMember.id}
                                >
                                  {staffMember.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            Due date
                            <input
                              name="dueDate"
                              type="date"
                              defaultValue={subtask.dueDate ?? ""}
                              className={smallInputClass}
                            />
                          </label>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                  No tasks yet. Add the first planning task below.
                </p>
              )}

              <div className="mt-5 border-t border-slate-200 pt-5">
                <h3 className="font-semibold">Add a task</h3>
                <EventSubtaskForm
                  action={addSubtaskAction}
                  staffMembers={staffMembers}
                />
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Event timeline</h2>
              <p className="mt-1 text-sm text-slate-600">
                Add dated progress notes so Carol and collaborators can see
                what changed and what is pending.
              </p>

              <EventUpdateForm
                action={addUpdateAction}
                staffMembers={staffMembers}
                defaultAuthorStaffId={event.ownerStaffId}
              />

              {updates.length > 0 ? (
                <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                  {updates.map((update) => (
                    <article
                      key={update.id}
                      className="rounded-md border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {update.authorName}
                        </span>
                        <time dateTime={update.createdAt}>
                          {formatDateTime(update.createdAt)}
                        </time>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {update.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                  No updates yet.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Point of contact</h2>
              {event.pointOfContactName ||
              event.pointOfContactEmail ||
              event.pointOfContactPhone ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <Detail
                    label="Name"
                    value={event.pointOfContactName || "Not entered"}
                  />
                  <Detail
                    label="Email"
                    value={event.pointOfContactEmail || "Not entered"}
                  />
                  <Detail
                    label="Phone"
                    value={event.pointOfContactPhone || "Not entered"}
                  />
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  No primary contact has been entered.
                </p>
              )}

              <h3 className="mt-5 border-t border-slate-200 pt-4 font-semibold">
                External partners
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {event.partnerNames || "No external partners entered."}
              </p>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Event files</h2>
                <span className="text-sm text-slate-500">
                  {attachments.length} of 20
                </span>
              </div>
              <EventAttachmentsForm action={addAttachmentsAction} />

              {attachments.length > 0 ? (
                <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="rounded-md border border-slate-200 p-3"
                    >
                      <Link
                        href={`/event-attachments/${attachment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-sm font-semibold text-sky-800 hover:underline"
                      >
                        {attachment.fileName}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatFileSize(attachment.sizeBytes)} ·{" "}
                        {formatDateTime(attachment.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  No files have been added.
                </p>
              )}
            </section>

            <section className="rounded-md border border-violet-200 bg-violet-50 p-5">
              <h2 className="font-semibold text-violet-950">
                Historical Monday events
              </h2>
              <p className="mt-2 text-sm leading-6 text-violet-900">
                Imported event history remains read-only and separate from this
                live planning record.
              </p>
              <Link
                href="/staff/history#historical-events"
                className="mt-3 inline-block text-sm font-semibold text-violet-900 underline"
              >
                Open historical events
              </Link>
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
      <dd className="mt-1 whitespace-pre-wrap text-slate-700">{value}</dd>
    </div>
  );
}

function getFlashMessage(
  params: Record<string, string | string[] | undefined>,
) {
  if (params.created) return "Event created. Add tasks, updates, and files below.";
  if (params.saved) return "Event details saved.";
  if (params.updateAdded) return "Event update added.";
  if (params.subtaskAdded) return "Task added.";
  if (params.subtaskSaved) return "Task saved.";
  if (params.filesAdded) {
    const count = Number(Array.isArray(params.filesAdded) ? params.filesAdded[0] : params.filesAdded);
    return `${Number.isFinite(count) ? count : ""} event file${count === 1 ? "" : "s"} added.`.trim();
  }
  return "";
}

function statusClass(status: LiveEvent["status"]) {
  const colors =
    status === "Done"
      ? "bg-emerald-100 text-emerald-800"
      : status === "In progress"
        ? "bg-sky-100 text-sky-800"
        : status === "Cancelled"
          ? "bg-slate-200 text-slate-700"
          : "bg-amber-100 text-amber-800";
  return `rounded-full px-3 py-1 text-xs font-semibold ${colors}`;
}

function taskStatusClass(status: string) {
  const colors =
    status === "Done"
      ? "bg-emerald-100 text-emerald-800"
      : status === "In progress"
        ? "bg-sky-100 text-sky-800"
        : "bg-amber-100 text-amber-800";
  return `rounded-full px-2 py-1 text-xs font-semibold ${colors}`;
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "Date not set";
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(value: number | null) {
  if (!value) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const smallInputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-normal text-slate-900";
