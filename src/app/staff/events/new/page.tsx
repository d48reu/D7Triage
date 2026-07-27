import Link from "next/link";
import { EventEditorForm } from "@/components/event-editor-form";
import { StaffHeader } from "@/components/staff-header";
import { listStaffMembers } from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import { createLiveEventAction } from "@/server-actions/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireStaffSession();
  const staffMembers = listStaffMembers().filter(
    (staffMember) => staffMember.isActive,
  );
  const defaultOwner =
    staffMembers.find(
      (staffMember) => staffMember.name.toLowerCase() === "carol gustafson",
    ) ?? staffMembers[0];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="events"
        title="New Event"
        subtitle="Create a live planning record for Carol or another District 7 staff owner."
      />

      <div className="mx-auto max-w-5xl px-5 py-6">
        <Link
          href="/staff/events"
          className="text-sm font-semibold text-sky-800 hover:underline"
        >
          ← Back to events
        </Link>

        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
          This creates a staff event, not a constituent case. Once saved, the
          event record will let staff add updates, tasks, and attachments.
        </div>

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <EventEditorForm
            action={createLiveEventAction}
            staffMembers={staffMembers}
            defaultOwnerStaffId={defaultOwner?.id}
          />
        </section>
      </div>
    </main>
  );
}
