import { DemoSiteNotice } from "@/components/demo-site-notice";
import Link from "next/link";
import { logoutStaffAction } from "@/server-actions/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { formatStatus } from "@/lib/issue-types";
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
    const aiSuggestions = listAiSuggestions(report.id);
    const ownerLabel =
      getManagedRoutingRule(report.category, report.municipalityName)?.ownerLabel ??
      "District 7 triage";
    const assignedStaffName = report.assignedStaffId
      ? (staffMemberNameById.get(report.assignedStaffId) ?? "Unknown staff member")
      : "";

    return {
      report,
      jurisdiction,
      referrals,
      aiSuggestions,
      ownerLabel,
      assignedStaffName,
      flags: buildStaffInboxFlags({
        report,
        jurisdiction,
        referrals,
        aiSuggestions,
      }),
      searchableText: buildStaffInboxSearchText({
        report,
        ownerLabel,
        assignedStaffName,
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
  const flaggedCount = reportRows.filter((row) => row.flags.length > 0).length;
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
          <Metric label="Flagged" value={flaggedCount} />
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
          <div className="grid grid-cols-[1fr_220px_140px_160px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 max-lg:hidden">
            <div>Report</div>
            <div>Likely owner</div>
            <div>Status</div>
            <div>Submitted</div>
          </div>

          {filteredRows.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {filteredRows.map(({ report, jurisdiction, countyCommissionDistrict, ownerLabel, assignedStaffName, flags, referrals }) => (
                <Link
                  key={report.id}
                  href={`/staff/reports/${report.id}`}
                  className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1fr_220px_140px_160px]"
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
                    <div className="mt-2 text-xs font-medium text-slate-600">
                      Assigned:{" "}
                      {assignedStaffName || "Unassigned"}
                      {referrals.length > 0 ? ` | Referrals: ${referrals.length}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>
                      {ownerLabel}
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
                  <div className="hidden text-sm text-slate-700 lg:block">
                    {formatStatus(report.status)}
                  </div>
                  <div className="text-xs text-slate-500 lg:text-sm">
                    {new Date(report.createdAt).toLocaleString()}
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
