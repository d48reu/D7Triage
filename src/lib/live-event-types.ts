export const LIVE_EVENT_STATUSES = [
  "Not started",
  "In progress",
  "Done",
  "Cancelled",
] as const;

export const LIVE_EVENT_PRIORITIES = ["Low", "Medium", "High"] as const;

export const LIVE_EVENT_SUBTASK_STATUSES = [
  "Not started",
  "In progress",
  "Done",
] as const;

export const COMMISSIONER_ATTENDANCE_OPTIONS = [
  "Not decided",
  "Yes",
  "No",
] as const;

export type LiveEventStatus = (typeof LIVE_EVENT_STATUSES)[number];
export type LiveEventPriority = (typeof LIVE_EVENT_PRIORITIES)[number];
export type LiveEventSubtaskStatus =
  (typeof LIVE_EVENT_SUBTASK_STATUSES)[number];
export type CommissionerAttendance =
  (typeof COMMISSIONER_ATTENDANCE_OPTIONS)[number];

export type LiveEventCollaborator = {
  id: string;
  name: string;
};

export type LiveEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  status: LiveEventStatus;
  priority: LiveEventPriority;
  ownerStaffId: string;
  ownerName: string;
  collaborators: LiveEventCollaborator[];
  partnerNames: string;
  districtRole: string;
  commissionerAttending: CommissionerAttendance;
  pointOfContactName: string;
  pointOfContactEmail: string;
  pointOfContactPhone: string;
  subtaskCount: number;
  completedSubtaskCount: number;
  updateCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LiveEventUpdate = {
  id: string;
  eventId: string;
  body: string;
  authorStaffId: string | null;
  authorName: string;
  createdAt: string;
};

export type LiveEventSubtask = {
  id: string;
  eventId: string;
  title: string;
  status: LiveEventSubtaskStatus;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiveEventAttachment = {
  id: string;
  eventId: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export type LiveEventSummary = {
  eventCount: number;
  upcomingCount: number;
  inProgressCount: number;
  completedCount: number;
};

export type SaveLiveEventInput = {
  title: string;
  description: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  status: LiveEventStatus;
  priority: LiveEventPriority;
  ownerStaffId: string;
  collaboratorStaffIds: string[];
  partnerNames: string;
  districtRole: string;
  commissionerAttending: CommissionerAttendance;
  pointOfContactName: string;
  pointOfContactEmail: string;
  pointOfContactPhone: string;
};
