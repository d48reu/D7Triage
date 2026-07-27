import {
  getJurisdictionConfig,
  listAgencies,
  listAiSuggestions,
  listAllIssueReports,
  listAnalyticsViews,
  listAssignmentAcknowledgments,
  listAttachments,
  listIssueAuditEvents,
  listManagedRoutingRules,
  listNewsletterContacts,
  listNotificationEvents,
  listNotificationTemplates,
  listReferrals,
  listStaffMembers,
  listStaffNotes,
  listStatusEvents,
} from "@/lib/issues-repository";
import {
  getHistoricalArchiveSummary,
  listAllHistoricalCases,
  listHistoricalCaseAttachments,
  listHistoricalCaseUpdates,
  listHistoricalEventAttachments,
  listHistoricalEventUpdates,
  listHistoricalEvents,
} from "@/lib/historical-archive-repository";

export function buildPilotDataBackup() {
  const reports = listAllIssueReports();
  const historicalCases = listAllHistoricalCases();

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "district-7-issue-reporter",
    notes: [
      "This export contains case records and related metadata.",
      "Attachment file metadata is included, but attachment file bytes remain on the Render persistent disk.",
      "The Monday.com historical archive is included separately and does not represent active cases.",
    ],
    reports: reports.map((report) => ({
      report,
      statusEvents: listStatusEvents(report.id),
      staffNotes: listStaffNotes(report.id),
      assignmentAcknowledgments: listAssignmentAcknowledgments(report.id),
      auditEvents: listIssueAuditEvents(report.id),
      referrals: listReferrals(report.id),
      attachments: listAttachments(report.id),
      notificationEvents: listNotificationEvents(report.id),
      aiSuggestions: listAiSuggestions(report.id),
    })),
    configuration: {
      jurisdiction: getJurisdictionConfig(),
      agencies: listAgencies(),
      staffMembers: listStaffMembers(),
      managedRoutingRules: listManagedRoutingRules(),
      notificationTemplates: listNotificationTemplates(),
      analyticsViews: listAnalyticsViews(),
    },
    newsletterContacts: listNewsletterContacts(),
    historicalArchive: {
      summary: getHistoricalArchiveSummary(),
      cases: historicalCases.map((historicalCase) => ({
        historicalCase,
        updates: listHistoricalCaseUpdates(historicalCase.id),
        attachments: listHistoricalCaseAttachments(historicalCase.id),
      })),
      events: listHistoricalEvents().map((event) => ({
        event,
        updates: listHistoricalEventUpdates(event.id),
        attachments: listHistoricalEventAttachments(event.id),
      })),
    },
  };
}

export function buildPilotDataBackupFileName(now = new Date()) {
  const timestamp = now.toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
  return `district-7-pilot-backup-${timestamp}.json`;
}
