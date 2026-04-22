"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/issue-types";
import {
  addReferral,
  addStaffNote,
  createIssueReport,
  getIssueReportById,
  updateIssueStatus,
} from "@/lib/issues-repository";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function submitIssueReportAction(formData: FormData) {
  const description = readRequiredText(formData, "description");
  const addressText = readRequiredText(formData, "addressText");
  const residentEmail = readRequiredText(formData, "residentEmail");
  const category = readRequiredText(formData, "category");
  const contactConsent = formData.get("contactConsent") === "on";

  if (!residentEmail.includes("@")) {
    throw new Error("A valid email is required");
  }

  if (!contactConsent) {
    throw new Error("Email update consent is required for this local MVP");
  }

  const report = createIssueReport({
    category,
    description,
    addressText,
    residentEmail,
    contactConsent,
    residentName: String(formData.get("residentName") ?? "").trim(),
    residentPhone: String(formData.get("residentPhone") ?? "").trim(),
    preferredLanguage:
      String(formData.get("preferredLanguage") ?? "").trim() || "English",
  });

  if (!report) {
    throw new Error("Report could not be created");
  }

  revalidatePath("/staff");
  redirect(`/report/${report.publicTrackingToken}`);
}

export async function updateIssueStatusAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const status = readRequiredText(formData, "status") as IssueStatus;
  const publicNote = String(formData.get("publicNote") ?? "").trim();

  if (!ISSUE_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  const report = getIssueReportById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }

  updateIssueStatus({ reportId, status, publicNote });
  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function addStaffNoteAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const body = readRequiredText(formData, "body");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  addStaffNote({ reportId, body });
  revalidatePath(`/staff/reports/${reportId}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function addReferralAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const agencyName = readRequiredText(formData, "agencyName");
  const referralMethod = readRequiredText(formData, "referralMethod");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  addReferral({
    reportId,
    agencyName,
    referralMethod,
    externalReference: String(formData.get("externalReference") ?? "").trim(),
    followUpDate: String(formData.get("followUpDate") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    publicNote: String(formData.get("publicNote") ?? "").trim(),
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}`);
}
