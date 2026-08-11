import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("a clean demo database seeds its complete roster and assigned cases", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-demo-init-test-"));
  process.env.DATA_DIR = dataDir;
  process.env.DEMO_MODE = "true";

  const repository = await import("../src/lib/issues-repository");
  const staff = repository.listStaffMembers();
  const reports = repository.listAllIssueReports();

  assert.ok(staff.some((member) => member.id === "staff-diego-abreu"));
  assert.ok(staff.some((member) => member.id === "staff-karl-eugene-boehm"));
  assert.ok(reports.some((report) => report.assignedStaffId === "staff-diego-abreu"));
  assert.ok(reports.some((report) => report.assignedStaffId === "staff-carol-gustafson"));
});
