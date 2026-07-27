import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("tracks whether the current assignment has been seen", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-assignment-ack-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const report = repository.createIssueReport({
    category: "Traffic",
    description: "Traffic signal timing needs review",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    residentEmail: "resident@example.com",
    contactConsent: true,
  });
  const staffMember = repository.upsertStaffMember({
    name: "Assignment Tester",
    email: "tester@example.com",
    isActive: true,
  });

  assert.ok(staffMember);
  assert.equal(repository.getCurrentAssignmentAcknowledgment(report), null);

  const assigned = repository.assignIssueReport({
    reportId: report.id,
    staffMemberId: staffMember.id,
  });

  assert.ok(assigned?.assignedAt);
  assert.equal(repository.getCurrentAssignmentAcknowledgment(assigned), null);

  const acknowledgment = repository.acknowledgeAssignment({
    reportId: report.id,
    staffMemberId: staffMember.id,
  });

  assert.ok(acknowledgment);
  assert.equal(acknowledgment.reportId, report.id);
  assert.equal(acknowledgment.staffMemberId, staffMember.id);
  assert.ok(repository.getCurrentAssignmentAcknowledgment(assigned));
});
