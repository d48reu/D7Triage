import assert from "node:assert/strict";
import test from "node:test";
import {
  compareIntakeMonthLabelsDescending,
  formatIntakeMonthGroup,
  intakeCaseMatchesSearch,
  nextIntakeMonthLabel,
  type IntakeBoardCase,
} from "../src/lib/intake-board";

const intakeCase: IntakeBoardCase = {
  id: "report-1",
  publicTrackingToken: "token-1",
  status: "received",
  assignedStaffId: null,
  category: "STREETLIGHTS",
  description: "Streetlight is out near the park",
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
  assert.equal(intakeCaseMatchesSearch(intakeCase, "housing"), false);
});
