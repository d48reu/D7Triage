import { geometryContainsPoint, parseGeoJsonFeatures } from "@/lib/geojson-utils";
import { inferIssueCategoryFromText } from "@/lib/issue-types";

type ReportLike = {
  category: string;
  description: string;
  addressText: string;
  latitude?: number | null;
  longitude?: number | null;
  municipalityName?: string | null;
  municipalityLookupStatus?: "matched" | "outside_municipality" | "failed" | "not_attempted";
  parcelLookupStatus?: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  rightOfWayHint?: "on_parcel" | "probable_public_right_of_way" | "unclear";
};

export type JurisdictionOwnershipHint =
  | "municipal"
  | "county"
  | "state"
  | "utility"
  | "private_property"
  | "school"
  | "transit"
  | "parks"
  | "unclear";

export type DistrictHintStatus =
  | "likely_in_district"
  | "likely_outside_district"
  | "unclear";

export type JurisdictionAssessment = {
  districtHintStatus: DistrictHintStatus;
  ownershipHint: JurisdictionOwnershipHint;
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  summary: string;
  staffGuidance: string;
  residentExplanation: string;
  matchedClues: string[];
  municipalityName: string | null;
  municipalityHintStatus: "matched" | "outside_municipality" | "failed" | "not_attempted";
  parcelLookupStatus: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  rightOfWayHint: "on_parcel" | "probable_public_right_of_way" | "unclear";
};

export type JurisdictionKeywordConfig = {
  districtMatchKeywords: string[];
  districtOutsideKeywords: string[];
  stateKeywords: string[];
  countyKeywords: string[];
  utilityKeywords: string[];
  privatePropertyKeywords: string[];
  schoolKeywords: string[];
  transitKeywords: string[];
  parksKeywords: string[];
  districtBoundaryName?: string | null;
  districtBoundaryGeoJson?: string | null;
  municipalityBoundaryName?: string | null;
  municipalityBoundaryGeoJson?: string | null;
};

const OWNERSHIP_RULES: Array<{
  ownershipHint: Exclude<JurisdictionOwnershipHint, "municipal" | "unclear">;
  label: string;
  patterns: RegExp[];
}> = [
  {
    ownershipHint: "state",
    label: "State roadway clue",
    patterns: [
      /\bi-\d+\b/i,
      /\binterstate\b/i,
      /\bus[- ]?\d+\b/i,
      /\bus route\b/i,
      /\bstate route\b/i,
      /\bsr[- ]?\d+\b/i,
      /\bhighway\b/i,
      /\bhwy\b/i,
      /\bdixie hwy\b/i,
      /\bus-1\b/i,
    ],
  },
  {
    ownershipHint: "county",
    label: "County jurisdiction clue",
    patterns: [/\bcounty road\b/i, /\bcounty\b/i, /\bunincorporated\b/i],
  },
  {
    ownershipHint: "utility",
    label: "Utility ownership clue",
    patterns: [
      /\bpower line\b/i,
      /\bpower pole\b/i,
      /\btransformer\b/i,
      /\butility\b/i,
      /\bwater main\b/i,
      /\bfire hydrant\b/i,
      /\bgas leak\b/i,
      /\bsewer\b/i,
      /\bsparks?\b/i,
    ],
  },
  {
    ownershipHint: "private_property",
    label: "Private property clue",
    patterns: [
      /\bapartment\b/i,
      /\bcondo\b/i,
      /\bhoa\b/i,
      /\bshopping center\b/i,
      /\bmall\b/i,
      /\bplaza\b/i,
      /\bparking lot\b/i,
      /\bprivate road\b/i,
      /\bdriveway\b/i,
    ],
  },
  {
    ownershipHint: "school",
    label: "School property clue",
    patterns: [/\bschool\b/i, /\bcampus\b/i, /\bschool zone\b/i],
  },
  {
    ownershipHint: "transit",
    label: "Transit clue",
    patterns: [
      /\bbus stop\b/i,
      /\btransit\b/i,
      /\bstation\b/i,
      /\brail\b/i,
      /\bmetro\b/i,
      /\bplatform\b/i,
    ],
  },
  {
    ownershipHint: "parks",
    label: "Parks clue",
    patterns: [/\bpark\b/i, /\bplayground\b/i, /\btrail\b/i, /\bgreenway\b/i],
  },
];

const CONFIG_OWNERSHIP_RULES: Array<{
  ownershipHint: Exclude<JurisdictionOwnershipHint, "municipal" | "unclear">;
  label: string;
  getKeywords: (config: JurisdictionKeywordConfig) => string[];
}> = [
  {
    ownershipHint: "state",
    label: "Configured state keyword",
    getKeywords: (config) => config.stateKeywords,
  },
  {
    ownershipHint: "county",
    label: "Configured county keyword",
    getKeywords: (config) => config.countyKeywords,
  },
  {
    ownershipHint: "utility",
    label: "Configured utility keyword",
    getKeywords: (config) => config.utilityKeywords,
  },
  {
    ownershipHint: "private_property",
    label: "Configured private-property keyword",
    getKeywords: (config) => config.privatePropertyKeywords,
  },
  {
    ownershipHint: "school",
    label: "Configured school keyword",
    getKeywords: (config) => config.schoolKeywords,
  },
  {
    ownershipHint: "transit",
    label: "Configured transit keyword",
    getKeywords: (config) => config.transitKeywords,
  },
  {
    ownershipHint: "parks",
    label: "Configured parks keyword",
    getKeywords: (config) => config.parksKeywords,
  },
];

export function analyzeReportJurisdiction(
  report: ReportLike,
  config?: JurisdictionKeywordConfig,
): JurisdictionAssessment {
  const combinedText = `${report.addressText}\n${report.description}`;
  const normalized = combinedText.toLowerCase();
  const keywordConfig = config ?? getEnvJurisdictionKeywordConfig();

  const matchedClues: string[] = [];
  const ownershipScores = new Map<JurisdictionOwnershipHint, number>();

  for (const rule of OWNERSHIP_RULES) {
    const matchCount = rule.patterns.filter((pattern) => pattern.test(normalized)).length;
    if (matchCount > 0) {
      ownershipScores.set(
        rule.ownershipHint,
        (ownershipScores.get(rule.ownershipHint) ?? 0) + matchCount,
      );
      matchedClues.push(rule.label);
    }
  }

  for (const rule of CONFIG_OWNERSHIP_RULES) {
    const keywords = rule.getKeywords(keywordConfig);
    const matchCount = keywords.filter((keyword) => normalized.includes(keyword)).length;
    if (matchCount > 0) {
      ownershipScores.set(
        rule.ownershipHint,
        (ownershipScores.get(rule.ownershipHint) ?? 0) + matchCount,
      );
      matchedClues.push(rule.label);
    }
  }

  applyCategoryBias(report, ownershipScores, matchedClues);

  const topOwnership =
    Array.from(ownershipScores.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
  const ownershipHint = topOwnership?.[0] ?? "municipal";
  const ownershipScore = topOwnership?.[1] ?? 0;

  const districtHintStatus = getDistrictHintStatus(
    report,
    normalized,
    matchedClues,
    keywordConfig,
  );
  const confidenceInfo = getConfidenceInfo({
    report,
    ownershipHint,
    ownershipScore,
    districtHintStatus,
  });

  return {
    districtHintStatus,
    ownershipHint,
    confidence: confidenceInfo.confidence,
    confidenceReason: confidenceInfo.reason,
    summary: buildSummary(report, ownershipHint, districtHintStatus),
    staffGuidance: buildStaffGuidance(report, ownershipHint, districtHintStatus),
    residentExplanation: buildResidentExplanation(ownershipHint),
    matchedClues,
    municipalityName: report.municipalityName ?? null,
    municipalityHintStatus: report.municipalityLookupStatus ?? "not_attempted",
    parcelLookupStatus: report.parcelLookupStatus ?? "not_attempted",
    rightOfWayHint: report.rightOfWayHint ?? "unclear",
  };
}

export function formatDistrictHintStatus(status: DistrictHintStatus) {
  switch (status) {
    case "likely_in_district":
      return "Likely in District 7";
    case "likely_outside_district":
      return "Likely outside District 7";
    default:
      return "District unclear";
  }
}

export function formatOwnershipHint(hint: JurisdictionOwnershipHint) {
  switch (hint) {
    case "municipal":
      return "Likely municipal";
    case "county":
      return "Likely county";
    case "state":
      return "Likely state";
    case "utility":
      return "Likely utility";
    case "private_property":
      return "Likely private property";
    case "school":
      return "Likely school property";
    case "transit":
      return "Likely transit";
    case "parks":
      return "Likely parks";
    default:
      return "Ownership unclear";
  }
}

function parseKeywords(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function applyCategoryBias(
  report: ReportLike,
  scores: Map<JurisdictionOwnershipHint, number>,
  matchedClues: string[],
) {
  const addScore = (hint: JurisdictionOwnershipHint, label: string, amount = 1) => {
    scores.set(hint, (scores.get(hint) ?? 0) + amount);
    if (!matchedClues.includes(label)) {
      matchedClues.push(label);
    }
  };

  const inferredCategory = inferIssueCategoryFromText({
    category: report.category,
    description: report.description,
    addressText: report.addressText,
  });

  switch (inferredCategory) {
    case "HOUSING":
      addScore("county", "Housing category context");
      break;
    case "HOMELESS ASSISTANCE":
    case "PANHANDLERS, HOMELESS NUISANCE":
      addScore("county", "Homeless assistance category context");
      break;
    case "BUS":
    case "METRORAIL":
      addScore("transit", "Transit category context", 2);
      break;
    case "FLOODING":
    case "GARBAGE/RECYCLING":
    case "ILLEGAL DUMPING/TRASH":
    case "WASD":
    case "WATER METER READING":
      addScore("county", "County service category context");
      break;
    case "STREETLIGHTS":
    case "UTILITY RELATED":
      addScore("utility", "Utility category context", 2);
      break;
    case "TRAFFIC":
      addScore("municipal", "Traffic category context");
      break;
    case "PARKING ENFORCEMENT":
      addScore("municipal", "Parking enforcement category context");
      break;
    case "NOISE":
      addScore("municipal", "Code/enforcement category context");
      break;
    case "PEACOCKS":
    case "ANIMALS":
      addScore("county", "Animal services category context");
      break;
    case "PARKS":
      addScore("parks", "Parks category context", 2);
      break;
    case "SIDEWALKS":
      addScore("municipal", "Sidewalk category context");
      addScore("private_property", "Sidewalk issue may involve adjacent property");
      if (report.rightOfWayHint === "probable_public_right_of_way") {
        addScore("municipal", "Point appears outside a parcel, suggesting right-of-way", 2);
      }
      if (report.rightOfWayHint === "on_parcel") {
        addScore("private_property", "Point appears to fall on a parcel");
      }
      break;
    default:
      break;
  }

  if (/\btree\b/i.test(report.category)) {
    addScore("municipal", "Tree issue category context");
    addScore("private_property", "Tree issue may involve adjacent private property");
    if (/\bpower line\b/i.test(report.description)) {
      addScore("utility", "Tree hazard intersects utility clue");
    }
  }

  if (isUnincorporatedMiamiDade(report.municipalityName)) {
    addScore("county", "Unincorporated Miami-Dade identified", 3);
  } else if (report.municipalityName) {
    addScore("municipal", `Municipality identified: ${report.municipalityName}`);
  }
}

function isUnincorporatedMiamiDade(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "unincorporated miami-dade";
}

function getEnvJurisdictionKeywordConfig(): JurisdictionKeywordConfig {
  return {
    districtMatchKeywords: parseKeywords(process.env.DISTRICT_7_MATCH_KEYWORDS),
    districtOutsideKeywords: parseKeywords(process.env.DISTRICT_7_OUTSIDE_KEYWORDS),
    stateKeywords: [],
    countyKeywords: [],
    utilityKeywords: [],
    privatePropertyKeywords: [],
    schoolKeywords: [],
    transitKeywords: [],
    parksKeywords: [],
    districtBoundaryName: null,
    districtBoundaryGeoJson: null,
    municipalityBoundaryName: null,
    municipalityBoundaryGeoJson: null,
  };
}

function getDistrictHintStatus(
  report: ReportLike,
  normalizedText: string,
  matchedClues: string[],
  config: JurisdictionKeywordConfig,
) {
  const boundaryResult = classifyBoundaryMatch(report, config.districtBoundaryGeoJson);

  if (boundaryResult === "inside") {
    matchedClues.push("Boundary polygon contains captured coordinates");
    return "likely_in_district";
  }

  if (boundaryResult === "outside") {
    matchedClues.push("Boundary polygon excludes captured coordinates");
    return "likely_outside_district";
  }

  const matchesDistrict = config.districtMatchKeywords.some((keyword) =>
    normalizedText.includes(keyword),
  );
  const matchesOutside = config.districtOutsideKeywords.some((keyword) =>
    normalizedText.includes(keyword),
  );

  if (matchesOutside) {
    matchedClues.push("Configured outside-district keyword");
    return "likely_outside_district";
  }

  if (matchesDistrict) {
    matchedClues.push("Configured District 7 keyword");
    return "likely_in_district";
  }

  return "unclear";
}

function classifyBoundaryMatch(
  report: ReportLike,
  boundaryGeoJson: string | null | undefined,
) {
  if (
    report.latitude === null ||
    report.latitude === undefined ||
    report.longitude === null ||
    report.longitude === undefined ||
    !boundaryGeoJson
  ) {
    return "unknown" as const;
  }

  const point: [number, number] = [report.longitude, report.latitude];
  const features = parseGeoJsonFeatures(boundaryGeoJson);
  if (features.length === 0) {
    return "unknown" as const;
  }

  return features.some((feature) => geometryContainsPoint(feature.geometry, point))
    ? "inside"
    : "outside";
}

function getConfidenceInfo(input: {
  report: ReportLike;
  ownershipHint: JurisdictionOwnershipHint;
  ownershipScore: number;
  districtHintStatus: DistrictHintStatus;
}) {
  const municipalityKnown = Boolean(input.report.municipalityName);
  const parcelKnown = input.report.parcelLookupStatus === "matched";
  const probableRow = input.report.rightOfWayHint === "probable_public_right_of_way";

  if (
    input.districtHintStatus !== "unclear" &&
    municipalityKnown &&
    parcelKnown &&
    probableRow &&
    input.ownershipScore >= 2
  ) {
    return {
      confidence: "high" as const,
      reason:
        "District, municipality, parcel lookup, and probable right-of-way context all aligned for this case.",
    };
  }

  if (
    input.ownershipHint !== "municipal" &&
    input.ownershipHint !== "unclear" &&
    input.ownershipScore >= 1 &&
    (municipalityKnown || parcelKnown)
  ) {
    return {
      confidence: "medium" as const,
      reason:
        "Specific ownership clues were detected, but staff should still confirm the final operating agency.",
    };
  }

  if (
    ["Sidewalks", "SIDEWALKS"].includes(input.report.category) &&
    municipalityKnown &&
    !probableRow
  ) {
    return {
      confidence: "low" as const,
      reason:
        "The municipality is known, but sidewalk ownership still depends on whether the damage is in public right-of-way or tied to the adjacent parcel.",
    };
  }

  if (
    ["Sidewalks", "SIDEWALKS"].includes(input.report.category) &&
    probableRow &&
    municipalityKnown
  ) {
    return {
      confidence: "medium" as const,
      reason:
        "The municipality is known and the point appears outside a parcel, which leans toward public right-of-way, but staff should still confirm maintenance responsibility.",
    };
  }

  if (municipalityKnown && input.districtHintStatus !== "unclear") {
    return {
      confidence: "medium" as const,
      reason:
        "District and municipality were both identified, but the ownership evidence is still broad.",
    };
  }

  return {
    confidence: "low" as const,
    reason:
      "The app can place the report geographically, but it still lacks enough ownership evidence to recommend a highly confident route.",
  };
}

function buildSummary(
  report: ReportLike,
  ownershipHint: JurisdictionOwnershipHint,
  districtHintStatus: DistrictHintStatus,
) {
  const municipalitySegment = report.municipalityName
    ? ` Municipality: ${report.municipalityName}.`
    : "";
  const rowSegment =
    report.rightOfWayHint === "probable_public_right_of_way"
      ? " Point likely falls in public right-of-way."
      : report.rightOfWayHint === "on_parcel"
        ? " Point falls on a mapped parcel."
        : "";

  return `${formatOwnershipHint(ownershipHint)}. ${formatDistrictHintStatus(districtHintStatus)}.${municipalitySegment}${rowSegment}`;
}

function buildStaffGuidance(
  report: ReportLike,
  ownershipHint: JurisdictionOwnershipHint,
  districtHintStatus: DistrictHintStatus,
) {
  const ownershipLine =
    ownershipHint === "municipal"
      ? "Treat this as municipal unless staff know a more specific owner."
      : `Verify whether the issue belongs with ${formatOwnershipHint(ownershipHint).toLowerCase()} before sending a referral.`;
  const districtLine =
    districtHintStatus === "unclear"
      ? "District 7 matching is heuristic-only right now; confirm the actual service area with staff knowledge."
      : `Use the ${formatDistrictHintStatus(districtHintStatus).toLowerCase()} clue as a triage signal, not a final boundary decision.`;
  const municipalityLine = report.municipalityName
    ? ` Municipal context: ${report.municipalityName}.`
    : " Municipality lookup is still unresolved.";
  const rowLine =
    report.rightOfWayHint === "probable_public_right_of_way"
      ? " The point appears outside a parcel, which may indicate right-of-way."
      : report.rightOfWayHint === "on_parcel"
        ? " The point falls on a parcel, so adjacent private-property responsibility is still possible."
        : " Parcel/right-of-way evidence is still limited.";

  return `${ownershipLine} ${districtLine}${municipalityLine}${rowLine}`;
}

function buildResidentExplanation(ownershipHint: JurisdictionOwnershipHint) {
  switch (ownershipHint) {
    case "state":
      return "This may involve a state-maintained corridor, so District 7 staff may need to route it outside city channels.";
    case "county":
      return "This may involve county responsibility rather than a city-only response.";
    case "utility":
      return "Utilities sometimes own the asset involved, so staff may need to coordinate with a provider.";
    case "private_property":
      return "Some issues on private property require owner or manager follow-up rather than direct public works action.";
    case "school":
      return "This may involve school property or a school-adjacent facility.";
    case "transit":
      return "Transit stops and stations can require coordination with the transit operator.";
    case "parks":
      return "Park and facility issues may route through a parks operator instead of a general service team.";
    default:
      return "Staff will review the location details and determine the best jurisdictional routing path.";
  }
}
