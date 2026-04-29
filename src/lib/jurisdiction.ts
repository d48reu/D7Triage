type ReportLike = {
  category: string;
  description: string;
  addressText: string;
  latitude?: number | null;
  longitude?: number | null;
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
  summary: string;
  staffGuidance: string;
  residentExplanation: string;
  matchedClues: string[];
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

  applyCategoryBias(report.category, ownershipScores, matchedClues);

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
  const confidence = getConfidence(ownershipHint, ownershipScore, districtHintStatus);

  return {
    districtHintStatus,
    ownershipHint,
    confidence,
    summary: buildSummary(ownershipHint, districtHintStatus),
    staffGuidance: buildStaffGuidance(ownershipHint, districtHintStatus),
    residentExplanation: buildResidentExplanation(ownershipHint),
    matchedClues,
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
  category: string,
  scores: Map<JurisdictionOwnershipHint, number>,
  matchedClues: string[],
) {
  const addScore = (hint: JurisdictionOwnershipHint, label: string, amount = 1) => {
    scores.set(hint, (scores.get(hint) ?? 0) + amount);
    if (!matchedClues.includes(label)) {
      matchedClues.push(label);
    }
  };

  switch (category) {
    case "Parks":
      addScore("parks", "Parks category context", 2);
      break;
    case "Streetlights and signage":
      addScore("utility", "Streetlight/signage category context");
      break;
    case "Traffic safety":
      addScore("municipal", "Traffic category context");
      break;
    case "Trees":
      addScore("municipal", "Tree issue category context");
      addScore("private_property", "Tree issue may involve adjacent private property");
      break;
    case "Sidewalks":
      addScore("municipal", "Sidewalk category context");
      addScore("private_property", "Sidewalk issue may involve adjacent property");
      break;
    default:
      break;
  }
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
  };
}

function getDistrictHintStatus(
  report: ReportLike,
  normalizedText: string,
  matchedClues: string[],
  config: JurisdictionKeywordConfig,
) {
  const boundaryResult = classifyBoundaryMatch(report, config);

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
  config: JurisdictionKeywordConfig,
) {
  if (
    report.latitude === null ||
    report.latitude === undefined ||
    report.longitude === null ||
    report.longitude === undefined ||
    !config.districtBoundaryGeoJson
  ) {
    return "unknown" as const;
  }

  try {
    const parsed = JSON.parse(config.districtBoundaryGeoJson) as {
      type?: string;
      coordinates?: unknown;
      geometry?: { type?: string; coordinates?: unknown };
      features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
    };

    const geometries = getGeoJsonGeometries(parsed);
    if (geometries.length === 0) {
      return "unknown" as const;
    }

    const point: [number, number] = [report.longitude, report.latitude];
    return geometries.some((geometry) => geometryContainsPoint(geometry, point))
      ? "inside"
      : "outside";
  } catch {
    return "unknown" as const;
  }
}

function getGeoJsonGeometries(value: {
  type?: string;
  coordinates?: unknown;
  geometry?: { type?: string; coordinates?: unknown };
  features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
}) {
  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    return value.features
      .map((feature) => feature.geometry)
      .filter((geometry): geometry is { type?: string; coordinates?: unknown } => Boolean(geometry));
  }

  if (value.type === "Feature" && value.geometry) {
    return [value.geometry];
  }

  if (value.type && value.coordinates) {
    return [{ type: value.type, coordinates: value.coordinates }];
  }

  return [];
}

function geometryContainsPoint(
  geometry: { type?: string; coordinates?: unknown },
  point: [number, number],
) {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return polygonContainsPoint(geometry.coordinates as number[][][], point);
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as number[][][][]).some((polygon) =>
      polygonContainsPoint(polygon, point),
    );
  }

  return false;
}

function polygonContainsPoint(
  polygon: number[][][],
  point: [number, number],
) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  const [outerRing, ...holes] = polygon;
  if (!ringContainsPoint(outerRing, point)) return false;
  return !holes.some((ring) => ringContainsPoint(ring, point));
}

function ringContainsPoint(
  ring: number[][],
  point: [number, number],
) {
  let inside = false;
  const [px, py] = point;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];

    if (
      xi === undefined ||
      yi === undefined ||
      xj === undefined ||
      yj === undefined
    ) {
      continue;
    }

    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getConfidence(
  ownershipHint: JurisdictionOwnershipHint,
  ownershipScore: number,
  districtHintStatus: DistrictHintStatus,
) {
  if (districtHintStatus !== "unclear" && ownershipScore >= 2) {
    return "high";
  }

  if (ownershipHint !== "municipal" && ownershipHint !== "unclear" && ownershipScore >= 1) {
    return "medium";
  }

  return "low";
}

function buildSummary(
  ownershipHint: JurisdictionOwnershipHint,
  districtHintStatus: DistrictHintStatus,
) {
  return `${formatOwnershipHint(ownershipHint)}. ${formatDistrictHintStatus(districtHintStatus)}.`;
}

function buildStaffGuidance(
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

  return `${ownershipLine} ${districtLine}`;
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
