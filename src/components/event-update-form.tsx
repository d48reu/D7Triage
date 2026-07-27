"use client";

import { useActionState } from "react";
import type { StaffMember } from "@/lib/issues-repository";
import type { EventActionState } from "@/server-actions/events";

const initialState: EventActionState = {
  status: "idle",
  message: "",
};

export function EventUpdateForm({
  action,
  staffMembers,
  defaultAuthorStaffId,
}: {
  action: (
    state: EventActionState,
    formData: FormData,
  ) => Promise<EventActionState>;
  staffMembers: StaffMember[];
  defaultAuthorStaffId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Update by
        <select
          name="authorStaffId"
          required
          defaultValue={defaultAuthorStaffId}
          className={inputClass}
        >
          {staffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        New update
        <textarea
          name="body"
          required
          maxLength={4000}
          rows={4}
          placeholder="What changed, what is pending, and what should happen next?"
          className={inputClass}
        />
      </label>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${
            state.status === "error" ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={primaryButtonClass}
      >
        {pending ? "Adding…" : "Add update"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const primaryButtonClass =
  "rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60";
