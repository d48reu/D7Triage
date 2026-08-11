"use server";

import { revalidatePath } from "next/cache";
import type { NotificationTemplateKey } from "@/lib/notification-template-definitions";
import {
  getIssueReportById,
  updateNotificationReview,
  upsertNotificationTemplate,
} from "@/lib/issues-repository";
import { requireStaffActionActor } from "@/lib/staff-action-auth";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function saveNotificationTemplateAction(formData: FormData) {
  await requireStaffActionActor();

  const key = readRequiredText(
    formData,
    "templateKey",
  ) as NotificationTemplateKey;

  upsertNotificationTemplate({
    key,
    subjectTemplate: readRequiredText(formData, "subjectTemplate"),
    bodyTemplate: readRequiredText(formData, "bodyTemplate"),
  });

  revalidatePath("/staff/notifications");
}

export async function updateNotificationReviewAction(formData: FormData) {
  await requireStaffActionActor();

  const reportId = readRequiredText(formData, "reportId");
  const report = getIssueReportById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }

  updateNotificationReview({
    reportId,
    status: readRequiredText(formData, "reviewStatus") as
      | "ready"
      | "needs_edit"
      | "hold",
    note: String(formData.get("reviewNote") ?? "").trim(),
  });

  revalidatePath("/staff/notifications");
  revalidatePath(`/staff/reports/${reportId}`);
}
