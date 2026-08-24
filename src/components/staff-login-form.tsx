"use client";

import { useActionState } from "react";
import { loginStaffAction, type LoginState } from "@/server-actions/auth";

const initialState: LoginState = {
  status: "idle",
  message: "Choose your name and enter your individual staff password.",
};

export function StaffLoginForm({
  staffMembers,
}: {
  staffMembers: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, isPending] = useActionState(
    loginStaffAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-800">
          Your name
        </span>
        <select
          name="staffMemberId"
          required
          defaultValue=""
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
        >
          <option value="" disabled>
            Choose your name
          </option>
          {staffMembers.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-800">
          Your password
        </span>
        <input
          name="password"
          type="password"
          required
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
        />
      </label>

      <div
        className={`rounded-md px-3 py-2 text-sm ${
          state.status === "error"
            ? "bg-rose-50 text-rose-800"
            : "bg-slate-50 text-slate-600"
        }`}
      >
        {state.message}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
