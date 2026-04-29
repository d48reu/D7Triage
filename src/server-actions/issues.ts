"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/issue-types";
import { generateAiRoutingSuggestion } from "@/lib/ai-routing";
import {
  addAttachment,
  addReferral,
  addStaffNote,
  createIssueReport,
  getAgencyById,
  getAiSuggestionById,
  getIssueReportById,
  getLatestAiSuggestion,
  updateAiSuggestionFeedback,
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
