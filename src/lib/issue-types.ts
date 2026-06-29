export const ISSUE_CATEGORIES = [
  "HOUSING",
  "HOMELESS ASSISTANCE",
  "BUS",
  "METRORAIL",
  "STREETLIGHTS",
  "FLOODING",
  "GARBAGE/RECYCLING",
  "SIDEWALKS",
  "TRAFFIC",
  "NOISE",
  "PEACOCKS",
  "PARKS",
  "ILLEGAL DUMPING/TRASH",
  "WATER METER READING",
  "UTILITY RELATED",
  "ANIMALS",
  "PANHANDLERS, HOMELESS NUISANCE",
  "WASD",
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
