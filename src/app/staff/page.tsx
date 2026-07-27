import { DemoSiteNotice } from "@/components/demo-site-notice";
import { StaffHeader } from "@/components/staff-header";
import Link from "next/link";
import { isEmailAddress } from "@/lib/contact-details";
import { isDemoMode } from "@/lib/demo-mode";
import { formatStatus, type IssueStatus } from "@/lib/issue-types";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import { findCountyCommissionDistrictForPoint } from "@/lib/location-intelligence";
import {
  getCurrentAssignmentAcknowledgment,
  getJurisdictionConfig,
  getManagedRoutingRule,
  listAiSuggestions,
  listIssueReports,
  listReferrals,
  listStaffMembers,
  listStaffNotes,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";
import {
  buildStaffInboxFlags,
  buildStaffInboxSearchText,
  ACTIVE_STATUSES,
  filterStaffInboxRows,
  getStaffInboxFilterOptions,
  normalizeStaffInboxFilter,
} from "@/lib/staff-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffSession();
  const params = (await searchParams) ?? {};
  const selectedFilter = normalizeStaffInboxFilter(readSearchParam(params, "filter"));
  const searchQuery = readSearchParam(params, "q").trim();
  const demoMode = isDemoMode();
  const reports = listIssueReports();
  const staffMembers = listStaffMembers();
  const staffMemberNameById = new Map(
    staffMembers.map((staffMember) => [staffMember.id, staffMember.name]),
  );
  const jurisdictionConfig = getJurisdictionConfig();
  const reportRows = reports.map((report) => {
    const jurisdiction = analyzeReportJurisdiction(report, jurisdictionConfig);
    const referrals = listReferrals(report.id);
    const latestStaffUpdate = listStaffNotes(report.id)[0] ?? null;
    const assignmentSeen = Boolean(getCurrentAssignmentAcknowledgment(report));
    const aiSuggestions = listAiSuggestions(report.id);
    const ownerLabel =
      getManagedRoutingRule(report.category, report.municipalityName)?.ownerLabel ??
      "District 7 triage";
    const assignedStaffName = report.assignedStaffId
      ? (staffMemberNameById.get(report.assignedStaffId) ?? "Unknown staff member")
      : "";

    const flags = buildStaffInboxFlags({
      report,
      jurisdiction,
      referrals,
      aiSuggestions,
      assignmentSeen,
    });
    const followUpDate =
      referrals.find((referral) => referral.followUpDate)?.followUpDate ?? null;
    const nextAction = getNextAction({
      status: report.status,
      assignedStaffName,
      flags,
      referralsCount: referrals.length,
      followUpDate,
    });

    return {
      report,
      jurisdiction,
      referrals,
      aiSuggestions,
      ownerLabel,
      assignedStaffName,
      flags,
      latestStaffUpdate,
      followUpDate,
      nextAction,
      searchableText: buildStaffInboxSearchText({
        report,
        ownerLabel,
        assignedStaffName,
        latestUpdate: latestStaffUpdate?.body,
        nextAction,
      }),
      countyCommissionDistrict: findCountyCommissionDistrictForPoint(
        report.latitude,
        report.longitude,
        jurisdictionConfig,
      ),
    };
  });
  const filteredRows = filterStaffInboxRows({
    rows: reportRows,
    filter: selectedFilter,
    query: searchQuery,
  });
  const filterOptions = getStaffInboxFilterOptions(reportRows);
  const activeRows = reportRows.filter((row) => ACTIVE_STATUSES.has(row.report.status));
  const newAssignmentRows = reportRows.filter((row) =>
    row.flags.includes("New assignment"),
  );
  const activeCount = activeRows.length;
  const followUpDueCount = reports.filter(
    (report) => report.status === "follow_up_due",
  ).length;
  const unassignedCount = reports.filter((report) =>
    !report.assignedStaffId &&
    !["resolved", "closed_outside_jurisdiction", "closed_duplicate"].includes(report.status),
  );
  const staffAssignmentRows = staffMembers
    .filter((staffMember) => staffMember.isActive)
    .map((staffMember) => {
      const assignedRows = activeRows.filter(
        (row) => row.report.assignedStaffId === staffMember.id,
      );
      const newAssignments = assignedRows.filter((row) =>
        row.flags.includes("New assignment"),
      );

      return {
        staffMember,
        assignedCount: assignedRows.length,
        newAssignmentCount: newAssignments.length,
      };
    })
    .filter((row) => row.assignedCount > 0 || row.newAssignmentCount > 0)
    .sort((a, b) =>
      b.newAssignmentCount - a.newAssignmentCount ||
      b.assignedCount - a.assignedCount ||
      a.staffMember.name.localeCompare(b.staffMember.name),
    );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <StaffHeader
        current="command"
        title="Case Dashboard"
        subtitle="Find, assign, and follow up on constituent cases."
      />

      <div className="mx-auto max-w-7xl px-5 py-6">
        {demoMode ? (
          <div className="mb-6">
            <DemoSiteNotice body="These seeded cases are here to show the triage workflow. Live AI routing is enabled on the case pages, while other changes may reset in the hosted demo." />
          </div>
        ) : null}

        <section
          aria-label="Case totals"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Metric
            label="Active cases"
            value={activeCount}
            href="/staff"
            selected={selectedFilter === "active"}
          />
          <Metric
            label="Unassigned"
            value={unassignedCount.length}
            href="/staff?filter=unassigned"
            tone="amber"
            selected={selectedFilter === "unassigned"}
          />
          <Metric
            label="New assignments"
            value={newAssignmentRows.length}
            href="/staff?filter=needs_acknowledgment"
            tone="amber"
            selected={selectedFilter === "needs_acknowledgment"}
          />
          <Metric
            label="Follow-up due"
            value={followUpDueCount}
            href="/staff?filter=follow_up_due"
            tone="rose"
            selected={selectedFilter === "follow_up_due"}
          />
        </section>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                Search cases
              </span>
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Name, email, phone, address, or case details"
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                Show
              </span>
              <select
                name="filter"
                defaultValue={selectedFilter}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              >
                {filterOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-11 rounded-md bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Apply
            </button>
            <Link
              href="/staff"
              className="flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
          </form>

          <div className="mt-3 text-sm text-slate-600" aria-live="polite">
            Showing {filteredRows.length} of {reports.length} reports
            {searchQuery ? ` for "${searchQuery}"` : ""}.
            {unassignedCount.length > 0 ? ` ${unassignedCount.length} active reports are unassigned.` : ""}
          </div>
        </section>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-labelledby="case-list-heading">
            <div className="mb-3">
              <h2 id="case-list-heading" className="text-xl font-semibold">
                Cases
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {filteredRows.length} shown · {reports.length} total
              </p>
            </div>

            {filteredRows.length > 0 ? (
              <div className="space-y-3">
                {filteredRows.map(({
                  report,
                  jurisdiction,
                  countyCommissionDistrict,
                  ownerLabel,
                  assignedStaffName,
                  flags,
                  referrals,
                  latestStaffUpdate,
                  followUpDate,
                  nextAction,
                }) => {
                  const contactName = report.residentName?.trim() || "Name not entered";
                  const emailOrNote = report.residentEmail.trim();

                  return (
                    <article
                      key={report.id}
                      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-950">
                                {report.category}
                              </span>
                              <StatusBadge status={report.status} />
                              {jurisdiction.districtHintStatus === "likely_outside_district" ? (
                                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                  Outside District 7
                                </span>
                              ) : null}
                              {flags.slice(0, 3).map((flag) => (
                                <FlagBadge key={flag} label={flag} />
                              ))}
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                              {report.description}
                            </p>
                            <div className="mt-1 text-sm text-slate-500">
                              {report.addressText}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatOwnershipHint(jurisdiction.ownershipHint)} ·{" "}
                              {formatDistrictHintStatus(jurisdiction.districtHintStatus)}
                              {jurisdiction.districtHintStatus === "likely_outside_district" &&
                              countyCommissionDistrict
                                ? ` · County district ${countyCommissionDistrict.districtNumber}`
                                : ""}
                              {report.municipalityName ? ` · ${report.municipalityName}` : ""}
                            </div>
                          </div>
                          <Link
                            href={`/staff/reports/${report.id}`}
                            aria-label={`Open ${report.category} case for ${contactName}`}
                            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open case
                          </Link>
                        </div>
                      </div>

                      <dl className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="min-w-0 bg-slate-50 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Caller / emailer
                          </dt>
                          <dd className="mt-2">
                            <div className="font-semibold text-slate-950">{contactName}</div>
                            {emailOrNote ? (
                              isEmailAddress(emailOrNote) ? (
                                <a
                                  href={`mailto:${emailOrNote}`}
                                  className="mt-1 block truncate text-sm text-sky-700 hover:underline"
                                >
                                  {emailOrNote}
                                </a>
                              ) : (
                                <div className="mt-1 text-sm text-slate-600">
                                  {emailOrNote}
                                </div>
                              )
                            ) : (
                              <div className="mt-1 text-sm text-slate-500">No email entered</div>
                            )}
                            {report.residentPhone ? (
                              <a
                                href={`tel:${report.residentPhone}`}
                                className="mt-1 block text-sm text-slate-600 hover:text-sky-700 hover:underline"
                              >
                                {report.residentPhone}
                              </a>
                            ) : null}
                          </dd>
                        </div>
                        <div className="min-w-0 bg-slate-50 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Assigned to
                          </dt>
                          <dd className="mt-2">
                            <div className={`font-semibold ${
                              assignedStaffName ? "text-slate-950" : "text-amber-800"
                            }`}>
                              {assignedStaffName || "Unassigned"}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              Suggested: {ownerLabel}
                            </div>
                          </dd>
                        </div>
                        <div className="min-w-0 bg-slate-50 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Next step
                          </dt>
                          <dd className="mt-2">
                            <div className="font-semibold text-slate-950">{nextAction}</div>
                            {followUpDate ? (
                              <div className="mt-1 text-sm font-medium text-amber-800">
                                Follow up {formatDateOnly(followUpDate)}
                              </div>
                            ) : null}
                            {referrals.length > 0 ? (
                              <div className="mt-1 text-sm text-slate-500">
                                {referrals.length} {referrals.length === 1 ? "referral" : "referrals"}
                              </div>
                            ) : null}
                          </dd>
                        </div>
                        <div className="min-w-0 bg-slate-50 p-4">
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Latest activity
                          </dt>
                          <dd className="mt-2 text-sm text-slate-600">
                            {latestStaffUpdate ? (
                              <div className="line-clamp-2">{latestStaffUpdate.body}</div>
                            ) : (
                              <div>No internal updates yet</div>
                            )}
                            <div className="mt-1 text-xs text-slate-500">
                              {new Date(
                                latestStaffUpdate?.createdAt ?? report.updatedAt,
                              ).toLocaleString()}
                            </div>
                          </dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
                {reports.length > 0
                  ? "No reports match this filter or search."
                  : "No reports yet. Submit one through the public report form to test the local flow."}
              </div>
            )}
          </section>

          <aside className="rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Team workload</h2>
                <p className="mt-1 text-sm text-slate-600">Active assigned cases.</p>
              </div>
              <Link
                href="/staff/my"
                className="text-sm font-semibold text-sky-700 hover:underline"
              >
                My cases
              </Link>
            </div>

            {staffAssignmentRows.length > 0 ? (
              <div className="mt-3 divide-y divide-slate-200">
                {staffAssignmentRows.map((row) => (
                  <Link
                    key={row.staffMember.id}
                    href={`/staff/my?staffId=${row.staffMember.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:text-sky-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {row.staffMember.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {row.newAssignmentCount > 0
                          ? `${row.newAssignmentCount} new`
                          : "No new assignments"}
                      </div>
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-1 text-sm font-semibold tabular-nums text-slate-700">
                      {row.assignedCount}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
                No active assigned cases.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
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

function FlagBadge({ label }: { label: string }) {
  const style =
    label === "Needs first triage"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : label === "New assignment"
        ? "border-amber-200 bg-amber-50 text-amber-900"
      : label === "Check location"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : label === "AI feedback pending"
          ? "border-violet-200 bg-violet-50 text-violet-900"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
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

function getNextAction(input: {
  status: IssueStatus;
  assignedStaffName: string;
  flags: string[];
  referralsCount: number;
  followUpDate: string | null;
}) {
  if (input.flags.includes("Unassigned")) {
    return "Assign owner";
  }

  if (input.flags.includes("New assignment")) {
    return "Open assignment";
  }

  if (input.flags.includes("Check location")) {
    return "Confirm jurisdiction";
  }

  if (input.status === "received") {
    return "First triage";
  }

  if (input.status === "needs_review" || input.status === "needs_more_info") {
    return "Gather missing info";
  }

  if (input.flags.includes("Referral missing")) {
    return "Log referral";
  }

  if (input.status === "routed" && input.referralsCount > 0) {
    return "Wait for agency";
  }

  if (input.status === "awaiting_agency") {
    return input.followUpDate ? "Monitor follow-up date" : "Wait for agency";
  }

  if (input.status === "follow_up_due") {
    return "Follow up now";
  }

  if (
    input.status === "resolved" ||
    input.status === "closed_duplicate" ||
    input.status === "closed_outside_jurisdiction"
  ) {
    return "No action";
  }

  return input.assignedStaffName ? "Continue assigned work" : "Review";
}

function formatDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Metric({
  label,
  value,
  href,
  tone = "neutral",
  selected = false,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "neutral" | "amber" | "rose";
  selected?: boolean;
}) {
  const style =
    tone === "rose" && value > 0
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : tone === "amber" && value > 0
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-white text-slate-950";

  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`rounded-md border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
        selected ? "ring-2 ring-sky-600 ring-offset-2" : ""
      } ${style}`}
    >
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] opacity-70">
        {label}
      </div>
    </Link>
  );
}
