import assert from "node:assert/strict";
import test from "node:test";
import {
  compareIntakeMonthLabelsDescending,
  formatIntakeMonthGroup,
  intakeDraftMatchesSavedCase,
  intakeCaseMatchesSearch,
  nextIntakeMonthLabel,
  validateIntakeDraftForSave,
  type IntakeBoardCase,
} from "../src/lib/intake-board";

const intakeCase: IntakeBoardCase = {
  id: "report-1",
  publicTrackingToken: "token-1",
  status: "received",
  assignedStaffId: null,
  category: "STREETLIGHTS",
  description: "Streetlight is out near the park",
  intakeNotes: "Caller reports the outage happens every evening.",
  resolutionNotes: "Referred to public works for repair scheduling.",
  addressText: "3750 S Dixie Highway, Miami, FL",
  residentName: "Denise Tyre",
  residentEmail: "denise@example.com",
  residentPhone: "305-555-0100",
  createdAt: "2026-07-22T12:00:00.000Z",
  districtLabel: "Likely in D7",
  attachmentCount: 2,
};

test("formats and orders intake groups by month", () => {
  assert.equal(
    formatIntakeMonthGroup("2026-07-22T12:00:00.000Z"),
    "2026 July",
  );
  assert.deepEqual(
    ["2026 June", "2026 August", "2026 July"].sort(
      compareIntakeMonthLabelsDescending,
    ),
    ["2026 August", "2026 July", "2026 June"],
  );
  assert.equal(
    nextIntakeMonthLabel(["2026 June", "2026 July"], "2026 July"),
    "2026 August",
  );
});

test("searches saved intake cases across receptionist-facing fields", () => {
  assert.equal(intakeCaseMatchesSearch(intakeCase, "denise"), true);
  assert.equal(intakeCaseMatchesSearch(intakeCase, "dixie highway"), true);
  assert.equal(intakeCaseMatchesSearch(intakeCase, "streetlights"), true);
  assert.equal(intakeCaseMatchesSearch(intakeCase, "every evening"), true);
  assert.equal(intakeCaseMatchesSearch(intakeCase, "repair scheduling"), true);
  assert.equal(intakeCaseMatchesSearch(intakeCase, "housing"), false);
});

test("recognizes a stale local draft that already exists as a saved case", () => {
  assert.equal(
    intakeDraftMatchesSavedCase(
      {
        residentName: intakeCase.residentName,
        dateValue: intakeCase.createdAt.slice(0, 10),
        description: intakeCase.description,
        resolutionNotes: intakeCase.resolutionNotes,
        addressText: intakeCase.addressText,
        residentPhone: intakeCase.residentPhone,
        residentEmail: intakeCase.residentEmail,
      },
      intakeCase,
    ),
    true,
  );

  assert.equal(
    intakeDraftMatchesSavedCase(
      {
        residentName: intakeCase.residentName,
        dateValue: intakeCase.createdAt.slice(0, 10),
        description: `${intakeCase.description} New caller detail.`,
        resolutionNotes: intakeCase.resolutionNotes,
        addressText: intakeCase.addressText,
        residentPhone: intakeCase.residentPhone,
        residentEmail: intakeCase.residentEmail,
      },
      intakeCase,
    ),
    false,
  );
});

test("explains why a new intake draft cannot be saved", () => {
  assert.equal(
    validateIntakeDraftForSave({
      category: "TREES",
      dateValue: "2026-08-11",
      status: "received",
      description: "Test",
      addressText: "123 Main Street",
    }),
    "Call summary must be at least 12 characters before saving.",
  );

  assert.equal(
    validateIntakeDraftForSave({
      category: "",
      dateValue: "2026-08-11",
      status: "received",
      description: "Tree blocks the sidewalk",
      addressText: "",
    }),
    "Complete these required fields: category and address.",
  );

  assert.equal(
    validateIntakeDraftForSave({
      category: "TREES",
      dateValue: "2026-08-11",
      status: "received",
      description: "Tree blocks the sidewalk",
      addressText: "123 Main Street",
    }),
    null,
  );
});
