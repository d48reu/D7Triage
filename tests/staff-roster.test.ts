import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("adds Carol and Karl to the active assignment roster", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-staff-roster-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const matchingStaff = repository
    .listStaffMembers()
    .filter((staffMember) => staffMember.name === "Karl Eugene Boehm");

  assert.equal(matchingStaff.length, 1);
  assert.equal(matchingStaff[0].id, "staff-karl-eugene-boehm");
  assert.equal(matchingStaff[0].isActive, true);

  const carol = repository
    .listStaffMembers()
    .filter((staffMember) => staffMember.name === "Carol Gustafson");

  assert.equal(carol.length, 1);
  assert.equal(carol[0].id, "staff-carol-gustafson");
  assert.equal(carol[0].isActive, true);
});
