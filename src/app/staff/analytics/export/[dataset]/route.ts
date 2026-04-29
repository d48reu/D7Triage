import { NextResponse } from "next/server";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import {
  getJurisdictionConfig,
  listAiSuggestions,
  listIssueReports,
  listNewsletterContacts,
  listReferrals,
} from "@/lib/issues-repository";
import { requireStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  await requireStaffSession();
  const { dataset } = await context.params;

  const csv = buildCsv(dataset);
  if (!csv) {
    return NextResponse.json({ error: "Unknown export dataset." }, { status: 404 });
  }

  return new NextResponse(csv.body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csv.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function buildCsv(dataset: string) {
  const reports = listIssueReports();
  const jurisdictionConfig = getJurisdictionConfig();

  switch (dataset) {
    case "newsletter-contacts": {
      const contacts = listNewsletterContacts();
      return {
        fileName: "newsletter-contacts.csv",
        body: toCsv(
          [
            "email",
            "name",
            "phone",
            "preferred_language",
            "first_opted_in_at",
            "last_opted_in_at",
            "report_count",
            "latest_report_id",
          ],
          contacts.map((contact) => [
            contact.residentEmail,
            contact.residentName ?? "",
            contact.residentPhone ?? "",
            contact.preferredLanguage,
            contact.firstOptedInAt,
            contact.lastOptedInAt,
            String(contact.reportCount),
            contact.latestReportId,
          ]),
        ),
      };
    }
    case "open-reports": {
      const openReports = reports.filter((report) =>
        !["resolved", "closed_outside_jurisdiction", "closed_duplicate"].includes(
          report.status,
        ),
      );
      return {
        fileName: "open-reports.csv",
        body: toCsv(
          [
            "jurisdiction_ownership_hint",
            "district_hint_status",
            "report_id",
            "tracking_token",
            "status",
            "category",
            "address",
            "resident_name",
            "resident_email",
            "resident_phone",
            "preferred_language",
            "newsletter_opt_in",
            "created_at",
          ],
          openReports.map((report) => {
            const jurisdiction = analyzeReportJurisdiction(report, jurisdictionConfig);
            return [
              formatOwnershipHint(jurisdiction.ownershipHint),
              formatDistrictHintStatus(jurisdiction.districtHintStatus),
              report.id,
              report.publicTrackingToken,
              report.status,
              report.category,
              report.addressText,
              report.residentName ?? "",
              report.residentEmail,
              report.residentPhone ?? "",
              report.preferredLanguage,
              report.newsletterOptIn ? "yes" : "no",
              report.createdAt,
            ];
          }),
        ),
      };
    }
    case "referrals": {
      const rows = reports.flatMap((report) =>
        listReferrals(report.id).map((referral) => ({
          reportId: report.id,
          trackingToken: report.publicTrackingToken,
          category: report.category,
          status: report.status,
          referral,
        })),
      );
      return {
        fileName: "referrals.csv",
        body: toCsv(
          [
            "report_id",
            "tracking_token",
            "category",
            "report_status",
            "agency_name",
            "referral_method",
            "outcome_status",
            "external_reference",
            "follow_up_date",
            "outcome_note",
            "notes",
            "created_at",
            "updated_at",
          ],
          rows.map((row) => [
            row.reportId,
            row.trackingToken,
            row.category,
            row.status,
            row.referral.agencyName,
            row.referral.referralMethod,
            row.referral.outcomeStatus,
            row.referral.externalReference ?? "",
            row.referral.followUpDate ?? "",
            row.referral.outcomeNote ?? "",
            row.referral.notes ?? "",
            row.referral.createdAt,
            row.referral.updatedAt,
          ]),
        ),
      };
    }
    case "ai-feedback": {
      const rows = reports.flatMap((report) =>
        listAiSuggestions(report.id)
          .filter((suggestion) => suggestion.feedbackDisposition !== null)
          .map((suggestion) => ({
            reportId: report.id,
            trackingToken: report.publicTrackingToken,
            category: report.category,
            suggestion,
          })),
      );
      return {
        fileName: "ai-feedback.csv",
        body: toCsv(
          [
            "report_id",
            "tracking_token",
            "category",
            "suggested_category",
            "suggested_urgency",
            "suggested_responsible_party",
            "confidence",
            "model",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "feedback_disposition",
            "feedback_note",
            "suggestion_created_at",
            "feedback_created_at",
          ],
          rows.map((row) => [
            row.reportId,
            row.trackingToken,
            row.category,
            row.suggestion.suggestedCategory,
            row.suggestion.suggestedUrgency,
            row.suggestion.suggestedResponsibleParty,
            row.suggestion.confidence,
            row.suggestion.model ?? "",
            row.suggestion.inputTokens?.toString() ?? "",
            row.suggestion.outputTokens?.toString() ?? "",
            row.suggestion.totalTokens?.toString() ?? "",
            row.suggestion.feedbackDisposition ?? "",
            row.suggestion.feedbackNote ?? "",
            row.suggestion.createdAt,
            row.suggestion.feedbackCreatedAt ?? "",
          ]),
        ),
      };
    }
    default:
      return null;
  }
}

function toCsv(headers: string[], rows: string[][]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function escapeCsvCell(value: string) {
  const normalized = value.replaceAll('"', '""');
  return /[",\r\n]/.test(normalized) ? `"${normalized}"` : normalized;
}
