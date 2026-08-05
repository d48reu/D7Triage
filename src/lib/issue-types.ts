export const ISSUE_CATEGORIES = [
  "ANIMALS",
  "BUS",
  "FLOODING",
  "GARBAGE/RECYCLING",
  "HOMELESS ASSISTANCE",
  "HOUSING",
  "ILLEGAL DUMPING/TRASH",
  "METRORAIL",
  "NOISE",
  "PANHANDLERS, HOMELESS NUISANCE",
  "PARKING ENFORCEMENT",
  "PARKS",
  "PEACOCKS",
  "SIDEWALKS",
  "STREETLIGHTS",
  "TRAFFIC",
  "TREES",
  "UTILITY RELATED",
  "WASD",
  "WATER METER READING",
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

const ISSUE_CATEGORY_SET = new Set<string>(ISSUE_CATEGORIES);

const LEGACY_CATEGORY_ALIASES: Record<string, IssueCategory> = {
  "roads and potholes": "TRAFFIC",
  "road and potholes": "TRAFFIC",
  potholes: "TRAFFIC",
  "traffic safety": "TRAFFIC",
  parking: "PARKING ENFORCEMENT",
  "parking enforcement": "PARKING ENFORCEMENT",
  "drainage and flooding": "FLOODING",
  "solid waste and illegal dumping": "ILLEGAL DUMPING/TRASH",
  "solid waste": "GARBAGE/RECYCLING",
  "streetlights and signage": "STREETLIGHTS",
  sidewalks: "SIDEWALKS",
  parks: "PARKS",
  tree: "TREES",
  trees: "TREES",
};

const CATEGORY_INFERENCE_RULES: Array<{
  category: IssueCategory;
  patterns: RegExp[];
}> = [
  {
    category: "HOUSING",
    patterns: [
      /\bhousing\b/i,
      /\baffordable housing\b/i,
      /\bhousing voucher\b/i,
      /\bsection 8\b/i,
      /\bhcd\b/i,
      /\blandlord\b/i,
      /\blease\b/i,
      /\brent\b/i,
      /\beviction\b/i,
      /\btenant\b/i,
    ],
  },
  {
    category: "FLOODING",
    patterns: [
      /\bstorm drain\b/i,
      /\bcatch basin\b/i,
      /\bdrainage\b/i,
      /\bflood(?:ing|ed)?\b/i,
      /\bstanding water\b/i,
    ],
  },
  {
    category: "WASD",
    patterns: [/\bwasd\b/i, /\bwater and sewer\b/i, /\bsewer\b/i],
  },
  {
    category: "GARBAGE/RECYCLING",
    patterns: [
      /\brecycling\b/i,
      /\bmissed (?:garbage|trash|collection|pickup|pick-up)\b/i,
      /\bbulky (?:trash|waste|pickup|pick-up)\b/i,
    ],
  },
  {
    category: "ILLEGAL DUMPING/TRASH",
    patterns: [/\billegal dumping\b/i, /\bdumping\b/i, /\btrash pile\b/i],
  },
  {
    category: "PARKING ENFORCEMENT",
    patterns: [
      /\bparking enforcement\b/i,
      /\bparking violation\b/i,
      /\billegally parked\b/i,
      /\bblocked driveway\b/i,
      /\bparked (?:on|across) (?:the )?(?:sidewalk|driveway)\b/i,
    ],
  },
  {
    category: "TREES",
    patterns: [
      /\btrees?\b/i,
      /\bbranches?\b/i,
      /\blimbs?\b/i,
      /\bstump\b/i,
      /\bcanopy\b/i,
    ],
  },
  {
    category: "TRAFFIC",
    patterns: [
      /\btraffic\b/i,
      /\bspeed(?:ing)?\b/i,
      /\bfour-way stop\b/i,
      /\bstop sign\b/i,
      /\bpothole\b/i,
      /\broadway\b/i,
    ],
  },
];

export function normalizeIssueCategory(category: string): IssueCategory {
  const trimmed = category.trim();

  if (ISSUE_CATEGORY_SET.has(trimmed)) {
    return trimmed as IssueCategory;
  }

  const alias = LEGACY_CATEGORY_ALIASES[trimmed.toLowerCase()];
  return alias ?? "Other / unsure";
}

export function isKnownIssueCategoryInput(category: string) {
  const trimmed = category.trim();
  return (
    ISSUE_CATEGORY_SET.has(trimmed) ||
    Object.prototype.hasOwnProperty.call(
      LEGACY_CATEGORY_ALIASES,
      trimmed.toLowerCase(),
    )
  );
}

export function inferIssueCategoryFromText(input: {
  category: string;
  description: string;
  addressText: string;
}): IssueCategory {
  const text = `${input.category}\n${input.description}\n${input.addressText}`;

  for (const rule of CATEGORY_INFERENCE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }

  return normalizeIssueCategory(input.category);
}

export function resolveIntakeBoardCategory(input: {
  currentCategory: string;
  submittedCategory: string;
  categoryChangeConfirmed: boolean;
  description: string;
  addressText: string;
}) {
  if (!input.categoryChangeConfirmed) {
    return normalizeIssueCategory(input.currentCategory);
  }

  const normalizedCategory = normalizeIssueCategory(input.submittedCategory);
  if (
    normalizedCategory === "Other / unsure" ||
    normalizedCategory !== input.submittedCategory
  ) {
    return inferIssueCategoryFromText({
      category: input.submittedCategory,
      description: input.description,
      addressText: input.addressText,
    });
  }

  return normalizedCategory;
}

export function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
