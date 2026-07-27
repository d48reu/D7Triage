import Link from "next/link";
import { StaffHeader } from "@/components/staff-header";
import { selectStaffIdentityAction } from "@/server-actions/auth";
import { openAssignedCaseAction } from "@/server-actions/issues";
import { formatStatus, type IssueStatus } from "@/lib/issue-types";
import {
  getCurrentAssignmentAcknowledgment,
  listIssueReports,
  listStaffMembers,
  listStaffNotes,
  type IssueReport,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import { ACTIVE_STATUSES } from "@/lib/staff-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MyAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireStaffSession();
  const params = (await searchParams) ?? {};
  const selectedStaffId = readSearchParam(params, "staffId");
  const staffMembers = listStaffMembers().filter((staffMember) => staffMember.isActive);
  const currentStaff =
    staffMembers.find(
      (staffMember) => staffMember.id === session.staffMemberId,
    ) ?? null;

  if (!currentStaff) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <StaffHeader
          current="assignments"
          title="My assignments"
          subtitle="Choose your name once so the app can protect coworkers' new assignments."
        />
        <div className="mx-auto max-w-2xl px-5 py-8">
          <section className="rounded-md border border-amber-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Identity needed
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Who is using this browser?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This keeps another coworker&apos;s case marked as new when you
              view it. Your choice is stored only in this signed staff session.
            </p>
            <form action={selectStaffIdentityAction} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
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
              <button
                type="submit"
                className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Continue to my assignments
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const selectedStaff =
    staffMembers.find((staffMember) => staffMember.id === selectedStaffId) ??
    currentStaff;
  const viewingOwnQueue = selectedStaff.id === currentStaff.id;
  const reports = selectedStaff
    ? listIssueReports().filter(
        (report) =>
          report.assignedStaffId === selectedStaff.id &&
          ACTIVE_STATUSES.has(report.status),
      )
    : [];
  const rows = reports.map((report) => ({
    report,
    latestStaffUpdate: listStaffNotes(report.id)[0] ?? null,
    seen: getCurrentAssignmentAcknowledgment(report),
  }));
  const newAssignmentCount = rows.filter((row) => !row.seen).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="assignments"
        title="My assignments"
        subtitle="Open and work active cases assigned to one staff member."
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                Signed in as {currentStaff.name}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {viewingOwnQueue
                  ? "Your assigned cases"
                  : `${selectedStaff.name}'s assigned cases`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {viewingOwnQueue
                  ? "Opening one of your new assignments marks it as seen."
                  : "This coworker queue is view-only. Opening a case here will not mark it as seen."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Active assigned" value={rows.length} />
              <Metric label="New assignments" value={newAssignmentCount} />
            </div>
          </div>

          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                View assignments for
              </span>
              <select
                name="staffId"
                defaultValue={selectedStaff?.id ?? ""}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {staffMembers.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
                    {staffMember.id === currentStaff.id
                      ? " (you)"
                      : " (view only)"}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-11 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800"
              >
                View Assignments
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          {selectedStaff && rows.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {rows.map(({ report, latestStaffUpdate, seen }) => (
                <AssignmentRow
                  key={report.id}
                  report={report}
                  latestStaffUpdate={latestStaffUpdate?.body ?? null}
                  seenAt={seen?.createdAt ?? null}
                  viewingOwnQueue={viewingOwnQueue}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-slate-600">
              {selectedStaff
                ? `${selectedStaff.name} does not have active assigned cases.`
                : "Add active staff members before using My assignments."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function AssignmentRow({
  report,
  latestStaffUpdate,
  seenAt,
  viewingOwnQueue,
}: {
  report: IssueReport;
  latestStaffUpdate: string | null;
  seenAt: string | null;
  viewingOwnQueue: boolean;
}) {
  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_190px_170px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-950">
            {report.category}
          </span>
          <StatusBadge status={report.status} />
          {seenAt ? (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">
              Seen
            </span>
          ) : (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
              New assignment
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
          {report.description}
        </p>
        <div className="mt-1 text-xs text-slate-500">{report.addressText}</div>
        <div className="mt-2 text-xs text-slate-500">
          {latestStaffUpdate || "No internal updates yet"}
        </div>
      </div>

      <div className="text-sm text-slate-700">
        <div className="font-semibold text-slate-900">Assigned</div>
        <div className="mt-1">
          {report.assignedAt
            ? new Date(report.assignedAt).toLocaleString()
            : "Time unavailable"}
        </div>
        {seenAt ? (
          <div className="mt-2 text-xs text-slate-500">
            Seen {new Date(seenAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {!seenAt && viewingOwnQueue ? (
          <form action={openAssignedCaseAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <button
              type="submit"
              className="rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Open case
            </button>
          </form>
        ) : (
          <Link
            href={`/staff/reports/${report.id}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {viewingOwnQueue ? "Open case" : "View case"}
          </Link>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-32 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const style =
    status === "received"
      ? "border-slate-200 bg-slate-50 text-slate-800"
      : status === "needs_review" || status === "needs_more_info"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : status === "routed" || status === "awaiting_agency"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : status === "follow_up_due"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900";

  return (
    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${style}`}>
      {formatStatus(status)}
    </span>
  );
}

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}
