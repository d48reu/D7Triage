import assert from "node:assert/strict";
import test from "node:test";
import {
  inferIssueCategoryFromText,
  normalizeIssueCategory,
} from "../src/lib/issue-types";

test("normalizes legacy category labels to the current staff category set", () => {
  assert.equal(normalizeIssueCategory("Roads and potholes"), "TRAFFIC");
  assert.equal(normalizeIssueCategory("Traffic safety"), "TRAFFIC");
  assert.equal(normalizeIssueCategory("Drainage and flooding"), "FLOODING");
  assert.equal(
    normalizeIssueCategory("Solid waste and illegal dumping"),
    "ILLEGAL DUMPING/TRASH",
  );
  assert.equal(normalizeIssueCategory("Sidewalks"), "SIDEWALKS");
  assert.equal(
    normalizeIssueCategory("Parking enforcement"),
    "PARKING ENFORCEMENT",
  );
});

test("infers housing, storm-drain, and parking categories from intake text", () => {
  assert.equal(
    inferIssueCategoryFromText({
      category: "Other / unsure",
      description:
        "Elderly resident needs help with an affordable housing voucher and lease renewal.",
      addressText: "n/a",
    }),
    "HOUSING",
  );

  assert.equal(
    inferIssueCategoryFromText({
      category: "TRAFFIC",
      description:
        "Storm drain is below street level and affecting traffic flow near the curb lane.",
      addressText: "6690 SW 40th St, Miami, FL 33155",
    }),
    "FLOODING",
  );

  assert.equal(
    inferIssueCategoryFromText({
      category: "Other / unsure",
      description:
        "A vehicle is illegally parked across the sidewalk and blocking the driveway.",
      addressText: "123 Main Street",
    }),
    "PARKING ENFORCEMENT",
  );
});
