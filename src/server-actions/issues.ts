"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo-mode";
import { hasStaffSession } from "@/lib/staff-auth";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
} from "@/lib/jurisdiction";
import type { IntakeBoardCase } from "@/lib/intake-board";
import {
  ISSUE_STATUSES,
  inferIssueCategoryFromText,
  isKnownIssueCategoryInput,
  normalizeIssueCategory,
  type IssueStatus,
} from "@/lib/issue-types";
import { generateAiRoutingSuggestion } from "@/lib/ai-routing";
import { getUploadsDir } from "@/lib/data-paths";
import { resolveReportLocationIntelligence } from "@/lib/report-location-intelligence";
import { sendStaffAssignmentNotification } from "@/lib/staff-assignment-notifications";
import {
  addAttachment,
  acknowledgeAssignment,
  assignIssueReport,
  addIssueAuditEvents,
  addReferral,
  addStaffNote,
  createIssueReport,
  getAgencyById,
  getAiSuggestionById,
  getIssueReportById,
  getJurisdictionConfig,
  getLatestAiSuggestion,
  getStaffMemberById,
  listAttachments,
  listReferrals,
  markIssueAsDistinct,
  markIssueAsDuplicate,
  updateIssueLocationIntelligence,
  updateIssueCreatedAt,
  updateIssueDetails,
  updateAiSuggestionFeedback,
  updateReferralOutcome,
  updateIssueStatus,
} from "@/lib/issues-repository";

export type CreateIntakeCaseState = {
  status: "idle" | "error" | "success";
  message: string;
  reportId?: string;
  publicTrackingToken?: string;
  createdAt?: string;
  attachmentCount?: number;
};

export type UpdateIntakeCaseState = {
  status: "idle" | "error" | "success";
  message: string;
  updatedCase?: IntakeBoardCase;
};

export type AddIntakeCaseAttachmentsState = {
  status: "error" | "success";
  message: string;
  attachmentCount?: number;
};

export type GenerateAiSuggestionState = {
  status: "idle" | "error" | "success";
  message: string;
  suggestion: {
    id: string;
    summary: string;
    suggestedCategory: string;
    suggestedUrgency: string;
    suggestedResponsibleParty: string;
    suggestedAgencyId: string | null;
    confidence: string;
    explanation: string;
    recommendedNextStep: string;
    missingInformation: string[];
    draftResponse: string;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    feedbackDisposition: "accepted" | "accepted_with_edits" | "rejected" | null;
    feedbackNote: string | null;
    feedbackCreatedAt: string | null;
    createdAt: string;
  } | null;
};

export type ReviewAiSuggestionState = {
  status: "idle" | "error" | "success";
  message: string;
  suggestion: GenerateAiSuggestionState["suggestion"];
};

const UPLOAD_DIR = getUploadsDir();
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_ADDRESS_LENGTH = 250;
const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_LANGUAGE_LENGTH = 60;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_PHOTO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function parsePositiveIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getMaxPhotoCount() {
  return parsePositiveIntegerEnv(process.env.REPORT_MAX_PHOTOS, 4);
}

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

function getFileExtension(fileName: string) {
  const extension = path.extname(fileName || "").toLowerCase();
  return extension || "";
}

function readOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeSuggestion(
  suggestion: NonNullable<ReturnType<typeof getLatestAiSuggestion>>,
): NonNullable<GenerateAiSuggestionState["suggestion"]> {
  return {
    id: suggestion.id,
    summary: suggestion.summary,
    suggestedCategory: suggestion.suggestedCategory,
    suggestedUrgency: suggestion.suggestedUrgency,
    suggestedResponsibleParty: suggestion.suggestedResponsibleParty,
    suggestedAgencyId: suggestion.suggestedAgencyId,
    confidence: suggestion.confidence,
    explanation: suggestion.explanation,
    recommendedNextStep: suggestion.recommendedNextStep,
    missingInformation: suggestion.missingInformation,
    draftResponse: suggestion.draftResponse,
    model: suggestion.model,
    inputTokens: suggestion.inputTokens,
    outputTokens: suggestion.outputTokens,
    totalTokens: suggestion.totalTokens,
    feedbackDisposition: suggestion.feedbackDisposition,
    feedbackNote: suggestion.feedbackNote,
    feedbackCreatedAt: suggestion.feedbackCreatedAt,
    createdAt: suggestion.createdAt,
  };
}

type CaseDetailAuditChange = {
  fieldName: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
};

function normalizeAuditText(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

function booleanAuditText(value: boolean) {
  return value ? "Yes" : "No";
}

function buildTextAuditChange(
  fieldName: string,
  fieldLabel: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
): CaseDetailAuditChange | null {
  const normalizedOldValue = normalizeAuditText(oldValue);
  const normalizedNewValue = normalizeAuditText(newValue);

  if (normalizedOldValue === normalizedNewValue) {
    return null;
  }

  return {
    fieldName,
    fieldLabel,
    oldValue: normalizedOldValue,
    newValue: normalizedNewValue,
  };
}

function buildBooleanAuditChange(
  fieldName: string,
  fieldLabel: string,
  oldValue: boolean,
  newValue: boolean,
): CaseDetailAuditChange | null {
  if (oldValue === newValue) {
    return null;
  }

  return {
    fieldName,
    fieldLabel,
    oldValue: booleanAuditText(oldValue),
    newValue: booleanAuditText(newValue),
  };
}

function resolveSubmittedCategory(input: {
  category: string;
  description: string;
  addressText: string;
}) {
  const normalizedCategory = normalizeIssueCategory(input.category);

  if (normalizedCategory === "Other / unsure" || normalizedCategory !== input.category) {
    return inferIssueCategoryFromText(input);
  }

  return normalizedCategory;
}

async function notifyAssignedStaff(input: {
  reportId: string;
  staffMemberId: string | null;
}) {
  if (!input.staffMemberId) return;

  const report = getIssueReportById(input.reportId);
  const staffMember = getStaffMemberById(input.staffMemberId);

  if (!report || !staffMember) {
    addStaffNote({
      reportId: input.reportId,
      body: "Assignment notification not sent: assigned case or staff member could not be found.",
    });
    return;
  }

  try {
    const result = await sendStaffAssignmentNotification({ report, staffMember });

    if (result.status === "sent") {
      addStaffNote({
        reportId: report.id,
        body: `Assignment notification sent to ${staffMember.name} <${result.recipient}>.${
          result.messageId ? ` Message ID: ${result.messageId}.` : ""
        }`,
      });
      return;
    }

    addStaffNote({
      reportId: report.id,
      body: `Assignment notification ${result.status}: ${result.reason}.`,
    });
  } catch (error) {
    addStaffNote({
      reportId: report.id,
      body: `Assignment notification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`,
    });
  }
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

export async function createStaffIntakeCaseAction(
  _previousState: CreateIntakeCaseState,
  formData: FormData,
): Promise<CreateIntakeCaseState> {
  if (!(await hasStaffSession())) {
    return {
      status: "error",
      message: "Your staff session expired. Sign in again before saving the case.",
    };
  }

  const description = String(formData.get("description") ?? "").trim();
  const addressText = String(formData.get("addressText") ?? "").trim();
  const residentEmail = String(formData.get("residentEmail") ?? "").trim();
  const submittedCategory = String(formData.get("category") ?? "").trim();
  const category = resolveSubmittedCategory({
    category: submittedCategory,
    description,
    addressText,
  });
  const residentName = String(formData.get("residentName") ?? "").trim();
  const residentPhone = String(formData.get("residentPhone") ?? "").trim();
  const createdDate = String(formData.get("createdDate") ?? "").trim();
  const submittedStatus = String(formData.get("status") ?? "").trim();
  const assignedStaffId =
    String(formData.get("assignedStaffId") ?? "").trim() || null;
  const assignedStaffMember = assignedStaffId
    ? getStaffMemberById(assignedStaffId)
    : null;
  const preferredLanguage =
    String(formData.get("preferredLanguage") ?? "").trim() || "English";
  const latitude = readOptionalNumber(formData, "latitude");
  const longitude = readOptionalNumber(formData, "longitude");
  const contactConsent = formData.get("contactConsent") === "on";
  const newsletterOptIn = formData.get("newsletterOptIn") === "on";
  const honeypot = String(formData.get("company") ?? "").trim();
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!submittedCategory || !description || !addressText || !residentEmail) {
    return {
      status: "error",
      message: "Category, description, location, and email are required.",
    };
  }

  const createdAt = parseStaffCreatedDate(createdDate);
  if (!createdAt) {
    return {
      status: "error",
      message: "Choose a valid case date.",
    };
  }

  if (!ISSUE_STATUSES.includes(submittedStatus as IssueStatus)) {
    return {
      status: "error",
      message: "Choose a valid case status.",
    };
  }

  if (
    assignedStaffId &&
    (!assignedStaffMember || !assignedStaffMember.isActive)
  ) {
    return {
      status: "error",
      message: "Choose an active staff member for the assignment.",
    };
  }

  if (!isKnownIssueCategoryInput(submittedCategory)) {
    return {
      status: "error",
      message: "Choose a valid category.",
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

  if (honeypot) {
    return {
      status: "error",
      message: "Report could not be submitted.",
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      status: "error",
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    };
  }

  if (addressText.length > MAX_ADDRESS_LENGTH) {
    return {
      status: "error",
      message: `Location or address must be ${MAX_ADDRESS_LENGTH} characters or fewer.`,
    };
  }

  if (residentName.length > MAX_NAME_LENGTH) {
    return {
      status: "error",
      message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  if (residentPhone.length > MAX_PHONE_LENGTH) {
    return {
      status: "error",
      message: `Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`,
    };
  }

  if (preferredLanguage.length > MAX_LANGUAGE_LENGTH) {
    return {
      status: "error",
      message: `Preferred language must be ${MAX_LANGUAGE_LENGTH} characters or fewer.`,
    };
  }

  if (photos.length > getMaxPhotoCount()) {
    return {
      status: "error",
      message: `You can attach up to ${getMaxPhotoCount()} photos per report.`,
    };
  }

  const invalidPhoto = photos.find(
    (photo) =>
      !ALLOWED_PHOTO_TYPES.has(photo.type) ||
      !ALLOWED_PHOTO_EXTENSIONS.has(getFileExtension(photo.name)) ||
      photo.size > MAX_PHOTO_SIZE_BYTES,
  );

  if (invalidPhoto) {
    return {
      status: "error",
      message:
        "Photos must be JPEG, PNG, WebP, or GIF files and each must be 8 MB or smaller.",
    };
  }

  if (isDemoMode()) {
    return {
      status: "error",
      message: "Case saving is disabled in the hosted demo.",
    };
  }

  const locationIntelligence = await resolveReportLocationIntelligence({
    addressText,
    latitude,
    longitude,
  });

  const report = createIssueReport({
    category,
    description,
    addressText,
    ...locationIntelligence,
    residentEmail,
    contactConsent,
    residentName,
    residentPhone,
    preferredLanguage,
    newsletterOptIn,
    createdAt,
    initialStatus: submittedStatus as IssueStatus,
  });

  if (!report) {
    return { status: "error", message: "Case could not be saved." };
  }

  await savePhotoAttachments(report.id, photos);
  if (assignedStaffId) {
    assignIssueReport({ reportId: report.id, staffMemberId: assignedStaffId });
    await notifyAssignedStaff({
      reportId: report.id,
      staffMemberId: assignedStaffId,
    });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/my");

  return {
    status: "success",
    message: "Case saved to the staff queue.",
    reportId: report.id,
    publicTrackingToken: report.publicTrackingToken,
    createdAt: report.createdAt,
    attachmentCount: listAttachments(report.id).length,
  };
}

function parseStaffCreatedDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const createdAt = new Date(`${value}T12:00:00.000Z`);
  if (
    !Number.isFinite(createdAt.getTime()) ||
    createdAt.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return createdAt.toISOString();
}

export async function updateStaffIntakeCaseAction(
  _previousState: UpdateIntakeCaseState,
  formData: FormData,
): Promise<UpdateIntakeCaseState> {
  if (!(await hasStaffSession())) {
    return {
      status: "error",
      message: "Your staff session expired. Sign in again before saving.",
    };
  }

  if (isDemoMode()) {
    return {
      status: "error",
      message: "Case editing is disabled in the hosted demo.",
    };
  }

  const reportId = String(formData.get("reportId") ?? "").trim();
  const report = reportId ? getIssueReportById(reportId) : null;
  if (!report) {
    return { status: "error", message: "Case not found." };
  }

  const submittedCategory = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const addressText = String(formData.get("addressText") ?? "").trim();
  const residentEmail = String(formData.get("residentEmail") ?? "").trim();
  const residentName = String(formData.get("residentName") ?? "").trim();
  const residentPhone = String(formData.get("residentPhone") ?? "").trim();
  const submittedStatus = String(formData.get("status") ?? "").trim();
  const submittedStaffMemberId =
    String(formData.get("assignedStaffId") ?? "").trim() || null;
  const submittedStaffMember = submittedStaffMemberId
    ? getStaffMemberById(submittedStaffMemberId)
    : null;
  const createdDate = String(formData.get("createdDate") ?? "").trim();
  const createdAt = parseStaffCreatedDate(createdDate);

  if (!submittedCategory || !description || !addressText || !residentEmail) {
    return {
      status: "error",
      message: "Category, summary, address, and email are required.",
    };
  }

  if (!isKnownIssueCategoryInput(submittedCategory)) {
    return { status: "error", message: "Choose a valid category." };
  }

  if (!ISSUE_STATUSES.includes(submittedStatus as IssueStatus)) {
    return { status: "error", message: "Choose a valid status." };
  }

  if (
    submittedStaffMemberId &&
    (!submittedStaffMember ||
      (!submittedStaffMember.isActive &&
        submittedStaffMemberId !== report.assignedStaffId))
  ) {
    return {
      status: "error",
      message: "Choose an active staff member for the assignment.",
    };
  }

  if (!createdAt) {
    return { status: "error", message: "Choose a valid case date." };
  }

  if (!residentEmail.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      status: "error",
      message: `Summary must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    };
  }

  if (addressText.length > MAX_ADDRESS_LENGTH) {
    return {
      status: "error",
      message: `Address must be ${MAX_ADDRESS_LENGTH} characters or fewer.`,
    };
  }

  if (residentName.length > MAX_NAME_LENGTH) {
    return {
      status: "error",
      message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  if (residentPhone.length > MAX_PHONE_LENGTH) {
    return {
      status: "error",
      message: `Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`,
    };
  }

  const category = resolveSubmittedCategory({
    category: submittedCategory,
    description,
    addressText,
  });
  const nextStatus = submittedStatus as IssueStatus;
  const currentStaffMember = report.assignedStaffId
    ? getStaffMemberById(report.assignedStaffId)
    : null;
  const assignmentChanged =
    (report.assignedStaffId ?? null) !== submittedStaffMemberId;
  const addressChanged = report.addressText !== addressText;
  const detailChanges = [
    buildTextAuditChange("createdAt", "Case date", report.createdAt.slice(0, 10), createdDate),
    buildTextAuditChange("status", "Status", report.status, nextStatus),
    buildTextAuditChange("category", "Category", report.category, category),
    buildTextAuditChange("description", "Summary", report.description, description),
    buildTextAuditChange("addressText", "Address", report.addressText, addressText),
    buildTextAuditChange("residentName", "Constituent", report.residentName, residentName),
    buildTextAuditChange("residentEmail", "Email", report.residentEmail, residentEmail),
    buildTextAuditChange("residentPhone", "Phone", report.residentPhone, residentPhone),
    buildTextAuditChange(
      "assignedStaffId",
      "Assignment",
      currentStaffMember?.name ?? "Unassigned",
      submittedStaffMember?.name ?? "Unassigned",
    ),
  ].filter((change): change is CaseDetailAuditChange => Boolean(change));

  updateIssueDetails({
    reportId,
    category,
    description,
    addressText,
    residentName,
    residentEmail,
    residentPhone,
    preferredLanguage: report.preferredLanguage,
    contactConsent: report.contactConsent,
    newsletterOptIn: report.newsletterOptIn,
  });

  if (report.createdAt.slice(0, 10) !== createdDate) {
    updateIssueCreatedAt({ reportId, createdAt });
  }

  if (addressChanged) {
    const locationIntelligence = await resolveReportLocationIntelligence({
      addressText,
      latitude: null,
      longitude: null,
    });
    updateIssueLocationIntelligence({
      reportId,
      ...locationIntelligence,
    });
  }

  if (report.status !== nextStatus) {
    updateIssueStatus({ reportId, status: nextStatus });
  }

  if (assignmentChanged) {
    assignIssueReport({
      reportId,
      staffMemberId: submittedStaffMemberId,
    });
    if (submittedStaffMemberId) {
      await notifyAssignedStaff({
        reportId,
        staffMemberId: submittedStaffMemberId,
      });
    }
  }

  if (detailChanges.length > 0) {
    addIssueAuditEvents({
      reportId,
      actorLabel: "Staff intake board",
      changes: detailChanges,
    });
    addStaffNote({
      reportId,
      body: `Case updated from the intake board. Updated fields: ${detailChanges
        .map((change) => change.fieldLabel.toLowerCase())
        .join(", ")}.`,
    });
  }

  const updatedReport = getIssueReportById(reportId);
  if (!updatedReport) {
    return { status: "error", message: "Case could not be reloaded after saving." };
  }

  revalidatePath("/staff");
  revalidatePath("/staff/my");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${updatedReport.publicTrackingToken}`);

  return {
    status: "success",
    message:
      detailChanges.length > 0 ? "Changes saved." : "No changes to save.",
    updatedCase: {
      id: updatedReport.id,
      publicTrackingToken: updatedReport.publicTrackingToken,
      status: updatedReport.status,
      assignedStaffId: updatedReport.assignedStaffId,
      category: updatedReport.category,
      description: updatedReport.description,
      addressText: updatedReport.addressText,
      residentName: updatedReport.residentName ?? "",
      residentEmail: updatedReport.residentEmail,
      residentPhone: updatedReport.residentPhone ?? "",
      createdAt: updatedReport.createdAt,
      districtLabel: formatDistrictHintStatus(
        analyzeReportJurisdiction(
          updatedReport,
          getJurisdictionConfig(),
        ).districtHintStatus,
      ),
      attachmentCount: listAttachments(reportId).length,
    },
  };
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

export async function saveQuickTriageAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const status = readRequiredText(formData, "status") as IssueStatus;
  const staffMemberId =
    String(formData.get("staffMemberId") ?? "").trim() || null;
  const publicNote = String(formData.get("publicNote") ?? "").trim();
  const internalNote = String(formData.get("internalNote") ?? "").trim();

  if (!ISSUE_STATUSES.includes(status)) {
    throw new Error("Invalid status");
  }

  const report = getIssueReportById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }

  const assignmentChanged = (report.assignedStaffId ?? null) !== staffMemberId;
  if (assignmentChanged) {
    assignIssueReport({ reportId, staffMemberId });
    await notifyAssignedStaff({ reportId, staffMemberId });
  }

  if (report.status !== status || publicNote) {
    updateIssueStatus({ reportId, status, publicNote });
  }

  if (internalNote) {
    addStaffNote({ reportId, body: internalNote });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}?triageSaved=1`);
}

export async function addIssuePhotosAction(formData: FormData) {
  if (!(await hasStaffSession())) {
    throw new Error("Your staff session expired. Sign in again before uploading.");
  }

  const reportId = readRequiredText(formData, "reportId");
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  if (photos.length === 0) {
    throw new Error("Choose at least one photo to upload.");
  }

  if (listAttachments(reportId).length + photos.length > getMaxPhotoCount()) {
    throw new Error(`Each report can have up to ${getMaxPhotoCount()} photos.`);
  }

  const invalidPhoto = photos.find(
    (photo) =>
      !ALLOWED_PHOTO_TYPES.has(photo.type) ||
      !ALLOWED_PHOTO_EXTENSIONS.has(getFileExtension(photo.name)) ||
      photo.size > MAX_PHOTO_SIZE_BYTES,
  );

  if (invalidPhoto) {
    throw new Error(
      "Photos must be JPEG, PNG, WebP, or GIF files and each must be 8 MB or smaller.",
    );
  }

  await savePhotoAttachments(reportId, photos);
  addStaffNote({
    reportId,
    body: `${photos.length} staff photo${photos.length === 1 ? "" : "s"} attached.`,
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  redirect(`/staff/reports/${reportId}?photoSaved=1`);
}

export async function addStaffIntakeCaseAttachmentsAction(
  formData: FormData,
): Promise<AddIntakeCaseAttachmentsState> {
  if (!(await hasStaffSession())) {
    return {
      status: "error",
      message: "Your staff session expired. Sign in again before uploading.",
    };
  }

  if (isDemoMode()) {
    return {
      status: "error",
      message: "File uploads are disabled in demo mode.",
    };
  }

  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) {
    return { status: "error", message: "Case could not be identified." };
  }

  const report = getIssueReportById(reportId);
  if (!report) {
    return { status: "error", message: "Case could not be found." };
  }

  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (photos.length === 0) {
    return { status: "error", message: "Choose at least one file to upload." };
  }

  const currentAttachmentCount = listAttachments(reportId).length;
  if (currentAttachmentCount + photos.length > getMaxPhotoCount()) {
    return {
      status: "error",
      message: `Each case can have up to ${getMaxPhotoCount()} files.`,
    };
  }

  const invalidPhoto = photos.find(
    (photo) =>
      !ALLOWED_PHOTO_TYPES.has(photo.type) ||
      !ALLOWED_PHOTO_EXTENSIONS.has(getFileExtension(photo.name)) ||
      photo.size > MAX_PHOTO_SIZE_BYTES,
  );

  if (invalidPhoto) {
    return {
      status: "error",
      message:
        "Files must be JPEG, PNG, WebP, or GIF images and each must be 8 MB or smaller.",
    };
  }

  await savePhotoAttachments(reportId, photos);
  addStaffNote({
    reportId,
    body: `${photos.length} staff photo${photos.length === 1 ? "" : "s"} attached from the intake board.`,
  });

  const attachmentCount = listAttachments(reportId).length;
  revalidatePath("/report");
  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);

  return {
    status: "success",
    message: `${photos.length} file${photos.length === 1 ? "" : "s"} added.`,
    attachmentCount,
  };
}

export async function updateIssueDetailsAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  const submittedCategory = readRequiredText(formData, "category");
  const description = readRequiredText(formData, "description");
  const addressText = readRequiredText(formData, "addressText");
  const category = resolveSubmittedCategory({
    category: submittedCategory,
    description,
    addressText,
  });
  const residentEmail = readRequiredText(formData, "residentEmail");
  const residentName = String(formData.get("residentName") ?? "").trim();
  const residentPhone = String(formData.get("residentPhone") ?? "").trim();
  const preferredLanguage =
    String(formData.get("preferredLanguage") ?? "").trim() || "English";
  const contactConsent = formData.get("contactConsent") === "on";
  const newsletterOptIn = formData.get("newsletterOptIn") === "on";

  if (
    submittedCategory !== report.category &&
    !isKnownIssueCategoryInput(submittedCategory)
  ) {
    throw new Error("Invalid category");
  }

  if (!residentEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
  }

  if (addressText.length > MAX_ADDRESS_LENGTH) {
    throw new Error(`Location or address must be ${MAX_ADDRESS_LENGTH} characters or fewer.`);
  }

  if (residentName.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }

  if (residentPhone.length > MAX_PHONE_LENGTH) {
    throw new Error(`Phone must be ${MAX_PHONE_LENGTH} characters or fewer.`);
  }

  if (preferredLanguage.length > MAX_LANGUAGE_LENGTH) {
    throw new Error(`Preferred language must be ${MAX_LANGUAGE_LENGTH} characters or fewer.`);
  }

  const detailChanges = [
    buildTextAuditChange("category", "Category", report.category, category),
    buildTextAuditChange("description", "Description", report.description, description),
    buildTextAuditChange("addressText", "Location/address", report.addressText, addressText),
    buildTextAuditChange("residentName", "Resident name", report.residentName, residentName),
    buildTextAuditChange("residentEmail", "Resident email", report.residentEmail, residentEmail),
    buildTextAuditChange("residentPhone", "Resident phone", report.residentPhone, residentPhone),
    buildTextAuditChange(
      "preferredLanguage",
      "Preferred language",
      report.preferredLanguage,
      preferredLanguage,
    ),
    buildBooleanAuditChange(
      "contactConsent",
      "Case update consent",
      report.contactConsent,
      contactConsent,
    ),
    buildBooleanAuditChange(
      "newsletterOptIn",
      "Newsletter consent",
      report.newsletterOptIn,
      newsletterOptIn,
    ),
  ].filter((change): change is CaseDetailAuditChange => Boolean(change));
  const changedFields = detailChanges.map((change) => change.fieldLabel.toLowerCase());
  const addressChanged = report.addressText !== addressText;

  updateIssueDetails({
    reportId,
    category,
    description,
    addressText,
    residentName,
    residentEmail,
    residentPhone,
    preferredLanguage,
    contactConsent,
    newsletterOptIn,
  });

  if (addressChanged) {
    const locationIntelligence = await resolveReportLocationIntelligence({
      addressText,
      latitude: null,
      longitude: null,
    });

    updateIssueLocationIntelligence({
      reportId,
      ...locationIntelligence,
    });
  }

  if (changedFields.length > 0) {
    addIssueAuditEvents({
      reportId,
      actorLabel: "Staff",
      changes: detailChanges,
    });

    addStaffNote({
      reportId,
      body: `Case details edited by staff. Updated fields: ${changedFields.join(", ")}.${
        addressChanged ? " Location intelligence was refreshed from the edited address." : ""
      }`,
    });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}?detailsSaved=1`);
}

export async function assignIssueReportAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const report = getIssueReportById(reportId);
  const staffMemberId =
    String(formData.get("staffMemberId") ?? "").trim() || null;

  if (!report) {
    throw new Error("Report not found");
  }

  const assignmentChanged = (report.assignedStaffId ?? null) !== staffMemberId;
  assignIssueReport({ reportId, staffMemberId });

  if (assignmentChanged) {
    await notifyAssignedStaff({ reportId, staffMemberId });
  }

  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  redirect(`/staff/reports/${reportId}?assignmentSaved=1`);
}

export async function acknowledgeAssignmentAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const staffMemberId = readRequiredText(formData, "staffMemberId");
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const report = getIssueReportById(reportId);
  const staffMember = getStaffMemberById(staffMemberId);

  if (!report) {
    throw new Error("Report not found");
  }

  if (!staffMember || report.assignedStaffId !== staffMember.id) {
    throw new Error("Only the assigned staff member can acknowledge this case.");
  }

  const acknowledgment = acknowledgeAssignment({ reportId, staffMemberId });
  if (acknowledgment) {
    addStaffNote({
      reportId,
      body: `Assignment acknowledged by ${staffMember.name}.`,
    });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/my");
  revalidatePath(`/staff/reports/${reportId}`);

  const safeReturnTo = returnTo.startsWith("/staff") ? returnTo : `/staff/reports/${reportId}`;
  redirect(`${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}acknowledged=1`);
}

export async function refreshLocationIntelligenceAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  const locationIntelligence = await resolveReportLocationIntelligence({
    addressText: report.addressText,
    latitude: report.latitude,
    longitude: report.longitude,
  });

  updateIssueLocationIntelligence({
    reportId,
    ...locationIntelligence,
  });

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
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
    outcomeStatus: String(formData.get("outcomeStatus") ?? "").trim() || "sent",
    externalReference: String(formData.get("externalReference") ?? "").trim(),
    followUpDate: String(formData.get("followUpDate") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    outcomeNote: String(formData.get("outcomeNote") ?? "").trim(),
    publicNote: String(formData.get("publicNote") ?? "").trim(),
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function updateReferralOutcomeAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const referralId = readRequiredText(formData, "referralId");
  const outcomeStatus = readRequiredText(formData, "outcomeStatus");
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  const referral = listReferrals(reportId).find((item) => item.id === referralId);
  if (!referral) {
    throw new Error("Referral not found");
  }

  updateReferralOutcome({
    referralId,
    outcomeStatus,
    followUpDate: String(formData.get("followUpDate") ?? "").trim(),
    outcomeNote: String(formData.get("outcomeNote") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function markDuplicateAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const masterReportId = readRequiredText(formData, "masterReportId");
  const note = String(formData.get("note") ?? "").trim();
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  markIssueAsDuplicate({
    reportId,
    masterReportId,
    note,
  });

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/staff/reports/${masterReportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function markDistinctAction(formData: FormData) {
  const reportId = readRequiredText(formData, "reportId");
  const note = String(formData.get("note") ?? "").trim();
  const report = getIssueReportById(reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  markIssueAsDistinct({
    reportId,
    note,
  });

  if (report.duplicateOfReportId) {
    revalidatePath(`/staff/reports/${report.duplicateOfReportId}`);
  }

  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
  revalidatePath(`/staff/reports/${reportId}`);
  revalidatePath(`/report/${report.publicTrackingToken}`);
  redirect(`/staff/reports/${reportId}`);
}

export async function generateAiRoutingSuggestionAction(
  _previousState: GenerateAiSuggestionState,
  formData: FormData,
): Promise<GenerateAiSuggestionState> {
  const reportId = readRequiredText(formData, "reportId");

  try {
    const suggestion = await generateAiRoutingSuggestion(reportId);

    if (!suggestion) {
      return {
        status: "error",
        message: "The suggestion could not be saved.",
        suggestion: null,
      };
    }

    revalidatePath(`/staff/reports/${reportId}`);

    return {
      status: "success",
      message: "AI routing suggestion generated.",
      suggestion: serializeSuggestion(suggestion),
    };
  } catch (error) {
    const latestSuggestion = getLatestAiSuggestion(reportId);
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "AI routing suggestion failed.",
      suggestion: latestSuggestion ? serializeSuggestion(latestSuggestion) : null,
    };
  }
}

export async function reviewAiSuggestionAction(
  _previousState: ReviewAiSuggestionState,
  formData: FormData,
): Promise<ReviewAiSuggestionState> {
  const suggestionId = readRequiredText(formData, "suggestionId");
  const reportId = readRequiredText(formData, "reportId");
  const feedbackDisposition = readRequiredText(
    formData,
    "feedbackDisposition",
  ) as "accepted" | "accepted_with_edits" | "rejected";

  if (!["accepted", "accepted_with_edits", "rejected"].includes(feedbackDisposition)) {
    return {
      status: "error",
      message: "Choose a valid feedback option.",
      suggestion: getLatestAiSuggestion(reportId)
        ? serializeSuggestion(getLatestAiSuggestion(reportId)!)
        : null,
    };
  }

  const suggestion = getAiSuggestionById(suggestionId);
  if (!suggestion || suggestion.reportId !== reportId) {
    return {
      status: "error",
      message: "Suggestion not found.",
      suggestion: getLatestAiSuggestion(reportId)
        ? serializeSuggestion(getLatestAiSuggestion(reportId)!)
        : null,
    };
  }

  const updatedSuggestion = updateAiSuggestionFeedback({
    suggestionId,
    feedbackDisposition,
    feedbackNote: String(formData.get("feedbackNote") ?? "").trim(),
  });

  revalidatePath(`/staff/reports/${reportId}`);

  return {
    status: "success",
    message: "AI feedback saved.",
    suggestion: updatedSuggestion ? serializeSuggestion(updatedSuggestion) : null,
  };
}
