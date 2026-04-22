import { ISSUE_CATEGORIES, type IssueCategory } from "@/lib/issue-types";

export type RoutingRule = {
  category: IssueCategory;
  likelyResponsibleParty: string;
  staffGuidance: string;
  residentExplanation: string;
  escalationNotes: string;
};

export const ROUTING_RULES: RoutingRule[] = [
  {
    category: "Roads and potholes",
    likelyResponsibleParty: "Public Works / roadway maintenance",
    staffGuidance:
      "Confirm whether the road is county, municipal, state, or private before referral. Capture nearest cross street and travel direction when possible.",
    residentExplanation:
      "Roadway issues are routed based on who maintains the specific road segment.",
    escalationNotes:
      "Escalate faster if the report describes an immediate safety hazard near a school, transit stop, or high-speed corridor.",
  },
  {
    category: "Sidewalks",
    likelyResponsibleParty: "Public Works, municipality, or property owner",
    staffGuidance:
      "Check whether the sidewalk is public right-of-way, adjacent to private property, or within a municipal boundary.",
    residentExplanation:
      "Sidewalk responsibility can vary by location and adjacent property conditions.",
    escalationNotes:
      "Flag accessibility barriers, trip hazards near senior facilities, and school routes.",
  },
  {
    category: "Drainage and flooding",
    likelyResponsibleParty: "Stormwater / drainage operations",
    staffGuidance:
      "Ask whether flooding is active, recurring, or post-storm. Capture photos, depth, blocked drains, and affected structures.",
    residentExplanation:
      "Drainage issues are reviewed for field inspection and stormwater maintenance routing.",
    escalationNotes:
      "Escalate active flooding affecting homes, critical access, or repeated loss of safe passage.",
  },
  {
    category: "Solid waste and illegal dumping",
    likelyResponsibleParty: "Solid Waste / code compliance",
    staffGuidance:
      "Distinguish missed collection, bulky waste, illegal dumping, and private-property dumping. Capture photos and exact location.",
    residentExplanation:
      "Waste and dumping reports are routed based on whether the material is on public right-of-way, private property, or a service route.",
    escalationNotes:
      "Escalate hazardous materials, repeated dumping hotspots, or blocked sidewalks/roadways.",
  },
  {
    category: "Streetlights and signage",
    likelyResponsibleParty: "Transportation, traffic signals, or utility owner",
    staffGuidance:
      "Identify whether the issue is a streetlight, traffic signal, stop sign, wayfinding sign, or damaged pole.",
    residentExplanation:
      "Lighting and sign ownership can involve transportation staff, utilities, or another jurisdiction.",
    escalationNotes:
      "Escalate dark intersections, school-zone signage, or damaged traffic control devices.",
  },
  {
    category: "Parks",
    likelyResponsibleParty: "Parks department or facility operator",
    staffGuidance:
      "Capture park name, amenity, condition, and whether the concern is maintenance, safety, programming, or access.",
    residentExplanation:
      "Park issues are routed to the team responsible for that facility or amenity.",
    escalationNotes:
      "Escalate safety hazards, broken playground equipment, restroom outages, and lighting concerns.",
  },
  {
    category: "Trees",
    likelyResponsibleParty: "Urban forestry / public works / property owner",
    staffGuidance:
      "Determine whether the tree is in public right-of-way, park property, or private property. Capture obstruction or damage details.",
    residentExplanation:
      "Tree issues depend on location and whether the tree is public or private.",
    escalationNotes:
      "Escalate fallen limbs blocking roads, sidewalks, power lines, or access to homes.",
  },
  {
    category: "Traffic safety",
    likelyResponsibleParty: "Transportation planning / traffic engineering",
    staffGuidance:
      "Capture intersection, direction, pattern, time of day, and whether the concern involves speeding, visibility, signals, or crossings.",
    residentExplanation:
      "Traffic safety reports are reviewed for engineering, enforcement, or jurisdictional referral.",
    escalationNotes:
      "Escalate crash patterns, school-zone concerns, and missing/damaged traffic control devices.",
  },
  {
    category: "Other / unsure",
    likelyResponsibleParty: "District 7 constituent services triage",
    staffGuidance:
      "Review manually, clarify missing details, then assign a more specific category if possible.",
    residentExplanation:
      "Staff will review the report and determine the most appropriate routing path.",
    escalationNotes:
      "Look for life-safety language, vulnerable-location context, or clear jurisdiction clues.",
  },
];

export function getRoutingRule(category: string) {
  return (
    ROUTING_RULES.find((rule) => rule.category === category) ??
    ROUTING_RULES.find((rule) => rule.category === "Other / unsure") ??
    ROUTING_RULES[ISSUE_CATEGORIES.length - 1]
  );
}
