import assert from "node:assert/strict";
import test from "node:test";
import {
  ISSUE_CATEGORIES,
  inferIssueCategoryFromText,
  normalizeIssueCategory,
  resolveIntakeBoardCategory,
} from "../src/lib/issue-types";
import { getRoutingRule } from "../src/lib/routing-matrix";

test("keeps staff categories alphabetical with Other / unsure last", () => {
  const standardCategories = ISSUE_CATEGORIES.slice(0, -1);

  assert.deepEqual(
    standardCategories,
    [...standardCategories].sort((left, right) => left.localeCompare(right)),
  );
  assert.equal(ISSUE_CATEGORIES.at(-1), "Other / unsure");
  assert.equal(getRoutingRule("TREES")?.category, "TREES");
});

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
  assert.equal(normalizeIssueCategory("Trees"), "TREES");
});

test("infers housing, storm-drain, parking, and tree categories from intake text", () => {
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

  assert.equal(
    inferIssueCategoryFromText({
      category: "Other / unsure",
      description: "A large tree limb is hanging over the sidewalk.",
      addressText: "123 Main Street",
    }),
    "TREES",
  );
});

test("requires an explicit intake-board action before changing a saved category", () => {
  assert.equal(
    resolveIntakeBoardCategory({
      currentCategory: "TRAFFIC",
      submittedCategory: "HOUSING",
      categoryChangeConfirmed: false,
      description: "Roundabout maintenance and traffic signs",
      addressText: "SW 128 Street and SW 107 Avenue",
    }),
    "TRAFFIC",
  );

  assert.equal(
    resolveIntakeBoardCategory({
      currentCategory: "TRAFFIC",
      submittedCategory: "PARKING ENFORCEMENT",
      categoryChangeConfirmed: true,
      description: "Vehicle repeatedly blocks the driveway",
      addressText: "123 Main Street",
    }),
    "PARKING ENFORCEMENT",
  );
});
