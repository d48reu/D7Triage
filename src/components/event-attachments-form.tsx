"use client";

import { useActionState } from "react";
import type { EventActionState } from "@/server-actions/events";

const initialState: EventActionState = {
  status: "idle",
  message: "",
};

export function EventAttachmentsForm({
  action,
}: {
  action: (
    state: EventActionState,
    formData: FormData,
  ) => Promise<EventActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        Add event files
        <input
          name="files"
          type="file"
          multiple
          accept=".csv,.doc,.docx,.gif,.jpeg,.jpg,.pdf,.png,.webp,.xls,.xlsx"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-semibold file:text-slate-700"
        />
      </label>
      <p className="text-xs text-slate-500">
        Images, PDF, Word, Excel, or CSV. Up to 15 MB each and 20 files per
        event.
      </p>
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
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Add files"}
      </button>
    </form>
  );
}
