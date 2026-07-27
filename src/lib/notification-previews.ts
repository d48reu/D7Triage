import type {
  IssueReport,
  NotificationTemplate,
  IssueStatusEvent,
  NotificationEvent,
  Referral,
} from "@/lib/issues-repository";
import { formatStatus } from "@/lib/issue-types";
import { getDeliverableEmail } from "@/lib/contact-details";
import { NOTIFICATION_TEMPLATE_DEFINITIONS } from "@/lib/notification-template-definitions";

export type NotificationPreview = {
  templateKey: string;
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

function interpolateTemplate(
  template: string,
  variables: Record<string, string | null | undefined>,
) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === null || value === undefined || value === ""
      ? ""
      : String(value);
  });
}

function getTemplate(
  key: string,
  templates?: Map<string, NotificationTemplate>,
) {
  const fromSaved = templates?.get(key);
  if (fromSaved) {
    return fromSaved;
  }

  const definition = NOTIFICATION_TEMPLATE_DEFINITIONS.find(
    (template) => template.key === key,
  );
  if (!definition) {
    throw new Error(`Unknown notification template key: ${key}`);
  }

  return {
    key: definition.key,
    label: definition.label,
    subjectTemplate: definition.subjectTemplate,
    bodyTemplate: definition.bodyTemplate,
    updatedAt: "",
  };
}

export function buildNotificationPreview(input: {
  report: IssueReport;
  events: IssueStatusEvent[];
  referrals: Referral[];
  templates?: Map<string, NotificationTemplate>;
}): NotificationPreview {
  const { report, events, referrals, templates } = input;
  const recipient = getDeliverableEmail(report.residentEmail);
  const canSend = Boolean(report.contactConsent && recipient);
  const deliveryStatus = canSend ? "ready" : "suppressed";
  const reason = canSend
    ? "Ready for transactional email once a provider is connected."
    : "Suppressed because the report is missing email consent or a valid recipient.";
  const latestEvent = events[0] ?? null;
  const latestReferral = referrals[0] ?? null;

  let templateKey = "status_update";
  let eventType = "status_update_preview";
  let defaultBody = `District 7 updated your report status to ${formatStatus(report.status)}.`;

  if (report.status === "received") {
    templateKey = "confirmation";
    eventType = "confirmation_preview";
  } else if (report.status === "needs_more_info") {
    templateKey = "needs_more_info";
    eventType = "needs_more_info_preview";
    defaultBody = `Our staff reviewed your report about ${report.category.toLowerCase()} at ${report.addressText}, and we need a little more information before we can route it accurately.`;
  } else if (report.status === "routed" && latestReferral) {
    templateKey = "routed";
    eventType = "routed_preview";
    defaultBody = `Staff routed your report to ${latestReferral.agencyName} via ${latestReferral.referralMethod.toLowerCase()}. We will keep tracking the case and share updates as we get them.`;
  } else if (report.status === "awaiting_agency") {
    templateKey = "awaiting_agency";
    eventType = "awaiting_agency_preview";
    defaultBody =
      "Your report is still active. District 7 has routed it and is waiting on the responsible agency before we can share the next concrete update.";
  } else if (report.status === "follow_up_due") {
    templateKey = "follow_up_due";
    eventType = "follow_up_due_preview";
    defaultBody = `Your report is still on our radar. Our team is following up to get a clearer status update on the issue at ${report.addressText}.`;
  } else if (report.status === "resolved") {
    templateKey = "resolved";
    eventType = "resolved_preview";
    defaultBody = `District 7 marked your report as resolved. If the issue at ${report.addressText} is still active, you can submit a new update or contact staff directly.`;
  } else if (report.status === "closed_outside_jurisdiction") {
    templateKey = "outside_jurisdiction";
    eventType = "outside_jurisdiction_preview";
    defaultBody =
      "District 7 reviewed your report and determined that it appears to fall outside the office's direct jurisdiction. Staff may still share guidance about the best agency or next step when possible.";
  } else if (report.status === "closed_duplicate" && report.duplicateOfReportId) {
    templateKey = "duplicate_linked";
    eventType = "duplicate_linked_preview";
    defaultBody =
      "Staff linked this report to an existing case so follow-up can stay in one place. District 7 will continue tracking the underlying issue there.";
  }

  const template = getTemplate(templateKey, templates);
  const variables = {
    address: report.addressText,
    category: report.category,
    category_lower: report.category.toLowerCase(),
    status: formatStatus(report.status),
    trackingToken: report.publicTrackingToken,
    agencyName: latestReferral?.agencyName ?? "the responsible agency",
    referralMethod: latestReferral?.referralMethod ?? "Email",
    referralMethod_lower:
      latestReferral?.referralMethod.toLowerCase() ?? "email",
    publicNote: latestEvent?.publicNote ?? "",
    publicNote_or_default: trimOrNull(latestEvent?.publicNote) ?? defaultBody,
  };

  return {
    templateKey,
    eventType,
    label: `${template.label} preview`,
    subject: interpolateTemplate(template.subjectTemplate, variables),
    body: interpolateTemplate(template.bodyTemplate, variables),
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
