import assert from "node:assert/strict";
import test from "node:test";
import {
  createStaffPasswordHash,
  getConfiguredStaffCredentialNames,
  verifyStaffPasswordHash,
} from "../src/lib/staff-passwords";

test("staff password hashes verify without storing plaintext", async () => {
  const password = "Example-Staff-Password-42";
  const hash = createStaffPasswordHash(
    password,
    Buffer.from("0123456789abcdef", "utf8"),
  );

  assert.equal(await verifyStaffPasswordHash(password, hash), true);
  assert.equal(await verifyStaffPasswordHash("wrong-password", hash), false);
  assert.equal(hash.includes(password), false);
});

test("individual credentials cover every active production staff member", () => {
  assert.deepEqual(getConfiguredStaffCredentialNames(), [
    "alejandro servali",
    "carol gustafson",
    "david garcia",
    "diego abreu",
  ]);
});

test("production keeps Karl's existing password without sharing it with coworkers", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSharedPassword = process.env.STAFF_PASSWORD;
  process.env.NODE_ENV = "production";
  process.env.STAFF_PASSWORD = "legacy-shared-password";

  try {
    const { verifyStaffPassword } = await import("../src/lib/staff-auth");
    assert.equal(
      await verifyStaffPassword("Carol Gustafson", "legacy-shared-password"),
      false,
    );
    assert.equal(
      await verifyStaffPassword(
        "Karl Eugene Boehm",
        "legacy-shared-password",
      ),
      true,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousSharedPassword === undefined) delete process.env.STAFF_PASSWORD;
    else process.env.STAFF_PASSWORD = previousSharedPassword;
  }
});
