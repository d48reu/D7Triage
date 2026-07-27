import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("builds a staff pilot backup with reports and related records", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-backup-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const { buildPilotDataBackup } = await import("../src/lib/pilot-data-backup");

  const report = repository.createIssueReport({
    category: "Traffic",
    description: "Signal timing issue",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    residentEmail: "resident@example.com",
    contactConsent: true,
  });

  repository.addStaffNote({
    reportId: report.id,
    body: "Caller asked for a follow-up after inspection.",
  });
  repository.addIssueAuditEvents({
    reportId: report.id,
    changes: [
      {
        fieldName: "description",
        fieldLabel: "Description",
        oldValue: "Signal timing issue",
        newValue: "Signal timing issue near school zone",
      },
    ],
  });
  repository.addAttachment({
    reportId: report.id,
    fileName: "signal.jpg",
    storagePath: path.join(dataDir, "attachments", "signal.jpg"),
    mimeType: "image/jpeg",
    sizeBytes: 512,
  });
  repository.addAiSuggestion({
    reportId: report.id,
    summary: "Traffic signal timing complaint.",
    suggestedCategory: "Traffic",
    suggestedUrgency: "normal",
    suggestedResponsibleParty: "Miami-Dade DTPW traffic signals",
    confidence: "medium",
    explanation: "Address and description mention a signal timing issue.",
    recommendedNextStep: "Refer for traffic signal timing review.",
    missingInformation: ["nearest cross street"],
    draftResponse: "Staff will review this traffic signal issue.",
  });
  repository.addReferral({
    reportId: report.id,
    agencyName: "Miami-Dade DTPW",
    referralMethod: "email",
  });

  const backup = buildPilotDataBackup();

  assert.equal(backup.schemaVersion, 2);
  assert.equal(backup.reports.length, 1);
  assert.equal(backup.reports[0].report.id, report.id);
  assert.equal(backup.reports[0].staffNotes.length, 1);
  assert.equal(backup.reports[0].auditEvents.length, 1);
  assert.equal(backup.reports[0].attachments.length, 1);
  assert.equal(backup.reports[0].aiSuggestions.length, 1);
  assert.equal(backup.reports[0].referrals.length, 1);
});
