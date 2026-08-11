"use server";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEventUploadsDir } from "@/lib/data-paths";
import { isDemoMode } from "@/lib/demo-mode";
import { getStaffMemberById } from "@/lib/issues-repository";
import {
  addLiveEventAttachment,
  addLiveEventSubtask,
  addLiveEventUpdate,
  COMMISSIONER_ATTENDANCE_OPTIONS,
  createLiveEvent,
  getLiveEventById,
  LIVE_EVENT_PRIORITIES,
  LIVE_EVENT_STATUSES,
  LIVE_EVENT_SUBTASK_STATUSES,
  listLiveEventAttachments,
  updateLiveEvent,
  updateLiveEventSubtask,
  type CommissionerAttendance,
  type LiveEventPriority,
  type LiveEventStatus,
  type LiveEventSubtaskStatus,
  type SaveLiveEventInput,
} from "@/lib/live-events-repository";
import {
  getStaffActionActor,
  requireStaffActionActor,
} from "@/lib/staff-action-auth";

export type EventActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const EVENT_UPLOAD_DIR = getEventUploadsDir();
const MAX_EVENT_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_EVENT_FILE_COUNT = 20;
const ALLOWED_EVENT_FILE_EXTENSIONS = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".gif",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".xls",
  ".xlsx",
]);
const ALLOWED_EVENT_FILE_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
]);

export async function createLiveEventAction(
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getStaffActionActor())) {
    return sessionExpiredState();
  }

  let event: ReturnType<typeof createLiveEvent>;
  try {
    event = createLiveEvent(parseEventInput(formData));
  } catch (error) {
    return errorState(error);
  }

  revalidateEventPaths(event.id);
  redirect(`/staff/events/${event.id}?created=1`);
}

export async function updateLiveEventAction(
  eventId: string,
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getStaffActionActor())) {
    return sessionExpiredState();
  }

  try {
    if (!getLiveEventById(eventId)) {
      return { status: "error", message: "Event could not be found." };
    }

    updateLiveEvent(eventId, parseEventInput(formData));
  } catch (error) {
    return errorState(error);
  }

  revalidateEventPaths(eventId);
  redirect(`/staff/events/${eventId}?saved=1`);
}

export async function addLiveEventUpdateAction(
  eventId: string,
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getStaffActionActor())) {
    return sessionExpiredState();
  }

  try {
    const event = getLiveEventById(eventId);
    if (!event) {
      return { status: "error", message: "Event could not be found." };
    }

    const body = readText(formData, "body", "Update", 4000, true);
    const authorStaffId =
      readText(formData, "authorStaffId", "Update author", 100, true) ||
      event.ownerStaffId;
    requireActiveStaffMember(authorStaffId, "Update author");

    addLiveEventUpdate({
      eventId,
      body,
      authorStaffId,
    });
  } catch (error) {
    return errorState(error);
  }

  revalidateEventPaths(eventId);
  redirect(`/staff/events/${eventId}?updateAdded=1`);
}

export async function addLiveEventSubtaskAction(
  eventId: string,
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getStaffActionActor())) {
    return sessionExpiredState();
  }

  try {
    if (!getLiveEventById(eventId)) {
      return { status: "error", message: "Event could not be found." };
    }

    const title = readText(formData, "title", "Task", 240, true);
    const status = readSubtaskStatus(formData);
    const assignedStaffId =
      readText(formData, "assignedStaffId", "Assigned staff", 100) || null;
    const dueDate = readDate(formData, "dueDate", "Due date");
    if (assignedStaffId) {
      requireActiveStaffMember(assignedStaffId, "Assigned staff");
    }

    addLiveEventSubtask({
      eventId,
      title,
      status,
      assignedStaffId,
      dueDate,
    });
  } catch (error) {
    return errorState(error);
  }

  revalidateEventPaths(eventId);
  redirect(`/staff/events/${eventId}?subtaskAdded=1`);
}

export async function updateLiveEventSubtaskAction(
  eventId: string,
  subtaskId: string,
  formData: FormData,
) {
  await requireStaffActionActor();

  const status = readSubtaskStatus(formData);
  const assignedStaffId =
    readText(formData, "assignedStaffId", "Assigned staff", 100) || null;
  const dueDate = readDate(formData, "dueDate", "Due date");
  if (assignedStaffId) {
    requireActiveStaffMember(assignedStaffId, "Assigned staff");
  }

  const updated = updateLiveEventSubtask({
    eventId,
    subtaskId,
    status,
    assignedStaffId,
    dueDate,
  });
  if (!updated) {
    throw new Error("Event task could not be found.");
  }

  revalidateEventPaths(eventId);
  redirect(`/staff/events/${eventId}?subtaskSaved=1`);
}

export async function addLiveEventAttachmentsAction(
  eventId: string,
  _previousState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getStaffActionActor())) {
    return sessionExpiredState();
  }

  if (isDemoMode()) {
    return {
      status: "error",
      message: "File uploads are disabled in demo mode.",
    };
  }

  let uploadedFileCount = 0;
  try {
    if (!getLiveEventById(eventId)) {
      return { status: "error", message: "Event could not be found." };
    }

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return { status: "error", message: "Choose at least one file." };
    }

    if (
      listLiveEventAttachments(eventId).length + files.length >
      MAX_EVENT_FILE_COUNT
    ) {
      return {
        status: "error",
        message: `Each event can have up to ${MAX_EVENT_FILE_COUNT} files.`,
      };
    }

    for (const file of files) {
      validateEventFile(file);
    }

    const eventUploadDir = path.join(EVENT_UPLOAD_DIR, eventId);
    await fs.mkdir(eventUploadDir, { recursive: true });

    for (const file of files) {
      const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const storagePath = path.join(eventUploadDir, storedFileName);
      await fs.writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
      addLiveEventAttachment({
        eventId,
        fileName: file.name,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }
    uploadedFileCount = files.length;
  } catch (error) {
    return errorState(error);
  }

  revalidateEventPaths(eventId);
  redirect(`/staff/events/${eventId}?filesAdded=${uploadedFileCount}`);
}

function parseEventInput(formData: FormData): SaveLiveEventInput {
  const title = readText(formData, "title", "Event name", 240, true);
  const description = readText(
    formData,
    "description",
    "Description",
    5000,
  );
  const location = readText(formData, "location", "Location", 300);
  const startDate = readDate(formData, "startDate", "Start date");
  const endDate = readDate(formData, "endDate", "End date");
  if (endDate && !startDate) {
    throw new Error("Add a start date before adding an end date.");
  }
  if (startDate && endDate && endDate < startDate) {
    throw new Error("The end date cannot be earlier than the start date.");
  }

  const statusValue = readText(formData, "status", "Status", 50, true);
  if (!LIVE_EVENT_STATUSES.includes(statusValue as LiveEventStatus)) {
    throw new Error("Choose a valid event status.");
  }

  const priorityValue = readText(
    formData,
    "priority",
    "Priority",
    50,
    true,
  );
  if (!LIVE_EVENT_PRIORITIES.includes(priorityValue as LiveEventPriority)) {
    throw new Error("Choose a valid priority.");
  }

  const ownerStaffId = readText(
    formData,
    "ownerStaffId",
    "Owner",
    100,
    true,
  );
  requireActiveStaffMember(ownerStaffId, "Owner");

  const collaboratorStaffIds = Array.from(
    new Set(
      formData
        .getAll("collaboratorStaffIds")
        .map((value) => String(value).trim())
        .filter((value) => value && value !== ownerStaffId),
    ),
  );
  for (const collaboratorStaffId of collaboratorStaffIds) {
    requireActiveStaffMember(collaboratorStaffId, "Collaborator");
  }

  const commissionerValue = readText(
    formData,
    "commissionerAttending",
    "Commissioner attendance",
    50,
    true,
  );
  if (
    !COMMISSIONER_ATTENDANCE_OPTIONS.includes(
      commissionerValue as CommissionerAttendance,
    )
  ) {
    throw new Error("Choose a valid commissioner attendance option.");
  }

  const pointOfContactEmail = readText(
    formData,
    "pointOfContactEmail",
    "POC email",
    200,
  );
  if (
    pointOfContactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pointOfContactEmail)
  ) {
    throw new Error("Enter a valid POC email address.");
  }

  return {
    title,
    description,
    location,
    startDate,
    endDate,
    status: statusValue as LiveEventStatus,
    priority: priorityValue as LiveEventPriority,
    ownerStaffId,
    collaboratorStaffIds,
    partnerNames: readText(formData, "partnerNames", "Partners", 1000),
    districtRole: readText(formData, "districtRole", "District 7 role", 1000),
    commissionerAttending: commissionerValue as CommissionerAttendance,
    pointOfContactName: readText(
      formData,
      "pointOfContactName",
      "POC name",
      200,
    ),
    pointOfContactEmail,
    pointOfContactPhone: readText(
      formData,
      "pointOfContactPhone",
      "POC phone",
      80,
    ),
  };
}

function readText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number,
  required = false,
) {
  const value = String(formData.get(key) ?? "").trim();
  if (required && !value) {
    throw new Error(`${label} is required.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value;
}

function readDate(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function readSubtaskStatus(formData: FormData) {
  const value = readText(formData, "status", "Task status", 50, true);
  if (
    !LIVE_EVENT_SUBTASK_STATUSES.includes(value as LiveEventSubtaskStatus)
  ) {
    throw new Error("Choose a valid task status.");
  }
  return value as LiveEventSubtaskStatus;
}

function requireActiveStaffMember(staffMemberId: string, label: string) {
  const staffMember = getStaffMemberById(staffMemberId);
  if (!staffMember || !staffMember.isActive) {
    throw new Error(`${label} could not be found.`);
  }
  return staffMember;
}

function validateEventFile(file: File) {
  const extension = path.extname(file.name || "").toLowerCase();
  const validExtension = ALLOWED_EVENT_FILE_EXTENSIONS.has(extension);
  const validType =
    !file.type || ALLOWED_EVENT_FILE_TYPES.has(file.type.toLowerCase());

  if (
    !file.name ||
    !validExtension ||
    !validType ||
    file.size > MAX_EVENT_FILE_SIZE_BYTES
  ) {
    throw new Error(
      "Event files must be images, PDFs, Word, Excel, or CSV files and each must be 15 MB or smaller.",
    );
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function revalidateEventPaths(eventId: string) {
  revalidatePath("/staff/events");
  revalidatePath(`/staff/events/${eventId}`);
  revalidatePath("/staff/analytics");
}

function sessionExpiredState(): EventActionState {
  return {
    status: "error",
    message: "Your staff session expired. Sign in again before saving.",
  };
}

function errorState(error: unknown): EventActionState {
  return {
    status: "error",
    message: error instanceof Error ? error.message : "The event could not be saved.",
  };
}
