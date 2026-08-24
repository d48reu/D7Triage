import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

test("automatic snapshots include a consistent database and all attachment trees", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-backup-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  const backups = await import("../src/lib/automated-backups");
  const verification = await import("../src/lib/backup-verification");
  const offsite = await import("../src/lib/offsite-backups");
  const report = repository.createIssueReport({
    category: "Trees",
    description: "Tree branch blocking sidewalk",
    addressText: "Local backup test",
    residentEmail: "No email — telephone only",
    contactConsent: false,
  });

  const caseUpload = path.join(dataDir, "uploads", report.id, "photo.jpg");
  const eventUpload = path.join(dataDir, "uploads", "events", "event-1", "plan.pdf");
  const historicalUpload = path.join(dataDir, "historical-attachments", "archive.pdf");
  fs.mkdirSync(path.dirname(caseUpload), { recursive: true });
  fs.mkdirSync(path.dirname(eventUpload), { recursive: true });
  fs.mkdirSync(path.dirname(historicalUpload), { recursive: true });
  fs.writeFileSync(caseUpload, "case-photo");
  fs.writeFileSync(eventUpload, "event-plan");
  fs.writeFileSync(historicalUpload, "historical-file");

  const first = await backups.createDataBackup({
    now: new Date("2026-08-11T07:00:00.000Z"),
    retentionCount: 2,
  });

  assert.equal(first.attachmentFileCount, 3);
  assert.ok(fs.existsSync(first.databasePath));
  assert.ok(fs.existsSync(path.join(first.snapshotDir, "uploads", report.id, "photo.jpg")));
  assert.ok(fs.existsSync(path.join(first.snapshotDir, "uploads", "events", "event-1", "plan.pdf")));
  assert.ok(fs.existsSync(path.join(first.snapshotDir, "historical-attachments", "archive.pdf")));

  const snapshotDatabase = new Database(first.databasePath, { readonly: true });
  const backedUpReport = snapshotDatabase
    .prepare("select category from issue_reports where id = ?")
    .get(report.id) as { category: string } | undefined;
  snapshotDatabase.close();
  assert.equal(backedUpReport?.category, "Trees");

  const verifiedSnapshot = await verification.verifyDataBackupSnapshot(
    first.snapshotDir,
  );
  assert.equal(verifiedSnapshot.ok, true);
  assert.equal(verifiedSnapshot.databaseIntegrity, "ok");
  assert.equal(verifiedSnapshot.attachmentFileCount, 3);

  const encryptedPath = path.join(dataDir, "encrypted-backup.tar.gz.enc");
  const encryptionSecret = "test-only-backup-encryption-secret-2026";
  await offsite.createEncryptedBackupBundle({
    snapshotDir: first.snapshotDir,
    outputPath: encryptedPath,
    encryptionSecret,
  });
  assert.ok(fs.existsSync(encryptedPath));

  const restoredSnapshot = await offsite.verifyEncryptedBackupBundle({
    encryptedPath,
    encryptionSecret,
    expectedSnapshotName: path.basename(first.snapshotDir),
    workDir: path.join(dataDir, "restore-work"),
  });
  assert.equal(restoredSnapshot.ok, true);
  assert.equal(restoredSnapshot.databaseIntegrity, "ok");
  assert.equal(restoredSnapshot.attachmentFileCount, 3);

  await backups.createDataBackup({
    now: new Date("2026-08-12T07:00:00.000Z"),
    retentionCount: 2,
  });
  await backups.createDataBackup({
    now: new Date("2026-08-13T07:00:00.000Z"),
    retentionCount: 2,
  });

  const retained = fs
    .readdirSync(backups.getBackupsDir(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("backup-"));
  assert.equal(retained.length, 2);
});
