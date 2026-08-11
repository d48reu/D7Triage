import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("stores and lists field-level audit events for a report", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-audit-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const report = repository.createIssueReport({
    category: "Traffic",
    description: "Signal timing issue",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    residentEmail: "resident@example.com",
    contactConsent: true,
  });

  repository.addIssueAuditEvents({
    reportId: report.id,
    actorLabel: "Karl Eugene Boehm",
    changes: [
      {
        fieldName: "description",
        fieldLabel: "Description",
        oldValue: "Signal timing issue",
        newValue: "Signal timing issue near school zone",
      },
    ],
  });

  const events = repository.listIssueAuditEvents(report.id);

  assert.equal(events.length, 1);
  assert.equal(events[0].reportId, report.id);
  assert.equal(events[0].eventType, "case_details_updated");
  assert.equal(events[0].fieldName, "description");
  assert.equal(events[0].fieldLabel, "Description");
  assert.equal(events[0].oldValue, "Signal timing issue");
  assert.equal(events[0].newValue, "Signal timing issue near school zone");
  assert.equal(events[0].actorLabel, "Karl Eugene Boehm");
  assert.match(events[0].createdAt, /^\d{4}-\d{2}-\d{2}T/);

  assert.throws(
    () =>
      repository.addIssueAuditEvents({
        reportId: report.id,
        actorLabel: "Staff",
        changes: [
          {
            fieldName: "category",
            fieldLabel: "Category",
            oldValue: "Traffic",
            newValue: "Trees",
          },
        ],
      }),
    /named audit actor is required/,
  );
});
