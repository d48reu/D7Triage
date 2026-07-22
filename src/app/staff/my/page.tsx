import Link from "next/link";
import { logoutStaffAction } from "@/server-actions/auth";
import { acknowledgeAssignmentAction } from "@/server-actions/issues";
import { formatStatus, type IssueStatus } from "@/lib/issue-types";
import {
  getCurrentAssignmentAcknowledgment,
  listIssueReports,
  listStaffMembers,
  listStaffNotes,
  type IssueReport,
  type StaffMember,
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
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const selectedStaffId = readSearchParam(params, "staffId");
  const acknowledged =
    readSearchParam(params, "acknowledged") === "1";
  const staffMembers = listStaffMembers().filter((staffMember) => staffMember.isActive);
  const selectedStaff =
    staffMembers.find((staffMember) => staffMember.id === selectedStaffId) ??
    staffMembers[0] ??
    null;
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
    acknowledgment: getCurrentAssignmentAcknowledgment(report),
  }));
  const needsAcknowledgmentCount = rows.filter((row) => !row.acknowledgment).length;
  const returnTo = selectedStaff ? `/staff/my?staffId=${selectedStaff.id}` : "/staff/my";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/staff" className="text-sm font-medium text-sky-700">
              Staff inbox
            </Link>
            <h1 className="mt-1 text-xl font-semibold">My assignments</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/staff"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              All Cases
            </Link>
            <Link
              href="/report"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              New Report
            </Link>
            <form action={logoutStaffAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                Coworker queue
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Assigned cases that need action
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick your name, acknowledge new assignments, and open cases that
                need updates.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Active assigned" value={rows.length} />
              <Metric label="Needs acknowledgment" value={needsAcknowledgmentCount} />
            </div>
          </div>

          {acknowledged ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Assignment acknowledged.
            </div>
          ) : null}

          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-800">
                Staff member
              </span>
              <select
                name="staffId"
                defaultValue={selectedStaff?.id ?? ""}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {staffMembers.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
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
              {rows.map(({ report, latestStaffUpdate, acknowledgment }) => (
                <AssignmentRow
                  key={report.id}
                  report={report}
                  staffMember={selectedStaff}
                  latestStaffUpdate={latestStaffUpdate?.body ?? null}
                  acknowledgedAt={acknowledgment?.createdAt ?? null}
                  returnTo={returnTo}
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
  staffMember,
  latestStaffUpdate,
  acknowledgedAt,
  returnTo,
}: {
  report: IssueReport;
  staffMember: StaffMember;
  latestStaffUpdate: string | null;
  acknowledgedAt: string | null;
  returnTo: string;
}) {
  return (
    <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_190px_170px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/staff/reports/${report.id}`}
            className="font-semibold text-slate-950 hover:text-sky-800"
          >
            {report.category}
          </Link>
          <StatusBadge status={report.status} />
          {acknowledgedAt ? (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">
              Acknowledged
            </span>
          ) : (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
              Needs acknowledgment
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
        {acknowledgedAt ? (
          <div className="mt-2 text-xs text-slate-500">
            Acknowledged {new Date(acknowledgedAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {!acknowledgedAt ? (
          <form action={acknowledgeAssignmentAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <input type="hidden" name="staffMemberId" value={staffMember.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Acknowledge
            </button>
          </form>
        ) : null}
        <Link
          href={`/staff/reports/${report.id}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open
        </Link>
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
