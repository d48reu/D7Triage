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

test("staff intake accepts a blank email or a telephone-only contact note", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-intake-no-email-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const report = repository.createIssueReport({
    category: "OTHER / UNSURE",
    description: "Caller does not use email and requested help by phone",
    addressText: "111 NW 1st Street, Miami, FL 33128",
    residentEmail: "",
    residentPhone: "305-555-0100",
    contactConsent: true,
  });

  assert.equal(report.residentEmail, "");
  assert.equal(repository.listNotificationEvents(report.id).length, 0);

  const updatedReport = repository.updateIssueDetails({
    reportId: report.id,
    category: report.category,
    description: report.description,
    addressText: report.addressText,
    residentName: report.residentName,
    residentEmail: "",
    residentPhone: "305-555-0101",
    preferredLanguage: report.preferredLanguage,
    contactConsent: report.contactConsent,
    newsletterOptIn: report.newsletterOptIn,
  });

  assert.equal(updatedReport?.residentEmail, "");
  assert.equal(updatedReport?.residentPhone, "305-555-0101");

  const noteOnlyReport = repository.createIssueReport({
    category: "OTHER / UNSURE",
    description: "Resident should be contacted by telephone",
    addressText: "222 NW 2nd Street, Miami, FL 33128",
    residentEmail: "No email — telephone only",
    residentPhone: "305-555-0102",
    contactConsent: true,
    newsletterOptIn: true,
  });

  assert.equal(noteOnlyReport.residentEmail, "No email — telephone only");
  assert.equal(noteOnlyReport.newsletterOptIn, false);
  assert.equal(repository.listNotificationEvents(noteOnlyReport.id).length, 0);
});
