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
  listIssueReports,
  listStaffMembers,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireStaffSession();
  const demoMode = isDemoMode();
  const reports = listIssueReports();
  const staffMembers = listStaffMembers();
  const staffMemberNameById = new Map(
    staffMembers.map((staffMember) => [staffMember.id, staffMember.name]),
  );
  const jurisdictionConfig = getJurisdictionConfig();
  const reportRows = reports.map((report) => ({
    report,
    jurisdiction: analyzeReportJurisdiction(report, jurisdictionConfig),
    countyCommissionDistrict: findCountyCommissionDistrictForPoint(
      report.latitude,
      report.longitude,
      jurisdictionConfig,
    ),
  }));
  const needsReview = reports.filter((report) => report.status === "received");
  const inProgress = reports.filter((report) =>
    ["needs_review", "routed", "awaiting_agency"].includes(report.status),
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

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="All reports" value={reports.length} />
          <Metric label="Needs review" value={needsReview.length} />
          <Metric label="In progress" value={inProgress.length} />
        </section>

        <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_220px_140px_160px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 max-lg:hidden">
            <div>Report</div>
            <div>Likely owner</div>
            <div>Status</div>
            <div>Submitted</div>
          </div>

          {reports.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {reportRows.map(({ report, jurisdiction, countyCommissionDistrict }) => (
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
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                      {report.description}
                    </p>
                    <div className="mt-1 text-xs text-slate-500">
                      {report.addressText}
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-600">
                      Assigned:{" "}
                      {report.assignedStaffId
                        ? (staffMemberNameById.get(report.assignedStaffId) ??
                          "Unknown staff member")
                        : "Unassigned"}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>
                      {getManagedRoutingRule(report.category, report.municipalityName)?.ownerLabel ??
                        "District 7 triage"}
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
              No reports yet. Submit one through the public report form to test
              the local flow.
            </div>
          )}
        </section>
      </div>
    </main>
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
