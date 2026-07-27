import assert from "node:assert/strict";
import test from "node:test";
import {
  getDeliverableEmail,
  isValidOptionalEmail,
} from "../src/lib/contact-details";

test("allows a case to omit an email address", () => {
  assert.equal(isValidOptionalEmail(""), true);
  assert.equal(isValidOptionalEmail("   "), true);
});

test("validates an email address when one is provided", () => {
  assert.equal(isValidOptionalEmail("resident@example.com"), true);
  assert.equal(isValidOptionalEmail("resident.example.com"), false);
  assert.equal(isValidOptionalEmail("resident @example.com"), false);
});

test("keeps contact notes out of email delivery", () => {
  assert.equal(getDeliverableEmail(" resident@example.com "), "resident@example.com");
  assert.equal(getDeliverableEmail("No email — telephone only"), null);
  assert.equal(getDeliverableEmail("N/A"), null);
});
