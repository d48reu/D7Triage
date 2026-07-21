import { DemoSiteNotice } from "@/components/demo-site-notice";
import Link from "next/link";
import { logoutStaffAction } from "@/server-actions/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { formatStatus, type IssueStatus } from "@/lib/issue-types";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import { findCountyCommissionDistrictForPoint } from "@/lib/location-intelligence";
import {
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
  const receivedCount = reports.filter((report) => report.status === "received").length;
  const activeCount = reportRows.filter((row) =>
    ["received", "needs_review", "routed", "awaiting_agency", "needs_more_info", "follow_up_due"].includes(
      row.report.status,
    ),
  ).length;
  const unassignedCount = reports.filter((report) =>
    !report.assignedStaffId &&
    !["resolved", "closed_outside_jurisdiction", "closed_duplicate"].includes(report.status),
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-sm font-medium text-sky-700">
              District 7 Issue Reporter
            </Link>
            <h1 className="mt-1 text-xl font-semibold">Staff inbox</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/report"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              New Report
            </Link>
            <Link
              href="/staff/routing"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Routing Guide
            </Link>
            <Link
              href="/staff/analytics"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Analytics
            </Link>
            <Link
              href="/staff/notifications"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Notifications
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
        {demoMode ? (
          <div className="mb-6">
            <DemoSiteNotice body="These seeded cases are here to show the triage workflow. Live AI routing is enabled on the case pages, while other changes may reset in the hosted demo." />
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-4">
          <Metric label="All reports" value={reports.length} />
          <Metric label="Received" value={receivedCount} />
          <Metric label="Active" value={activeCount} />
          <Metric label="Unassigned" value={unassignedCount.length} />
        </section>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="filter" value={selectedFilter} />
            <label className="block">
              <span className="sr-only">Search reports</span>
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search address, category, resident, owner, or description"
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            >
              Search
            </button>
            <Link
              href={`/staff?filter=${selectedFilter}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </Link>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Link
                key={option.key}
                href={buildStaffHref({
                  filter: option.key,
                  q: searchQuery,
                })}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  selectedFilter === option.key
                    ? "bg-sky-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}{" "}
                <span className={selectedFilter === option.key ? "text-sky-100" : "text-slate-500"}>
                  {option.count}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-3 text-sm text-slate-600">
            Showing {filteredRows.length} of {reports.length} reports
            {searchQuery ? ` for "${searchQuery}"` : ""}.
            {unassignedCount.length > 0 ? ` ${unassignedCount.length} active reports are unassigned.` : ""}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_180px_150px_210px_1fr_96px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 max-xl:hidden">
            <div>Case</div>
            <div>Owner</div>
            <div>Status</div>
            <div>Next action</div>
            <div>Latest update</div>
            <div>Open</div>
          </div>

          {filteredRows.length > 0 ? (
            <div className="divide-y divide-slate-200">
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
              }) => (
                <Link
                  key={report.id}
                  href={`/staff/reports/${report.id}`}
                  className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 xl:grid-cols-[1.2fr_180px_150px_210px_1fr_96px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-950">
                        {report.category}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 md:hidden">
                        {formatStatus(report.status)}
                      </span>
                      {jurisdiction.districtHintStatus === "likely_outside_district" ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Outside District 7
                        </span>
                      ) : null}
                      {flags.slice(0, 3).map((flag) => (
                        <FlagBadge key={flag} label={flag} />
                      ))}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {report.description}
                    </p>
                    <div className="mt-1 text-xs text-slate-500">
                      {report.addressText}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">
                    <div className="font-medium text-slate-900">
                      {assignedStaffName || "Unassigned"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Suggested: {ownerLabel}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatOwnershipHint(jurisdiction.ownershipHint)} |{" "}
                      {formatDistrictHintStatus(jurisdiction.districtHintStatus)}
                    </div>
                    {jurisdiction.districtHintStatus === "likely_outside_district" &&
                    countyCommissionDistrict ? (
                      <div className="mt-1 text-xs text-slate-500">
                        County district {countyCommissionDistrict.districtNumber}
                        {countyCommissionDistrict.commissionerName
                          ? ` (${countyCommissionDistrict.commissionerName})`
                          : ""}
                      </div>
                    ) : null}
                    {report.municipalityName ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {report.municipalityName}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-700">
                    <StatusBadge status={report.status} />
                    <div className="mt-2 text-xs text-slate-500 xl:hidden">
                      Updated {new Date(report.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{nextAction}</div>
                    {followUpDate ? (
                      <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                        Follow up {formatDateOnly(followUpDate)}
                      </div>
                    ) : null}
                    {referrals.length > 0 ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Referrals: {referrals.length}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-600">
                    {latestStaffUpdate ? (
                      <>
                        <div className="line-clamp-2 leading-6">
                          {latestStaffUpdate.body}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(latestStaffUpdate.createdAt).toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500">No internal updates yet</span>
                    )}
                  </div>
                  <div className="flex items-start xl:justify-end">
                    <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm text-slate-600">
              {reports.length > 0
                ? "No reports match this filter or search."
                : "No reports yet. Submit one through the public report form to test the local flow."}
            </div>
          )}
        </section>
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

function buildStaffHref(input: { filter: string; q: string }) {
  const query = new URLSearchParams();
  if (input.filter && input.filter !== "active") {
    query.set("filter", input.filter);
  }
  if (input.q) {
    query.set("q", input.q);
  }
  const serialized = query.toString();
  return serialized ? `/staff?${serialized}` : "/staff";
}

function FlagBadge({ label }: { label: string }) {
  const style =
    label === "Needs first triage"
      ? "border-rose-200 bg-rose-50 text-rose-800"
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
