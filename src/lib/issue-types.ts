export const ISSUE_CATEGORIES = [
  "Roads and potholes",
  "Sidewalks",
  "Drainage and flooding",
  "Solid waste and illegal dumping",
  "Streetlights and signage",
  "Parks",
  "Trees",
  "Traffic safety",
  "Other / unsure",
] as const;

export const ISSUE_STATUSES = [
  "received",
  "needs_review",
  "routed",
  "awaiting_agency",
  "needs_more_info",
  "follow_up_due",
  "resolved",
  "closed_outside_jurisdiction",
  "closed_duplicate",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
