import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("case mutations are atomic and reject a stale revision", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-revision-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const report = repository.createIssueReport({
    category: "PARKING ENFORCEMENT",
    description: "Vehicle blocking the sidewalk near the corner",
    addressText: "111 NW 1st Street, Miami, FL 33128",
    residentEmail: "",
    contactConsent: false,
  });
  assert.ok(report);
  assert.equal(report.revision, 1);

  repository.runIssueMutationTransaction(() => {
    repository.requireIssueRevision(report.id, report.revision);
    repository.updateIssueDetails({
      reportId: report.id,
      category: "TREES",
      description: report.description,
      intakeNotes: "Front desk note",
      resolutionNotes: report.resolutionNotes,
      addressText: report.addressText,
      residentName: report.residentName,
      residentEmail: report.residentEmail,
      residentPhone: report.residentPhone,
      preferredLanguage: report.preferredLanguage,
      contactConsent: report.contactConsent,
      newsletterOptIn: report.newsletterOptIn,
    });
    repository.updateIssueStatus({
      reportId: report.id,
      status: "needs_review",
    });
  });

  const updated = repository.getIssueReportById(report.id);
  assert.ok(updated);
  assert.equal(updated.category, "TREES");
  assert.equal(updated.status, "needs_review");
  assert.equal(updated.revision, 3);
  assert.throws(
    () => repository.requireIssueRevision(report.id, report.revision),
    repository.IssueRevisionConflictError,
  );

  assert.throws(() => {
    repository.runIssueMutationTransaction(() => {
      repository.requireIssueRevision(report.id, updated.revision);
      repository.updateIssueDetails({
        reportId: report.id,
        category: "HOUSING",
        description: report.description,
        intakeNotes: "This write must roll back",
        resolutionNotes: report.resolutionNotes,
        addressText: report.addressText,
        residentName: report.residentName,
        residentEmail: report.residentEmail,
        residentPhone: report.residentPhone,
        preferredLanguage: report.preferredLanguage,
        contactConsent: report.contactConsent,
        newsletterOptIn: report.newsletterOptIn,
      });
      throw new Error("simulate a later mutation failure");
    });
  }, /simulate a later mutation failure/);

  const afterRollback = repository.getIssueReportById(report.id);
  assert.ok(afterRollback);
  assert.equal(afterRollback.category, "TREES");
  assert.equal(afterRollback.intakeNotes, "Front desk note");
  assert.equal(afterRollback.revision, updated.revision);
});
