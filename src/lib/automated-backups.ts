import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir, getDbPath, getUploadsDir } from "@/lib/data-paths";
import { backupIssuesDatabase } from "@/lib/issues-repository";

const DEFAULT_INTERVAL_HOURS = 24;
const DEFAULT_RETENTION_COUNT = 3;
const DEFAULT_INITIAL_DELAY_SECONDS = 60;
const SNAPSHOT_PREFIX = "backup-";

type BackupSchedulerGlobal = typeof globalThis & {
  __district7BackupSchedulerStarted?: boolean;
  __district7BackupInFlight?: Promise<DataBackupResult> | null;
};

export type DataBackupResult = {
  createdAt: string;
  snapshotDir: string;
  databasePath: string;
  attachmentFileCount: number;
  attachmentBytes: number;
};

export async function createDataBackup(input?: {
  now?: Date;
  retentionCount?: number;
}): Promise<DataBackupResult> {
  const now = input?.now ?? new Date();
  const createdAt = now.toISOString();
  const retentionCount = positiveInteger(
    input?.retentionCount,
    configuredPositiveInteger(
      process.env.AUTOMATED_BACKUP_RETENTION_COUNT,
      DEFAULT_RETENTION_COUNT,
    ),
  );
  const backupsDir = getBackupsDir();
  const snapshotName = `${SNAPSHOT_PREFIX}${createdAt.replace(/[:.]/g, "-")}`;
  const snapshotDir = path.join(backupsDir, snapshotName);
  const partialDir = path.join(backupsDir, `.partial-${snapshotName}`);

  await fs.mkdir(backupsDir, { recursive: true });
  await removeVerifiedBackupPath(partialDir, backupsDir);
  await fs.mkdir(partialDir, { recursive: true });

  try {
    const databasePath = path.join(partialDir, "issues.db");
    await backupIssuesDatabase(databasePath);

    const attachmentSummary = { fileCount: 0, bytes: 0 };
    await copyBackupTree({
      sourceDir: getUploadsDir(),
      destinationDir: path.join(partialDir, "uploads"),
      summary: attachmentSummary,
    });
    await copyBackupTree({
      sourceDir: path.join(getDataDir(), "historical-attachments"),
      destinationDir: path.join(partialDir, "historical-attachments"),
      summary: attachmentSummary,
    });

    await fs.writeFile(
      path.join(partialDir, "manifest.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          createdAt,
          sourceDatabase: getDbPath(),
          databaseFile: "issues.db",
          attachmentDirectories: ["uploads", "historical-attachments"],
          attachmentFileCount: attachmentSummary.fileCount,
          attachmentBytes: attachmentSummary.bytes,
        },
        null,
        2,
      ),
      "utf8",
    );

    await fs.rename(partialDir, snapshotDir);
    await pruneDataBackups(retentionCount);

    return {
      createdAt,
      snapshotDir,
      databasePath: path.join(snapshotDir, "issues.db"),
      attachmentFileCount: attachmentSummary.fileCount,
      attachmentBytes: attachmentSummary.bytes,
    };
  } catch (error) {
    await removeVerifiedBackupPath(partialDir, backupsDir);
    throw error;
  }
}

export async function runAutomatedBackupIfDue() {
  const schedulerGlobal = globalThis as BackupSchedulerGlobal;
  if (schedulerGlobal.__district7BackupInFlight) {
    return schedulerGlobal.__district7BackupInFlight;
  }

  const intervalHours = configuredPositiveInteger(
    process.env.AUTOMATED_BACKUP_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  if (!(await isBackupDue(intervalHours))) return null;

  const backupPromise = createDataBackup();
  schedulerGlobal.__district7BackupInFlight = backupPromise;
  try {
    return await backupPromise;
  } finally {
    schedulerGlobal.__district7BackupInFlight = null;
  }
}

export function startAutomatedBackupScheduler() {
  if (!isAutomatedBackupEnabled()) return;

  const schedulerGlobal = globalThis as BackupSchedulerGlobal;
  if (schedulerGlobal.__district7BackupSchedulerStarted) return;
  schedulerGlobal.__district7BackupSchedulerStarted = true;

  const intervalHours = configuredPositiveInteger(
    process.env.AUTOMATED_BACKUP_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const initialDelaySeconds = configuredPositiveInteger(
    process.env.AUTOMATED_BACKUP_INITIAL_DELAY_SECONDS,
    DEFAULT_INITIAL_DELAY_SECONDS,
  );
  const run = async () => {
    try {
      const result = await runAutomatedBackupIfDue();
      if (result) {
        console.info("[backup] data snapshot completed", {
          createdAt: result.createdAt,
          snapshotDir: result.snapshotDir,
          attachmentFileCount: result.attachmentFileCount,
          attachmentBytes: result.attachmentBytes,
        });
      }
    } catch (error) {
      console.error("[backup] data snapshot failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const firstRun = setTimeout(run, initialDelaySeconds * 1000);
  firstRun.unref();
  const interval = setInterval(run, intervalHours * 60 * 60 * 1000);
  interval.unref();
}

export function getBackupsDir() {
  return path.join(getDataDir(), "backups");
}

function isAutomatedBackupEnabled() {
  const configuredValue = process.env.AUTOMATED_BACKUPS_ENABLED
    ?.trim()
    .toLowerCase();
  if (configuredValue) return configuredValue === "true";

  return process.env.NODE_ENV === "production" && Boolean(process.env.DATA_DIR);
}

async function isBackupDue(intervalHours: number) {
  const backupsDir = getBackupsDir();
  const entries = await listSnapshotNames(backupsDir);
  if (entries.length === 0) return true;

  const latestSnapshot = path.join(backupsDir, entries[0]);
  const stats = await fs.stat(latestSnapshot);
  return Date.now() - stats.mtimeMs >= intervalHours * 60 * 60 * 1000;
}

async function pruneDataBackups(retentionCount: number) {
  const backupsDir = getBackupsDir();
  const snapshotNames = await listSnapshotNames(backupsDir);
  for (const snapshotName of snapshotNames.slice(retentionCount)) {
    await removeVerifiedBackupPath(path.join(backupsDir, snapshotName), backupsDir);
  }
}

async function listSnapshotNames(backupsDir: string) {
  try {
    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(SNAPSHOT_PREFIX))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function copyBackupTree(input: {
  sourceDir: string;
  destinationDir: string;
  summary: { fileCount: number; bytes: number };
}) {
  let entries;
  try {
    entries = await fs.readdir(input.sourceDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }

  await fs.mkdir(input.destinationDir, { recursive: true });
  for (const entry of entries) {
    const sourcePath = path.join(input.sourceDir, entry.name);
    const destinationPath = path.join(input.destinationDir, entry.name);
    if (entry.isDirectory()) {
      await copyBackupTree({
        sourceDir: sourcePath,
        destinationDir: destinationPath,
        summary: input.summary,
      });
    } else if (entry.isFile()) {
      const stats = await fs.stat(sourcePath);
      await fs.copyFile(sourcePath, destinationPath);
      input.summary.fileCount += 1;
      input.summary.bytes += stats.size;
    }
  }
}

async function removeVerifiedBackupPath(targetPath: string, backupsDir: string) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBackupsDir = path.resolve(backupsDir);
  if (
    resolvedTarget === resolvedBackupsDir ||
    path.dirname(resolvedTarget) !== resolvedBackupsDir
  ) {
    throw new Error("Refusing to remove a path outside the backup directory.");
  }
  await fs.rm(resolvedTarget, { recursive: true, force: true });
}

function configuredPositiveInteger(value: string | undefined, fallback: number) {
  return positiveInteger(Number(value), fallback);
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
