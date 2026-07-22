import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
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
      detail?: string;
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      reason: string;
    };

type AssignmentEmailProvider = "resend" | "smtp";

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;
let smtpTransporterCacheKey: string | null = null;

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

function parseEmailProvider(): AssignmentEmailProvider {
  const configuredProvider = process.env.STAFF_ASSIGNMENT_EMAIL_PROVIDER?.trim().toLowerCase();
  if (configuredProvider === "smtp" || configuredProvider === "resend") {
    return configuredProvider;
  }

  if (
    process.env.SMTP_HOST?.trim() ||
    process.env.SMTP_USER?.trim() ||
    process.env.SMTP_PASSWORD?.trim()
  ) {
    return "smtp";
  }

  return "resend";
}

function parseSmtpSecure(port: number) {
  const configuredValue = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (configuredValue) {
    return ["1", "true", "yes", "on"].includes(configuredValue);
  }

  return port === 465;
}

function getAssignmentEmailConfig() {
  const provider = parseEmailProvider();

  if (isEnvDisabled(process.env.STAFF_ASSIGNMENT_EMAIL_ENABLED)) {
    return {
      enabled: false,
      provider,
      apiKey: null as string | null,
      smtpHost: null as string | null,
      smtpPort: null as number | null,
      smtpSecure: null as boolean | null,
      smtpUser: null as string | null,
      smtpPassword: null as string | null,
      bccEmail: null as string | null,
      fromEmail: null,
      reason: "staff assignment email is disabled",
    };
  }

  const fromEmail =
    process.env.ISSUE_REPORT_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    null;
  const bccEmail =
    process.env.STAFF_ASSIGNMENT_EMAIL_BCC?.trim() ||
    process.env.ISSUE_REPORT_BCC_EMAIL?.trim() ||
    null;

  if (provider === "smtp") {
    const smtpHost = process.env.SMTP_HOST?.trim() || null;
    const smtpPort = Number(process.env.SMTP_PORT?.trim() || "465");
    const smtpUser = process.env.SMTP_USER?.trim() || null;
    const smtpPassword = process.env.SMTP_PASSWORD?.trim() || null;
    const smtpSecure = parseSmtpSecure(smtpPort);

    const missing = [
      !smtpHost ? "SMTP_HOST" : null,
      !smtpPort || !Number.isFinite(smtpPort) ? "SMTP_PORT" : null,
      !smtpUser ? "SMTP_USER" : null,
      !smtpPassword ? "SMTP_PASSWORD" : null,
      !fromEmail ? "ISSUE_REPORT_FROM_EMAIL" : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      return {
        enabled: true,
        provider,
        apiKey: null,
        smtpHost,
        smtpPort: Number.isFinite(smtpPort) ? smtpPort : null,
        smtpSecure,
        smtpUser,
        smtpPassword,
        bccEmail,
        fromEmail,
        reason: `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`,
      };
    }

    return {
      enabled: true,
      provider,
      apiKey: null,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      bccEmail,
      fromEmail,
      reason: null,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  if (!apiKey || !fromEmail) {
    return {
      enabled: true,
      provider,
      apiKey,
      smtpHost: null,
      smtpPort: null,
      smtpSecure: null,
      smtpUser: null,
      smtpPassword: null,
      bccEmail,
      fromEmail,
      reason: "RESEND_API_KEY and ISSUE_REPORT_FROM_EMAIL are required",
    };
  }

  return {
    enabled: true,
    provider,
    apiKey,
    smtpHost: null,
    smtpPort: null,
    smtpSecure: null,
    smtpUser: null,
    smtpPassword: null,
    bccEmail,
    fromEmail,
    reason: null,
  };
}

export function getStaffAssignmentEmailReadiness() {
  const config = getAssignmentEmailConfig();
  const hasProviderCredentials =
    config.provider === "smtp"
      ? Boolean(config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPassword)
      : Boolean(config.apiKey);

  return {
    enabled: config.enabled,
    provider: config.provider,
    hasResendApiKey: Boolean(config.apiKey),
    hasSmtpCredentials: Boolean(
      config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPassword,
    ),
    hasProviderCredentials,
    hasFromEmail: Boolean(config.fromEmail),
    hasBccEmail: Boolean(config.bccEmail),
    bccEmail: config.bccEmail,
    fromEmail: config.fromEmail,
    ready: Boolean(config.enabled && hasProviderCredentials && config.fromEmail),
    reason: config.reason,
  };
}

function getSmtpTransporter(config: {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
}) {
  const cacheKey = [
    config.smtpHost,
    config.smtpPort,
    config.smtpSecure,
    config.smtpUser,
    config.smtpPassword,
  ].join("|");

  if (!smtpTransporter || smtpTransporterCacheKey !== cacheKey) {
    smtpTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });
    smtpTransporterCacheKey = cacheKey;
  }

  return smtpTransporter;
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
  if (!config.enabled || !config.fromEmail) {
    return {
      status: "skipped",
      reason: config.reason || "assignment email is not configured",
    };
  }

  if (config.provider === "smtp") {
    if (
      !config.smtpHost ||
      !config.smtpPort ||
      !config.smtpUser ||
      !config.smtpPassword ||
      config.smtpSecure === null
    ) {
      return {
        status: "skipped",
        reason: config.reason || "SMTP assignment email is not configured",
      };
    }

    try {
      const transporter = getSmtpTransporter({
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword,
      });
      const result = await transporter.sendMail({
        from: config.fromEmail,
        to: recipient,
        bcc: config.bccEmail ?? undefined,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      const accepted = result.accepted?.map(String).join(", ");
      const rejected = result.rejected?.map(String).join(", ");
      const responseDetails = [
        result.response ? `SMTP response: ${result.response}` : null,
        accepted ? `Accepted: ${accepted}` : null,
        rejected ? `Rejected: ${rejected}` : null,
        config.bccEmail ? `BCC: ${config.bccEmail}` : null,
      ].filter(Boolean);

      return {
        status: "sent",
        recipient,
        messageId: result.messageId ?? null,
        detail: responseDetails.join(" "),
      };
    } catch (error) {
      return {
        status: "failed",
        reason:
          error instanceof Error
            ? error.message
            : "SMTP server rejected the assignment email",
      };
    }
  }

  if (!config.apiKey) {
    return {
      status: "skipped",
      reason: config.reason || "Resend assignment email is not configured",
    };
  }

  const resend = getResendClient(config.apiKey);
  const { data, error } = await resend.emails.send(
    {
      from: config.fromEmail,
      to: recipient,
      bcc: config.bccEmail ?? undefined,
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
    detail: config.bccEmail ? `BCC: ${config.bccEmail}` : undefined,
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
