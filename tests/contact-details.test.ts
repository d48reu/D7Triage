import assert from "node:assert/strict";
import test from "node:test";
import { isValidOptionalEmail } from "../src/lib/contact-details";

test("allows a case to omit an email address", () => {
  assert.equal(isValidOptionalEmail(""), true);
  assert.equal(isValidOptionalEmail("   "), true);
});

test("validates an email address when one is provided", () => {
  assert.equal(isValidOptionalEmail("resident@example.com"), true);
  assert.equal(isValidOptionalEmail("resident.example.com"), false);
  assert.equal(isValidOptionalEmail("resident @example.com"), false);
});
