import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("staff intake can set the initial case date and status", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-intake-overrides-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const report = repository.createIssueReport({
    category: "TRAFFIC",
    description: "Signal timing issue during school pickup",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    residentEmail: "resident@example.com",
    contactConsent: true,
    createdAt: "2026-07-10T12:00:00.000Z",
    initialStatus: "needs_review",
  });

  assert.equal(report.createdAt, "2026-07-10T12:00:00.000Z");
  assert.equal(report.status, "needs_review");

  const statusEvents = repository.listStatusEvents(report.id);
  assert.equal(statusEvents.length, 1);
  assert.equal(statusEvents[0].status, "needs_review");
  assert.equal(statusEvents[0].createdAt, "2026-07-10T12:00:00.000Z");

  const movedReport = repository.updateIssueCreatedAt({
    reportId: report.id,
    createdAt: "2026-06-15T12:00:00.000Z",
  });
  assert.equal(movedReport?.createdAt, "2026-06-15T12:00:00.000Z");
});
