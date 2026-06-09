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
    category: "HOUSING",
    likelyResponsibleParty: "Housing, code compliance, or constituent services",
    staffGuidance:
      "Capture landlord/property details, unit number, urgency, prior reports, and whether the issue involves habitability, code, rent, or relocation support.",
    residentExplanation:
      "Housing concerns are reviewed for the best housing, code, or assistance referral.",
    escalationNotes:
      "Escalate unsafe living conditions, displacement risk, vulnerable residents, or repeated unresolved reports.",
  },
  {
    category: "HOMELESS ASSISTANCE",
    likelyResponsibleParty: "Homeless assistance outreach or coordinated services",
    staffGuidance:
      "Capture location, urgency, whether outreach is requested, and any immediate health or safety concern.",
    residentExplanation:
      "Staff will review the location and connect the concern to appropriate outreach or assistance channels.",
    escalationNotes:
      "Escalate life-safety concerns, minors, medical distress, or requests for immediate shelter support.",
  },
  {
    category: "BUS",
    likelyResponsibleParty: "Miami-Dade Transit / bus operations",
    staffGuidance:
      "Capture route number, stop ID or cross streets, direction of travel, date/time, and whether the issue involves service, shelter, signage, or safety.",
    residentExplanation:
      "Bus issues are routed based on the stop, route, and responsible transit team.",
    escalationNotes:
      "Escalate blocked stops, accessibility barriers, dangerous stop conditions, and repeated missed service patterns.",
  },
  {
    category: "METRORAIL",
    likelyResponsibleParty: "Miami-Dade Transit / rail operations",
    staffGuidance:
      "Capture station, platform, train direction, date/time, and whether the issue involves safety, cleanliness, access, or service.",
    residentExplanation:
      "Metrorail issues are reviewed for the transit team responsible for the station or service concern.",
    escalationNotes:
      "Escalate safety hazards, elevator outages, platform issues, and accessibility barriers.",
  },
  {
    category: "STREETLIGHTS",
    likelyResponsibleParty: "Transportation, traffic signals, or utility owner",
    staffGuidance:
      "Capture pole number if visible, nearest address or intersection, whether the light is out or damaged, and whether the area is fully dark.",
    residentExplanation:
      "Streetlight ownership can involve transportation staff, utilities, or another jurisdiction.",
    escalationNotes:
      "Escalate dark intersections, school routes, damaged poles, exposed wires, or repeated outages.",
  },
  {
    category: "FLOODING",
    likelyResponsibleParty: "Stormwater / drainage operations",
    staffGuidance:
      "Ask whether flooding is active, recurring, or post-storm. Capture photos, water depth, blocked drains, affected homes, and nearest cross street.",
    residentExplanation:
      "Flooding and drainage concerns are reviewed for stormwater maintenance or field inspection routing.",
    escalationNotes:
      "Escalate active flooding affecting homes, critical access, or repeated loss of safe passage.",
  },
  {
    category: "GARBAGE/RECYCLING",
    likelyResponsibleParty: "Solid Waste, recycling service, or municipality",
    staffGuidance:
      "Distinguish missed collection, cart issue, recycling concern, bulky waste, and service-route problem. Capture address and collection day if known.",
    residentExplanation:
      "Garbage and recycling issues are routed based on the service area and type of collection problem.",
    escalationNotes:
      "Escalate blocked right-of-way, health hazards, repeated missed pickups, or large accumulation.",
  },
  {
    category: "SIDEWALKS",
    likelyResponsibleParty: "Public Works, municipality, or adjacent property owner",
    staffGuidance:
      "Check whether the sidewalk is public right-of-way, adjacent to private property, or within a municipal boundary.",
    residentExplanation:
      "Sidewalk responsibility can vary by location and adjacent property conditions.",
    escalationNotes:
      "Flag accessibility barriers, trip hazards near senior facilities, school routes, and blocked sidewalks.",
  },
  {
    category: "TRAFFIC",
    likelyResponsibleParty: "Transportation planning / traffic engineering",
    staffGuidance:
      "Capture intersection, direction, pattern, time of day, and whether the concern involves speeding, visibility, signals, signage, or crossings.",
    residentExplanation:
      "Traffic concerns are reviewed for engineering, enforcement, or jurisdictional referral.",
    escalationNotes:
      "Escalate crash patterns, school-zone concerns, missing or damaged traffic control, and urgent visibility issues.",
  },
  {
    category: "NOISE",
    likelyResponsibleParty: "Code compliance, police non-emergency, or municipality",
    staffGuidance:
      "Capture location, source, time pattern, duration, prior reports, and whether the concern is active or recurring.",
    residentExplanation:
      "Noise reports are reviewed for the appropriate code, enforcement, or municipal channel.",
    escalationNotes:
      "Escalate threats, active disturbances, vulnerable-location impacts, or repeated overnight issues.",
  },
  {
    category: "PEACOCKS",
    likelyResponsibleParty: "Animal services, municipality, or neighborhood liaison",
    staffGuidance:
      "Capture location, pattern, property damage, safety concern, and whether residents have prior case numbers or photos.",
    residentExplanation:
      "Peacock concerns are reviewed for the appropriate animal services or municipal response path.",
    escalationNotes:
      "Escalate aggressive behavior, traffic hazards, or repeated damage claims with documentation.",
  },
  {
    category: "ILLEGAL DUMPING/TRASH",
    likelyResponsibleParty: "Solid Waste / code compliance",
    staffGuidance:
      "Capture photos, exact location, type of material, whether it is on public right-of-way or private property, and whether dumping is recurring.",
    residentExplanation:
      "Dumping and trash reports are routed based on location, ownership, and material type.",
    escalationNotes:
      "Escalate hazardous materials, blocked sidewalks/roadways, and repeated dumping hotspots.",
  },
  {
    category: "WATER METER READING",
    likelyResponsibleParty: "Water and Sewer Department",
    staffGuidance:
      "Capture account or meter details if available, service address, billing period, reading concern, and any prior WASD contact.",
    residentExplanation:
      "Water meter reading concerns are reviewed for the water utility team responsible for the account or service address.",
    escalationNotes:
      "Escalate shutoff risk, suspected leaks, vulnerable residents, or urgent billing deadlines.",
  },
  {
    category: "UTILITY RELATED",
    likelyResponsibleParty: "Utility provider, WASD, FPL, or public works",
    staffGuidance:
      "Identify the utility type, asset, exact location, visible hazards, provider if known, and whether service is interrupted.",
    residentExplanation:
      "Utility issues are routed based on the provider or agency responsible for the specific asset.",
    escalationNotes:
      "Escalate exposed wires, gas odor, water main breaks, downed poles, outages affecting vulnerable residents, or immediate hazards.",
  },
  {
    category: "ANIMALS",
    likelyResponsibleParty: "Animal services or municipality",
    staffGuidance:
      "Capture animal type, location, behavior, urgency, owner information if known, and whether there is an immediate safety concern.",
    residentExplanation:
      "Animal concerns are reviewed for the appropriate animal services or municipal response path.",
    escalationNotes:
      "Escalate bites, aggressive animals, injured animals, blocked traffic, or immediate safety risks.",
  },
  {
    category: "PANHANDLERS, HOMELESS NUISANCE",
    likelyResponsibleParty: "Outreach services, code/enforcement, or police non-emergency",
    staffGuidance:
      "Capture exact location, behavior observed, time pattern, safety concern, and whether assistance or enforcement is being requested.",
    residentExplanation:
      "Staff will review the details and determine whether outreach, assistance, or another response path is appropriate.",
    escalationNotes:
      "Escalate threats, medical distress, minors, blocked access, or active safety concerns.",
  },
  {
    category: "WASD",
    likelyResponsibleParty: "Water and Sewer Department",
    staffGuidance:
      "Capture service address, account or case number if available, issue type, visible leaks, billing concern, and prior WASD contact.",
    residentExplanation:
      "Water and sewer concerns are reviewed for the appropriate WASD service path.",
    escalationNotes:
      "Escalate water main breaks, sewer backups, shutoff risk, vulnerable residents, and urgent field hazards.",
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

