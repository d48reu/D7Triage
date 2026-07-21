import { normalizeIssueCategory, type IssueStatus } from "@/lib/issue-types";
import type { JurisdictionAssessment } from "@/lib/jurisdiction";
import type { AiSuggestion, IssueReport, Referral } from "@/lib/issues-repository";

export type StaffInboxFilter =
  | "active"
  | "all"
  | "received"
  | "unassigned"
  | "needs_review"
  | "routed"
  | "awaiting_agency"
  | "needs_more_info"
  | "follow_up_due"
  | "recently_updated"
  | "resolved_closed";

export type StaffInboxRow = {
  report: IssueReport;
  jurisdiction: JurisdictionAssessment;
  referrals: Referral[];
  aiSuggestions: AiSuggestion[];
  flags: string[];
  searchableText: string;
};

const CLOSED_STATUSES = new Set<IssueStatus>([
  "resolved",
  "closed_outside_jurisdiction",
  "closed_duplicate",
]);

const ACTIVE_STATUSES = new Set<IssueStatus>([
  "received",
  "needs_review",
  "routed",
  "awaiting_agency",
  "needs_more_info",
  "follow_up_due",
]);

export function getStaffInboxFilterOptions(rows: StaffInboxRow[]) {
  const count = (predicate: (row: StaffInboxRow) => boolean) =>
    rows.filter(predicate).length;

  return [
    {
      key: "active" as const,
      label: "Active",
      count: count((row) => ACTIVE_STATUSES.has(row.report.status)),
    },
    {
      key: "received" as const,
      label: "Received",
      count: count((row) => row.report.status === "received"),
    },
    {
      key: "unassigned" as const,
      label: "Unassigned",
      count: count(
        (row) =>
          !row.report.assignedStaffId && !CLOSED_STATUSES.has(row.report.status),
      ),
    },
    {
      key: "needs_review" as const,
      label: "Needs review",
      count: count((row) => row.report.status === "needs_review"),
    },
    {
      key: "routed" as const,
      label: "Routed",
      count: count((row) => row.report.status === "routed"),
    },
    {
      key: "awaiting_agency" as const,
      label: "Awaiting agency",
      count: count((row) => row.report.status === "awaiting_agency"),
    },
    {
      key: "needs_more_info" as const,
      label: "Needs info",
      count: count((row) => row.report.status === "needs_more_info"),
    },
    {
      key: "follow_up_due" as const,
      label: "Follow-up due",
      count: count((row) => row.report.status === "follow_up_due"),
    },
    {
      key: "recently_updated" as const,
      label: "Recently updated",
      count: count((row) => {
        const updatedAt = new Date(row.report.updatedAt);
        const updatedWithinTwoDays =
          Date.now() - updatedAt.getTime() <= 2 * 24 * 60 * 60 * 1000;
        return Number.isFinite(updatedAt.getTime()) && updatedWithinTwoDays;
      }),
    },
    {
      key: "resolved_closed" as const,
      label: "Resolved/closed",
      count: count((row) => CLOSED_STATUSES.has(row.report.status)),
    },
    {
      key: "all" as const,
      label: "All",
      count: rows.length,
    },
  ];
}

export function normalizeStaffInboxFilter(value: string | undefined): StaffInboxFilter {
  switch (value) {
    case "all":
    case "received":
    case "unassigned":
    case "needs_review":
    case "routed":
    case "awaiting_agency":
    case "needs_more_info":
    case "follow_up_due":
    case "recently_updated":
    case "resolved_closed":
      return value;
    default:
      return "active";
  }
}

export function buildStaffInboxFlags(input: {
  report: IssueReport;
  jurisdiction: JurisdictionAssessment;
  referrals: Referral[];
  aiSuggestions: AiSuggestion[];
  now?: Date;
}) {
  const flags: string[] = [];
  const now = input.now ?? new Date();
  const createdAt = new Date(input.report.createdAt);
  const ageMs = now.getTime() - createdAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const normalizedCategory = normalizeIssueCategory(input.report.category);
  const descriptionText = input.report.description.toLowerCase();

  if (input.report.status === "received" && ageDays >= 1) {
    flags.push("Needs first triage");
  }

  if (!input.report.assignedStaffId && !CLOSED_STATUSES.has(input.report.status)) {
    flags.push("Unassigned");
  }

  if (
    input.jurisdiction.districtHintStatus === "unclear" ||
    input.report.geocodingStatus === "failed"
  ) {
    flags.push("Check location");
  }

  if (input.aiSuggestions.some((suggestion) => suggestion.feedbackDisposition === null)) {
    flags.push("AI feedback pending");
  }

  if (
    input.referrals.length === 0 &&
    ["routed", "awaiting_agency", "follow_up_due"].includes(input.report.status)
  ) {
    flags.push("Referral missing");
  }

  if (normalizedCategory !== input.report.category) {
    flags.push("Legacy category");
  }

  if (/\b(test|smoke|persistence|upload test|body limit)\b/i.test(descriptionText)) {
    flags.push("Internal test?");
  }

  return flags;
}

export function buildStaffInboxSearchText(row: {
  report: IssueReport;
  ownerLabel: string;
  assignedStaffName: string;
  latestUpdate?: string | null;
  nextAction?: string | null;
}) {
  return [
    row.report.category,
    normalizeIssueCategory(row.report.category),
    row.report.status,
    row.report.description,
    row.report.addressText,
    row.report.residentName,
    row.report.residentEmail,
    row.report.residentPhone,
    row.report.municipalityName,
    row.ownerLabel,
    row.assignedStaffName,
    row.latestUpdate,
    row.nextAction,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterStaffInboxRows<T extends StaffInboxRow>(input: {
  rows: T[];
  filter: StaffInboxFilter;
  query: string;
}) {
  const query = input.query.trim().toLowerCase();

  return input.rows.filter((row) => {
    const updatedAt = new Date(row.report.updatedAt);
    const recentlyUpdated =
      Number.isFinite(updatedAt.getTime()) &&
      Date.now() - updatedAt.getTime() <= 2 * 24 * 60 * 60 * 1000;
    const matchesFilter =
      input.filter === "all" ||
      (input.filter === "active" && ACTIVE_STATUSES.has(row.report.status)) ||
      (input.filter === "resolved_closed" && CLOSED_STATUSES.has(row.report.status)) ||
      (input.filter === "unassigned" &&
        !row.report.assignedStaffId &&
        !CLOSED_STATUSES.has(row.report.status)) ||
      (input.filter === "recently_updated" && recentlyUpdated) ||
      row.report.status === input.filter;

    if (!matchesFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return row.searchableText.includes(query);
  });
}
