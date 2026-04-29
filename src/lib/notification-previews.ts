import type {
  IssueReport,
  IssueStatusEvent,
  NotificationEvent,
  Referral,
} from "@/lib/issues-repository";
import { formatStatus } from "@/lib/issue-types";

export type NotificationPreview = {
  eventType: string;
  label: string;
  subject: string;
  body: string;
  recipient: string | null;
  deliveryStatus: "ready" | "suppressed";
  reason: string;
};

function trimOrNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildNotificationPreview(input: {
  report: IssueReport;
  events: IssueStatusEvent[];
  referrals: Referral[];
}): NotificationPreview {
  const { report, events, referrals } = input;
  const recipient = trimOrNull(report.residentEmail);
  const canSend = Boolean(report.contactConsent && recipient);
  const deliveryStatus = canSend ? "ready" : "suppressed";
  const reason = canSend
    ? "Ready for transactional email once a provider is connected."
    : "Suppressed because the report is missing email consent or a valid recipient.";
  const latestEvent = events[0] ?? null;
  const latestReferral = referrals[0] ?? null;

  if (report.status === "received") {
    return {
      eventType: "confirmation_preview",
      label: "Confirmation preview",
      subject: "District 7 received your report",
      body: `Thanks for reporting this issue. We received your report about ${report.category.toLowerCase()} at ${report.addressText}. Staff will review it and follow up if more information is needed. Your tracking token is ${report.publicTrackingToken}.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "needs_more_info") {
    return {
      eventType: "needs_more_info_preview",
      label: "Needs more info preview",
      subject: "District 7 needs a bit more information",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `Our staff reviewed your report about ${report.category.toLowerCase()} at ${report.addressText}, and we need a little more information before we can route it accurately.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "routed" && latestReferral) {
    return {
      eventType: "routed_preview",
      label: "Routing update preview",
      subject: "District 7 routed your report for review",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `Staff routed your report to ${latestReferral.agencyName} via ${latestReferral.referralMethod.toLowerCase()}. We will keep tracking the case and share updates as we get them.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "awaiting_agency") {
    return {
      eventType: "awaiting_agency_preview",
      label: "Awaiting agency preview",
      subject: "District 7 is waiting on the responsible agency",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `Your report is still active. District 7 has routed it and is waiting on the responsible agency before we can share the next concrete update.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "follow_up_due") {
    return {
      eventType: "follow_up_due_preview",
      label: "Follow-up preview",
      subject: "District 7 is following up on your report",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `Your report is still on our radar. Our team is following up to get a clearer status update on the issue at ${report.addressText}.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "resolved") {
    return {
      eventType: "resolved_preview",
      label: "Resolution preview",
      subject: "District 7 marked your report resolved",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `District 7 marked your report as resolved. If the issue at ${report.addressText} is still active, you can submit a new update or contact staff directly.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "closed_outside_jurisdiction") {
    return {
      eventType: "outside_jurisdiction_preview",
      label: "Outside jurisdiction preview",
      subject: "District 7 reviewed your report",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        `District 7 reviewed your report and determined that it appears to fall outside the office's direct jurisdiction. Staff may still share guidance about the best agency or next step when possible.`,
      recipient,
      deliveryStatus,
      reason,
    };
  }

  if (report.status === "closed_duplicate" && report.duplicateOfReportId) {
    return {
      eventType: "duplicate_linked_preview",
      label: "Duplicate linkage preview",
      subject: "District 7 linked your report to an existing case",
      body:
        trimOrNull(latestEvent?.publicNote) ??
        "Staff linked this report to an existing case so follow-up can stay in one place. District 7 will continue tracking the underlying issue there.",
      recipient,
      deliveryStatus,
      reason,
    };
  }

  return {
    eventType: "status_update_preview",
    label: `${formatStatus(report.status)} preview`,
    subject: `District 7 update: ${formatStatus(report.status)}`,
    body:
      trimOrNull(latestEvent?.publicNote) ??
      `District 7 updated your report status to ${formatStatus(report.status)}.`,
    recipient,
    deliveryStatus,
    reason,
  };
}

export function getLastNotificationSummary(
  notifications: NotificationEvent[],
): NotificationEvent | null {
  return notifications[0] ?? null;
}
