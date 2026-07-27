"use client";

import { useActionState } from "react";
import type { StaffMember } from "@/lib/issues-repository";
import { LIVE_EVENT_SUBTASK_STATUSES } from "@/lib/live-event-types";
import type { EventActionState } from "@/server-actions/events";

const initialState: EventActionState = {
  status: "idle",
  message: "",
};

export function EventSubtaskForm({
  action,
  staffMembers,
}: {
  action: (
    state: EventActionState,
    formData: FormData,
  ) => Promise<EventActionState>;
  staffMembers: StaffMember[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="md:col-span-2 text-sm font-semibold text-slate-700">
        Task *
        <input
          name="title"
          required
          maxLength={240}
          placeholder="Example: Confirm room setup with the venue"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Assigned to
        <select name="assignedStaffId" className={inputClass} defaultValue="">
          <option value="">Unassigned</option>
          {staffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Due date
        <input name="dueDate" type="date" className={inputClass} />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Status
        <select
          name="status"
          defaultValue="Not started"
          className={inputClass}
        >
          {LIVE_EVENT_SUBTASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className={primaryButtonClass}
        >
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`md:col-span-2 text-sm ${
            state.status === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const primaryButtonClass =
  "rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60";
