import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStaffInboxFlags,
  canStaffMemberMarkAssignmentSeen,
  filterStaffInboxRows,
  getStaffInboxFilterOptions,
  normalizeStaffInboxFilter,
  type StaffInboxRow,
} from "../src/lib/staff-inbox";
import type { JurisdictionAssessment } from "../src/lib/jurisdiction";
import type { AiSuggestion, IssueReport } from "../src/lib/issues-repository";

const baseReport: IssueReport = {
  id: "report-1",
  publicTrackingToken: "token",
  status: "received",
  assignedStaffId: null,
  assignedAt: null,
  category: "Roads and potholes",
  description: "Render persistence test",
  intakeNotes: "",
  addressText: "3636 SW 16th Terrace, Miami, FL 33145",
  latitude: null,
  longitude: null,
  locationSource: "none",
  geocodingStatus: "failed",
  geocodedAddress: null,
  geocodingProvider: null,
  geocodedAt: null,
  municipalityName: null,
  municipalityCode: null,
  municipalityLookupStatus: "not_attempted",
  municipalitySource: null,
  municipalityMatchedAt: null,
  parcelLookupStatus: "not_attempted",
  parcelFolio: null,
  parcelAddress: null,
  parcelOwner: null,
  rightOfWayHint: "unclear",
  parcelMatchedAt: null,
  residentName: "Resident",
  residentEmail: "resident@example.com",
  residentPhone: null,
  preferredLanguage: "English",
  contactConsent: true,
  newsletterOptIn: false,
  newsletterOptInAt: null,
  notificationReviewStatus: null,
  notificationReviewNote: null,
  notificationReviewedAt: null,
  duplicateOfReportId: null,
  duplicateReviewDecision: null,
  duplicateReviewedAt: null,
  duplicateReviewNote: null,
  createdAt: "2026-07-19T12:00:00.000Z",
  updatedAt: "2026-07-19T12:00:00.000Z",
};

const baseJurisdiction: JurisdictionAssessment = {
  districtHintStatus: "unclear",
  ownershipHint: "municipal",
  confidence: "low",
  confidenceReason: "Needs manual review.",
  summary: "Likely municipal. District unclear.",
  staffGuidance: "Review manually.",
  residentExplanation: "Staff will review.",
  matchedClues: [],
  municipalityName: null,
  municipalityHintStatus: "not_attempted",
  parcelLookupStatus: "not_attempted",
  rightOfWayHint: "unclear",
};

const pendingSuggestion: AiSuggestion = {
  id: "suggestion-1",
  reportId: "report-1",
  summary: "Suggestion",
  suggestedCategory: "TRAFFIC",
  suggestedUrgency: "normal",
  suggestedResponsibleParty: "Traffic engineering",
  suggestedAgencyId: null,
  confidence: "medium",
  explanation: "Traffic issue.",
  recommendedNextStep: "Review.",
  missingInformation: [],
  draftResponse: "Staff will review.",
  model: null,
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
  feedbackDisposition: null,
  feedbackNote: null,
  feedbackCreatedAt: null,
  createdAt: "2026-07-20T12:00:00.000Z",
  agency: null,
};

test("buildStaffInboxFlags highlights actionable pilot triage work", () => {
  const flags = buildStaffInboxFlags({
    report: baseReport,
    jurisdiction: baseJurisdiction,
    referrals: [],
    aiSuggestions: [pendingSuggestion],
    now: new Date("2026-07-21T12:00:00.000Z"),
  });

  assert.deepEqual(flags, [
    "Needs first triage",
    "Unassigned",
    "Check location",
    "AI feedback pending",
    "Legacy category",
    "Internal test?",
  ]);
});

test("filterStaffInboxRows defaults unknown filters to active and searches text", () => {
  assert.equal(normalizeStaffInboxFilter("unexpected"), "active");

  const rows: StaffInboxRow[] = [
    {
      report: baseReport,
      jurisdiction: baseJurisdiction,
      referrals: [],
      aiSuggestions: [],
      flags: [],
      searchableText: "traffic coral way resident",
    },
    {
      report: { ...baseReport, id: "report-2", status: "resolved" },
      jurisdiction: baseJurisdiction,
      referrals: [],
      aiSuggestions: [],
      flags: [],
      searchableText: "housing voucher",
    },
  ];

  assert.equal(
    filterStaffInboxRows({ rows, filter: "active", query: "coral" }).length,
    1,
  );
  assert.equal(
    filterStaffInboxRows({ rows, filter: "active", query: "housing" }).length,
    0,
  );
  assert.equal(
    filterStaffInboxRows({ rows, filter: "resolved_closed", query: "housing" }).length,
    1,
  );
  assert.equal(
    filterStaffInboxRows({ rows, filter: "unassigned", query: "" }).length,
    1,
  );
  assert.equal(normalizeStaffInboxFilter("follow_up_due"), "follow_up_due");
});

test("flags and filters new assignments that have not been opened", () => {
  const assignedReport = {
    ...baseReport,
    assignedStaffId: "staff-1",
    assignedAt: "2026-07-21T10:00:00.000Z",
    description: "Streetlight assigned case",
  };
  const flags = buildStaffInboxFlags({
    report: assignedReport,
    jurisdiction: { ...baseJurisdiction, districtHintStatus: "likely_in_district" },
    referrals: [],
    aiSuggestions: [],
    assignmentSeen: false,
    now: new Date("2026-07-21T12:00:00.000Z"),
  });

  assert.ok(flags.includes("New assignment"));

  const rows: StaffInboxRow[] = [
    {
      report: assignedReport,
      jurisdiction: baseJurisdiction,
      referrals: [],
      aiSuggestions: [],
      flags,
      searchableText: "streetlight",
    },
  ];

  assert.equal(
    filterStaffInboxRows({
      rows,
      filter: "needs_acknowledgment",
      query: "",
    }).length,
    1,
  );
  assert.equal(
    getStaffInboxFilterOptions(rows).find(
      (option) => option.key === "needs_acknowledgment",
    )?.label,
    "New assignments",
  );
});

test("only the assigned coworker's session can mark an assignment seen", () => {
  const assignedReport = {
    ...baseReport,
    assignedStaffId: "staff-david",
  };

  assert.equal(
    canStaffMemberMarkAssignmentSeen(assignedReport, "staff-david"),
    true,
  );
  assert.equal(
    canStaffMemberMarkAssignmentSeen(assignedReport, "staff-diego"),
    false,
  );
  assert.equal(canStaffMemberMarkAssignmentSeen(assignedReport, null), false);
  assert.equal(
    canStaffMemberMarkAssignmentSeen(
      { ...assignedReport, assignedStaffId: null },
      "staff-david",
    ),
    false,
  );
});
