"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo-mode";
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
import {
  addAttachment,
  assignIssueReport,
  addIssueAuditEvents,
  addReferral,
  addStaffNote,
  createIssueReport,
  enforceReportSubmissionRateLimit,
  getAgencyById,
  getAiSuggestionById,
  getIssueReportById,
  getLatestAiSuggestion,
  listAttachments,
  listReferrals,
  markIssueAsDistinct,
  markIssueAsDuplicate,
  updateIssueLocationIntelligence,
  updateIssueDetails,
  updateAiSuggestionFeedback,
  updateReferralOutcome,
  updateIssueStatus,
} from "@/lib/issues-repository";

export type SubmitIssueReportState = {
  status: "idle" | "error";
  message: string;
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

function isRateLimitingEnabled() {
  const value = (process.env.REPORT_RATE_LIMIT_ENABLED || "true")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function getMaxPhotoCount() {
  return parsePositiveIntegerEnv(process.env.REPORT_MAX_PHOTOS, 4);
}

function getRateLimitWindowMinutes() {
  return parsePositiveIntegerEnv(process.env.REPORT_RATE_LIMIT_WINDOW_MINUTES, 60);
}

function getRateLimitMaxPerIp() {
  return parsePositiveIntegerEnv(process.env.REPORT_RATE_LIMIT_MAX_PER_IP, 12);
}

function getRateLimitMaxPerEmail() {
  return parsePositiveIntegerEnv(process.env.REPORT_RATE_LIMIT_MAX_PER_EMAIL, 4);
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

async function getClientIpAddress() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return headerStore.get("x-real-ip")?.trim() || null;
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
  const submittedCategory = String(formData.get("category") ?? "").trim();
  const category = resolveSubmittedCategory({
    category: submittedCategory,
    description,
    addressText,
  });
  const residentName = String(formData.get("residentName") ?? "").trim();
  const residentPhone = String(formData.get("residentPhone") ?? "").trim();
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

  if (isRateLimitingEnabled()) {
    const rateLimitResult = enforceReportSubmissionRateLimit({
      ipAddress: await getClientIpAddress(),
      residentEmail,
      windowMinutes: getRateLimitWindowMinutes(),
      maxPerIp: getRateLimitMaxPerIp(),
      maxPerEmail: getRateLimitMaxPerEmail(),
    });

    if (!rateLimitResult.allowed) {
      return {
        status: "error",
        message: rateLimitResult.message || "Report could not be submitted right now.",
      };
    }
  }

  if (isDemoMode()) {
    redirect("/report/demo-submission");
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

  if ((report.assignedStaffId ?? null) !== staffMemberId) {
    assignIssueReport({ reportId, staffMemberId });
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

  if (!report) {
    throw new Error("Report not found");
  }

  assignIssueReport({
    reportId,
    staffMemberId: String(formData.get("staffMemberId") ?? "").trim() || null,
  });

  revalidatePath("/staff");
  revalidatePath(`/staff/reports/${reportId}`);
  redirect(`/staff/reports/${reportId}?assignmentSaved=1`);
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
