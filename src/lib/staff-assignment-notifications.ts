import { Resend } from "resend";
import { formatStatus } from "@/lib/issue-types";
import {
  formatStaffMemberLabel,
  type IssueReport,
  type StaffMember,
} from "@/lib/issues-repository";

type AssignmentNotificationResult =
  | {
      status: "sent";
      recipient: string;
      messageId: string | null;
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      reason: string;
    };

let resendClient: Resend | null = null;

function getResendClient(apiKey: string) {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function isEnvDisabled(value: string | undefined) {
  return ["0", "false", "no", "off", "disabled"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}

function getAssignmentEmailConfig() {
  if (isEnvDisabled(process.env.STAFF_ASSIGNMENT_EMAIL_ENABLED)) {
    return {
      enabled: false,
      apiKey: null,
      fromEmail: null,
      reason: "staff assignment email is disabled",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const fromEmail = process.env.ISSUE_REPORT_FROM_EMAIL?.trim() || null;

  if (!apiKey || !fromEmail) {
    return {
      enabled: true,
      apiKey,
      fromEmail,
      reason: "RESEND_API_KEY and ISSUE_REPORT_FROM_EMAIL are required",
    };
  }

  return {
    enabled: true,
    apiKey,
    fromEmail,
    reason: null,
  };
}

export function getStaffAssignmentEmailReadiness() {
  const config = getAssignmentEmailConfig();

  return {
    enabled: config.enabled,
    hasResendApiKey: Boolean(config.apiKey),
    hasFromEmail: Boolean(config.fromEmail),
    fromEmail: config.fromEmail,
    ready: Boolean(config.enabled && config.apiKey && config.fromEmail),
    reason: config.reason,
  };
}

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configuredUrl || "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAssignmentEmail(input: {
  report: IssueReport;
  staffMember: StaffMember;
}) {
  const { report, staffMember } = input;
  const caseUrl = `${getAppUrl()}/staff/reports/${report.id}`;
  const staffLabel = formatStaffMemberLabel(staffMember);
  const subject = `Assigned: ${report.category} at ${report.addressText}`;
  const text = [
    `Hi ${staffMember.name},`,
    "",
    `You have been assigned a District 7 issue report.`,
    "",
    `Category: ${report.category}`,
    `Status: ${formatStatus(report.status)}`,
    `Location: ${report.addressText}`,
    "",
    "Issue description:",
    report.description,
    "",
    `Open the case: ${caseUrl}`,
    "",
    "District 7 Issue Reporter",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p>Hi ${escapeHtml(staffMember.name)},</p>
      <p>You have been assigned a District 7 issue report.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 700;">Category</td><td>${escapeHtml(report.category)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 700;">Status</td><td>${escapeHtml(formatStatus(report.status))}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 700;">Location</td><td>${escapeHtml(report.addressText)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: 700;">Owner</td><td>${escapeHtml(staffLabel)}</td></tr>
      </table>
      <p style="font-weight: 700; margin-bottom: 4px;">Issue description</p>
      <p style="white-space: pre-wrap;">${escapeHtml(report.description)}</p>
      <p><a href="${escapeHtml(caseUrl)}">Open this case</a></p>
      <p style="color: #475569; font-size: 13px;">District 7 Issue Reporter</p>
    </div>
  `;

  return { subject, text, html, caseUrl };
}

function buildTestEmail(staffMember: StaffMember) {
  const appUrl = getAppUrl();
  const subject = "District 7 assignment email test";
  const text = [
    `Hi ${staffMember.name},`,
    "",
    "This is a test of District 7 Issue Reporter assignment emails.",
    "",
    "If you received this, internal assignment notifications are working.",
    "",
    `Open the staff inbox: ${appUrl}/staff`,
    "",
    "District 7 Issue Reporter",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <p>Hi ${escapeHtml(staffMember.name)},</p>
      <p>This is a test of District 7 Issue Reporter assignment emails.</p>
      <p>If you received this, internal assignment notifications are working.</p>
      <p><a href="${escapeHtml(`${appUrl}/staff`)}">Open the staff inbox</a></p>
      <p style="color: #475569; font-size: 13px;">District 7 Issue Reporter</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendStaffEmail(input: {
  staffMember: StaffMember;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<AssignmentNotificationResult> {
  const recipient = input.staffMember.email?.trim();
  if (!recipient) {
    return {
      status: "skipped",
      reason: `${input.staffMember.name} does not have an email address configured`,
    };
  }

  const config = getAssignmentEmailConfig();
  if (!config.enabled || !config.apiKey || !config.fromEmail) {
    return {
      status: "skipped",
      reason: config.reason || "assignment email is not configured",
    };
  }

  const resend = getResendClient(config.apiKey);
  const { data, error } = await resend.emails.send(
    {
      from: config.fromEmail,
      to: recipient,
      subject: input.subject,
      text: input.text,
      html: input.html,
    },
    {
      headers: {
        "Idempotency-Key": input.idempotencyKey,
      },
    },
  );

  if (error) {
    return {
      status: "failed",
      reason: error.message || "Resend rejected the assignment email",
    };
  }

  return {
    status: "sent",
    recipient,
    messageId: data?.id ?? null,
  };
}

export async function sendStaffAssignmentNotification(input: {
  report: IssueReport;
  staffMember: StaffMember;
}): Promise<AssignmentNotificationResult> {
  const email = buildAssignmentEmail(input);
  return sendStaffEmail({
    staffMember: input.staffMember,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: `staff-assignment-${input.report.id}-${input.staffMember.id}-${input.report.updatedAt}`,
  });
}

export async function sendStaffAssignmentTestEmail(
  staffMember: StaffMember,
): Promise<AssignmentNotificationResult> {
  const email = buildTestEmail(staffMember);
  return sendStaffEmail({
    staffMember,
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey: `staff-assignment-test-${staffMember.id}-${Date.now()}`,
  });
}
