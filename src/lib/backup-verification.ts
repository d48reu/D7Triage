import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

export type BackupVerificationResult = {
  ok: boolean;
  checkedAt: string;
  snapshotDir: string;
  databaseIntegrity: string;
  attachmentFileCount: number;
  attachmentBytes: number;
  errors: string[];
};

type BackupManifest = {
  schemaVersion?: unknown;
  databaseFile?: unknown;
  attachmentDirectories?: unknown;
  attachmentFileCount?: unknown;
  attachmentBytes?: unknown;
};

export async function verifyDataBackupSnapshot(
  snapshotDir: string,
): Promise<BackupVerificationResult> {
  const errors: string[] = [];
  const manifest = await readManifest(snapshotDir, errors);
  const databaseFile =
    typeof manifest?.databaseFile === "string" && manifest.databaseFile
      ? manifest.databaseFile
      : "issues.db";
  const databasePath = path.resolve(snapshotDir, databaseFile);
  const databaseIntegrity = isWithinDirectory(databasePath, snapshotDir)
    ? verifyDatabase(databasePath, errors)
    : (() => {
        errors.push("Backup manifest contains an unsafe database path.");
        return "unavailable";
      })();
  const attachmentDirectories = Array.isArray(manifest?.attachmentDirectories)
    ? manifest.attachmentDirectories.filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      )
    : ["uploads", "historical-attachments"];
  const summary = { fileCount: 0, bytes: 0 };

  for (const directory of attachmentDirectories) {
    const resolved = path.resolve(snapshotDir, directory);
    if (!isWithinDirectory(resolved, snapshotDir)) {
      errors.push("Backup manifest contains an unsafe attachment directory.");
      continue;
    }
    await summarizeFiles(resolved, summary, errors);
  }

  if (
    typeof manifest?.attachmentFileCount === "number" &&
    manifest.attachmentFileCount !== summary.fileCount
  ) {
    errors.push(
      `Attachment count mismatch: manifest ${manifest.attachmentFileCount}, actual ${summary.fileCount}.`,
    );
  }
  if (
    typeof manifest?.attachmentBytes === "number" &&
    manifest.attachmentBytes !== summary.bytes
  ) {
    errors.push(
      `Attachment byte mismatch: manifest ${manifest.attachmentBytes}, actual ${summary.bytes}.`,
    );
  }

  return {
    ok: errors.length === 0 && databaseIntegrity === "ok",
    checkedAt: new Date().toISOString(),
    snapshotDir,
    databaseIntegrity,
    attachmentFileCount: summary.fileCount,
    attachmentBytes: summary.bytes,
    errors,
  };
}

async function readManifest(snapshotDir: string, errors: string[]) {
  try {
    const value = JSON.parse(
      await fs.readFile(path.join(snapshotDir, "manifest.json"), "utf8"),
    ) as BackupManifest;
    if (value.schemaVersion !== 1) {
      errors.push("Backup manifest schema version is not supported.");
    }
    return value;
  } catch {
    errors.push("Backup manifest is missing or invalid.");
    return null;
  }
}

function verifyDatabase(databasePath: string, errors: string[]) {
  let database: Database.Database | null = null;
  try {
    database = new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    const rows = database.pragma("integrity_check") as Array<
      Record<string, string>
    >;
    const result = rows.map((row) => Object.values(row)[0]).join("; ") || "unknown";
    if (result !== "ok") {
      errors.push(`SQLite integrity check returned: ${result}.`);
    }
    return result;
  } catch {
    errors.push("Backup database could not be opened for verification.");
    return "unavailable";
  } finally {
    database?.close();
  }
}

async function summarizeFiles(
  directory: string,
  summary: { fileCount: number; bytes: number },
  errors: string[],
) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    errors.push("An attachment directory could not be read.");
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await summarizeFiles(entryPath, summary, errors);
    } else if (entry.isFile()) {
      const stats = await fs.stat(entryPath);
      summary.fileCount += 1;
      summary.bytes += stats.size;
    }
  }
}

function isWithinDirectory(candidate: string, parent: string) {
  const relative = path.relative(path.resolve(parent), candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
