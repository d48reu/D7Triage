import { DemoSiteNotice } from "@/components/demo-site-notice";
import { IntakeWorkspaceShell } from "@/components/intake-workspace-shell";
import { ReportForm } from "@/components/report-form";
import { StaffHeader } from "@/components/staff-header";
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

export default async function StaffIntakeBoardPage() {
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
    revision: report.revision,
    publicTrackingToken: report.publicTrackingToken,
    status: report.status,
    assignedStaffId: report.assignedStaffId,
    category: report.category,
    description: report.description,
    intakeNotes: report.intakeNotes,
    resolutionNotes: report.resolutionNotes,
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
      <StaffHeader
        current="intake"
        title="Issue Intake Board"
        subtitle="Front desk workspace for logging and updating constituent calls."
      />

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
