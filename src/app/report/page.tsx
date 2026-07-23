import Link from "next/link";
import { DemoSiteNotice } from "@/components/demo-site-notice";
import { IntakeWorkspaceShell } from "@/components/intake-workspace-shell";
import { ReportForm } from "@/components/report-form";
import { isDemoMode } from "@/lib/demo-mode";
import {
  formatIntakeMonthGroup,
  type IntakeBoardCase,
} from "@/lib/intake-board";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
} from "@/lib/jurisdiction";
import {
  getJurisdictionConfig,
  listAttachments,
  listIssueReports,
  listStaffMembers,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReportPage() {
  await requireStaffSession();

  const demoMode = isDemoMode();
  const now = new Date();
  const jurisdictionConfig = getJurisdictionConfig();
  const staffMembers = listStaffMembers().map((staffMember) => ({
    id: staffMember.id,
    name: staffMember.name,
    title: staffMember.title,
    isActive: staffMember.isActive,
  }));
  const existingCases: IntakeBoardCase[] = listIssueReports().map((report) => ({
    id: report.id,
    publicTrackingToken: report.publicTrackingToken,
    status: report.status,
    assignedStaffId: report.assignedStaffId,
    category: report.category,
    description: report.description,
    addressText: report.addressText,
    residentName: report.residentName ?? "",
    residentEmail: report.residentEmail,
    residentPhone: report.residentPhone ?? "",
    createdAt: report.createdAt,
    districtLabel: formatDistrictHintStatus(
      analyzeReportJurisdiction(report, jurisdictionConfig).districtHintStatus,
    ),
    attachmentCount: listAttachments(report.id).length,
  }));

  return (
    <main className="min-h-screen bg-[#f5f6fb] text-[#181b34]">
      <header className="flex h-11 items-center justify-between border-b border-[#d9e0ef] bg-[#eef2fb] px-3">
        <Link href="/staff" className="flex items-center gap-2">
          <span className="grid size-6 grid-cols-2 gap-0.5" aria-hidden="true">
            <span className="rounded-full bg-[#6161ff]" />
            <span className="rounded-full bg-[#8b5cf6]" />
            <span className="rounded-full bg-[#3b82f6]" />
            <span className="rounded-full bg-[#7c3aed]" />
          </span>
          <span className="text-[15px] font-semibold">
            d7 <span className="font-normal">work management</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-[#323650]">
          <span className="hidden text-[#676f8f] sm:inline">Staff intake</span>
          <Link
            href="/staff"
            className="rounded border border-[#c9d3e8] bg-white px-3 py-1.5 font-medium hover:bg-[#f5f7fb]"
          >
            Case Dashboard
          </Link>
          <span className="rounded-full bg-[#ff642e] px-2 py-1 text-xs font-semibold text-white">
            D7
          </span>
        </div>
      </header>

      <IntakeWorkspaceShell>
        <section className="min-w-0 bg-white">
          <div className="border-b border-[#d9e0ef] px-8 pt-6 max-md:px-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[26px] font-semibold tracking-[-0.01em]">
                    Constituent Calls
                  </h1>
                  <span className="rounded bg-[#e8f3ff] px-2 py-1 text-xs font-semibold text-[#0060b9]">
                    Staff only
                  </span>
                </div>
                <div className="mt-4 border-b-2 border-[#0073ea] pb-3 text-sm font-medium">
                  Main table
                </div>
              </div>
              <div className="pb-3 text-sm text-[#68728f]">Live staff queue</div>
            </div>
          </div>

          {demoMode ? (
            <div className="mx-8 mt-4 max-md:mx-4">
              <DemoSiteNotice body="This hosted demo shows the real board workflow, but new cases are disabled so the demo data stays clean." />
            </div>
          ) : null}

          <ReportForm
            demoMode={demoMode}
            existingCases={existingCases}
            staffMembers={staffMembers}
            currentGroupLabel={formatIntakeMonthGroup(now)}
            todayDateValue={formatDistrictDateInputValue(now)}
          />
        </section>
      </IntakeWorkspaceShell>
    </main>
  );
}

function formatDistrictDateInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
