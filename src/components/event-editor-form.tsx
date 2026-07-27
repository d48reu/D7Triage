"use client";

import { useActionState } from "react";
import type { StaffMember } from "@/lib/issues-repository";
import {
  COMMISSIONER_ATTENDANCE_OPTIONS,
  LIVE_EVENT_PRIORITIES,
  LIVE_EVENT_STATUSES,
  type LiveEvent,
} from "@/lib/live-event-types";
import type { EventActionState } from "@/server-actions/events";

const initialState: EventActionState = {
  status: "idle",
  message: "",
};

export function EventEditorForm({
  action,
  staffMembers,
  event,
  defaultOwnerStaffId,
}: {
  action: (
    state: EventActionState,
    formData: FormData,
  ) => Promise<EventActionState>;
  staffMembers: StaffMember[];
  event?: LiveEvent;
  defaultOwnerStaffId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const selectedCollaborators = new Set(
    event?.collaborators.map((collaborator) => collaborator.id) ?? [],
  );
  const ownerStaffId = event?.ownerStaffId ?? defaultOwnerStaffId ?? "";

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-md border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Event details</h2>
        <p className="mt-1 text-sm text-slate-600">
          Keep the dates, purpose, location, and current planning status in one
          place.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            Event name *
            <input
              name="title"
              required
              maxLength={240}
              defaultValue={event?.title ?? ""}
              placeholder="Example: District 7 Hurricane Readiness Workshop"
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={event?.startDate ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            End date
            <input
              name="endDate"
              type="date"
              defaultValue={event?.endDate ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Status *
            <select
              name="status"
              required
              defaultValue={event?.status ?? "Not started"}
              className={inputClass}
            >
              {LIVE_EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Priority *
            <select
              name="priority"
              required
              defaultValue={event?.priority ?? "Medium"}
              className={inputClass}
            >
              {LIVE_EVENT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            Location
            <input
              name="location"
              maxLength={300}
              defaultValue={event?.location ?? ""}
              placeholder="Venue name and address"
              className={inputClass}
            />
          </label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            Description and planning notes
            <textarea
              name="description"
              maxLength={5000}
              rows={5}
              defaultValue={event?.description ?? ""}
              placeholder="Purpose, audience, pending decisions, and any background Carol needs to retain."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold">People and partners</h2>
        <p className="mt-1 text-sm text-slate-600">
          The owner is accountable for the event. Collaborators can be any
          additional staff helping with it.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Owner *
            <select
              name="ownerStaffId"
              required
              defaultValue={ownerStaffId}
              className={inputClass}
            >
              <option value="">Choose an owner</option>
              {staffMembers.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Commissioner attending?
            <select
              name="commissionerAttending"
              defaultValue={event?.commissionerAttending ?? "Not decided"}
              className={inputClass}
            >
              {COMMISSIONER_ATTENDANCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-slate-700">
              Collaborators
            </legend>
            <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto rounded-md border border-slate-300 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {staffMembers.map((staffMember) => (
                <label
                  key={staffMember.id}
                  className="flex items-center gap-2 rounded bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="collaboratorStaffIds"
                    value={staffMember.id}
                    defaultChecked={selectedCollaborators.has(staffMember.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>{staffMember.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              If the owner is also checked, the owner will only be listed once.
            </p>
          </fieldset>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            External partners
            <textarea
              name="partnerNames"
              maxLength={1000}
              rows={3}
              defaultValue={event?.partnerNames ?? ""}
              placeholder="Organizations, agencies, vendors, or community partners"
              className={inputClass}
            />
          </label>
          <label className="md:col-span-2 text-sm font-semibold text-slate-700">
            District 7 role
            <textarea
              name="districtRole"
              maxLength={1000}
              rows={3}
              defaultValue={event?.districtRole ?? ""}
              placeholder="Hosted by District 7, participating, sponsoring, providing outreach, etc."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold">Primary point of contact</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            POC name
            <input
              name="pointOfContactName"
              maxLength={200}
              defaultValue={event?.pointOfContactName ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            POC email
            <input
              name="pointOfContactEmail"
              type="email"
              maxLength={200}
              defaultValue={event?.pointOfContactEmail ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            POC phone
            <input
              name="pointOfContactPhone"
              type="tel"
              maxLength={80}
              defaultValue={event?.pointOfContactPhone ?? ""}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-500">
          Updates, tasks, and files are added from the event record after the
          event is created.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : event
              ? "Save event details"
              : "Create event"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
