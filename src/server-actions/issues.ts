"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/issue-types";
import {
  addAttachment,
  addReferral,
  addStaffNote,
  createIssueReport,
  getAgencyById,
  getIssueReportById,
  updateIssueStatus,
} from "@/lib/issues-repository";

export type SubmitIssueReportState = {
  status: "idle" | "error";
  message: string;
};

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function savePhotoAttachments(reportId: string, photos: File[]) {
  if (photos.length === 0) return;

  const reportUploadDir = path.join(UPLOAD_DIR, reportId);
  await fs.mkdir(reportUploadDir, { recursive: true });

  for (const photo of photos) {
    if (!photo.name || photo.size === 0) continue;

    const fileName = `${Date.now()}-${sanitizeFileName(photo.name)}`;
    const storagePath = path.join(reportUploadDir, fileName);
    await fs.writeFile(storagePath, Buffer.from(await photo.arrayBuffer()));

    addAttachment({
      reportId,
      fileName: photo.name,
      storagePath,
      mimeType: photo.type,
      sizeBytes: photo.size,
    });
  }
}

export async function submitIssueReportAction(
  _previousState: SubmitIssueReportState,
  formData: FormData,
): Promise<SubmitIssueReportState> {
  const description = String(formData.get("description") ?? "").trim();
  const addressText = String(formData.get("addressText") ?? "").trim();
  const residentEmail = String(formData.get("residentEmail") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const contactConsent = formData.get("contactConsent") === "on";
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!category || !description || !addressText || !residentEmail) {
    return {
      status: "error",
      message: "Category, description, location, and email are required.",
    };
  }

  if (!residentEmail.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (!contactConsent) {
    return {
      status: "error",
      message: "Email update consent is required for this local MVP.",
    };
  }

  const invalidPhoto = photos.find(
    (photo) =>
      !ALLOWED_PHOTO_TYPES.has(photo.type) || photo.size > MAX_PHOTO_SIZE_BYTES,
  );

  if (invalidPhoto) {
    return {
      status: "error",
      message:
        "Photos must be JPEG, PNG, WebP, or GIF files and each must be 8 MB or smaller.",
    };
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
    return { status: "error", message: "Report could not be created." };
  }

  await savePhotoAttachments(report.id, photos);

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
  const agencyId = String(formData.get("agencyId") ?? "").trim();
  const manualAgencyName = String(formData.get("agencyName") ?? "").trim();
  const referralMethod = readRequiredText(formData, "referralMethod");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  const agency = agencyId ? getAgencyById(agencyId) : null;
  const agencyName = agency?.name || manualAgencyName;

  if (!agencyName) {
    throw new Error("Responsible party is required");
  }

  addReferral({
    reportId,
    agencyId: agency?.id,
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
