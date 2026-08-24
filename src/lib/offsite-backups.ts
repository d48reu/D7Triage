import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import * as tar from "tar";
import {
  verifyDataBackupSnapshot,
  type BackupVerificationResult,
} from "@/lib/backup-verification";
import { getDataDir } from "@/lib/data-paths";
import type { DataBackupResult } from "@/lib/automated-backups";

const BUNDLE_MAGIC = Buffer.from("D7BACKUP01", "ascii");
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const DEFAULT_RETENTION_COUNT = 14;

export type OffsiteBackupHealth = {
  status: "disabled" | "not_configured" | "success" | "error";
  checkedAt: string;
  lastSuccessAt: string | null;
  objectKey: string | null;
  release: string;
  message: string;
  verification: BackupVerificationResult | null;
};

export type OffsiteBackupResult = OffsiteBackupHealth & {
  uploadedBytes?: number;
};

type OffsiteBackupConfig = {
  enabled: boolean;
  configured: boolean;
  missingVariables: string[];
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  encryptionSecret: string;
  forcePathStyle: boolean;
  prefix: string;
  retentionCount: number;
};

export async function uploadDataBackupOffsite(
  backup: DataBackupResult,
): Promise<OffsiteBackupResult> {
  const config = getOffsiteBackupConfig();
  const checkedAt = new Date().toISOString();
  const existingHealth = await readOffsiteBackupHealth();

  if (!config.enabled) {
    return writeOffsiteBackupHealth({
      status: "disabled",
      checkedAt,
      lastSuccessAt: existingHealth?.lastSuccessAt ?? null,
      objectKey: existingHealth?.objectKey ?? null,
      release: getReleaseLabel(),
      message: "Off-site backups are disabled.",
      verification: null,
    });
  }

  if (!config.configured) {
    return writeOffsiteBackupHealth({
      status: "not_configured",
      checkedAt,
      lastSuccessAt: existingHealth?.lastSuccessAt ?? null,
      objectKey: existingHealth?.objectKey ?? null,
      release: getReleaseLabel(),
      message: `Missing configuration: ${config.missingVariables.join(", ")}.`,
      verification: null,
    });
  }

  const verification = await verifyDataBackupSnapshot(backup.snapshotDir);
  if (!verification.ok) {
    return writeOffsiteBackupHealth({
      status: "error",
      checkedAt,
      lastSuccessAt: existingHealth?.lastSuccessAt ?? null,
      objectKey: existingHealth?.objectKey ?? null,
      release: getReleaseLabel(),
      message: "Local snapshot verification failed; nothing was uploaded.",
      verification,
    });
  }

  const workDir = path.join(getDataDir(), "backup-work");
  await fs.mkdir(workDir, { recursive: true });
  const snapshotName = path.basename(backup.snapshotDir);
  const encryptedPath = path.join(workDir, `${snapshotName}.tar.gz.enc`);
  const downloadedPath = path.join(
    workDir,
    `${snapshotName}.downloaded.tar.gz.enc`,
  );
  const objectKey = `${config.prefix}/${snapshotName}.tar.gz.enc`;

  try {
    await createEncryptedBackupBundle({
      snapshotDir: backup.snapshotDir,
      outputPath: encryptedPath,
      encryptionSecret: config.encryptionSecret,
    });
    const restoredVerification = await verifyEncryptedBackupBundle({
      encryptedPath,
      encryptionSecret: config.encryptionSecret,
      expectedSnapshotName: snapshotName,
      workDir,
    });
    if (!restoredVerification.ok) {
      throw new Error("Encrypted restore verification failed.");
    }

    const stats = await fs.stat(encryptedPath);
    const client = createS3Client(config);
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: fsSync.createReadStream(encryptedPath),
        ContentLength: stats.size,
        ContentType: "application/octet-stream",
        Metadata: {
          "snapshot-created-at": backup.createdAt,
          "database-integrity": verification.databaseIntegrity,
          release: getReleaseLabel(),
        },
      }),
    );
    const downloaded = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    if (!downloaded.Body) {
      throw new Error("Uploaded off-site backup could not be downloaded.");
    }
    await pipeline(
      Readable.from(downloaded.Body as AsyncIterable<Uint8Array>),
      fsSync.createWriteStream(downloadedPath),
    );
    const downloadedVerification = await verifyEncryptedBackupBundle({
      encryptedPath: downloadedPath,
      encryptionSecret: config.encryptionSecret,
      expectedSnapshotName: snapshotName,
      workDir,
    });
    if (!downloadedVerification.ok) {
      throw new Error("Downloaded off-site restore verification failed.");
    }
    await pruneOffsiteBackups(client, config);

    return writeOffsiteBackupHealth({
      status: "success",
      checkedAt,
      lastSuccessAt: checkedAt,
      objectKey,
      release: getReleaseLabel(),
      message: "Encrypted backup uploaded and restore-verified.",
      verification: downloadedVerification,
      uploadedBytes: stats.size,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "offsite_backup_failed",
        release: getReleaseLabel(),
        errorCode: classifyBackupError(error),
      }),
    );
    return writeOffsiteBackupHealth({
      status: "error",
      checkedAt,
      lastSuccessAt: existingHealth?.lastSuccessAt ?? null,
      objectKey: existingHealth?.objectKey ?? null,
      release: getReleaseLabel(),
      message: "Encrypted off-site backup failed. Check the Render logs.",
      verification,
    });
  } finally {
    await fs.rm(encryptedPath, { force: true });
    await fs.rm(downloadedPath, { force: true });
  }
}

export async function createEncryptedBackupBundle(input: {
  snapshotDir: string;
  outputPath: string;
  encryptionSecret: string;
}) {
  const snapshotName = path.basename(input.snapshotDir);
  const archivePath = `${input.outputPath}.plain.tar.gz`;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(input.encryptionSecret),
    iv,
  );

  await fs.mkdir(path.dirname(input.outputPath), { recursive: true });
  try {
    await tar.c(
      {
        cwd: path.dirname(input.snapshotDir),
        file: archivePath,
        gzip: true,
        portable: true,
      },
      [snapshotName],
    );
    await fs.writeFile(input.outputPath, Buffer.concat([BUNDLE_MAGIC, iv]));
    await pipeline(
      fsSync.createReadStream(archivePath),
      cipher,
      fsSync.createWriteStream(input.outputPath, { flags: "a" }),
    );
    await fs.appendFile(input.outputPath, cipher.getAuthTag());
    return input.outputPath;
  } finally {
    await fs.rm(archivePath, { force: true });
  }
}

export async function verifyEncryptedBackupBundle(input: {
  encryptedPath: string;
  encryptionSecret: string;
  expectedSnapshotName: string;
  workDir: string;
}) {
  const stats = await fs.stat(input.encryptedPath);
  const headerBytes = BUNDLE_MAGIC.length + IV_BYTES;
  if (stats.size <= headerBytes + AUTH_TAG_BYTES) {
    throw new Error("Encrypted backup bundle is incomplete.");
  }

  const handle = await fs.open(input.encryptedPath, "r");
  let iv: Buffer;
  let tag: Buffer;
  try {
    const header = Buffer.alloc(headerBytes);
    await handle.read(header, 0, header.length, 0);
    if (!header.subarray(0, BUNDLE_MAGIC.length).equals(BUNDLE_MAGIC)) {
      throw new Error("Encrypted backup bundle header is invalid.");
    }
    iv = header.subarray(BUNDLE_MAGIC.length);
    tag = Buffer.alloc(AUTH_TAG_BYTES);
    await handle.read(tag, 0, tag.length, stats.size - AUTH_TAG_BYTES);
  } finally {
    await handle.close();
  }

  const restoreRoot = path.join(
    input.workDir,
    `restore-check-${crypto.randomUUID()}`,
  );
  const archivePath = path.join(restoreRoot, "restore.tar.gz");
  const extractDir = path.join(restoreRoot, "extracted");
  await fs.mkdir(extractDir, { recursive: true });
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(input.encryptionSecret),
    iv,
  );
  decipher.setAuthTag(tag);

  try {
    await pipeline(
      fsSync.createReadStream(input.encryptedPath, {
        start: headerBytes,
        end: stats.size - AUTH_TAG_BYTES - 1,
      }),
      decipher,
      fsSync.createWriteStream(archivePath),
    );
    await tar.x({ cwd: extractDir, file: archivePath, strict: true });
    return await verifyDataBackupSnapshot(
      path.join(extractDir, input.expectedSnapshotName),
    );
  } finally {
    await fs.rm(restoreRoot, { recursive: true, force: true });
  }
}

export function getOffsiteBackupConfiguration() {
  const config = getOffsiteBackupConfig();
  return {
    enabled: config.enabled,
    configured: config.configured,
    missingVariables: config.missingVariables,
    bucket: config.bucket || null,
    endpoint: config.endpoint ?? null,
    retentionCount: config.retentionCount,
  };
}

export async function readOffsiteBackupHealth() {
  try {
    return JSON.parse(
      await fs.readFile(getHealthPath(), "utf8"),
    ) as OffsiteBackupHealth;
  } catch {
    return null;
  }
}

function getOffsiteBackupConfig(): OffsiteBackupConfig {
  const enabled = readBoolean(process.env.OFFSITE_BACKUPS_ENABLED, false);
  const bucket = process.env.OFFSITE_BACKUP_BUCKET?.trim() ?? "";
  const region = process.env.OFFSITE_BACKUP_REGION?.trim() || "us-east-1";
  const endpoint = process.env.OFFSITE_BACKUP_ENDPOINT?.trim() || undefined;
  const accessKeyId = process.env.OFFSITE_BACKUP_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey =
    process.env.OFFSITE_BACKUP_SECRET_ACCESS_KEY?.trim() ?? "";
  const encryptionSecret =
    process.env.OFFSITE_BACKUP_ENCRYPTION_SECRET?.trim() ?? "";
  const missingVariables = [
    ["OFFSITE_BACKUP_BUCKET", bucket],
    ["OFFSITE_BACKUP_ACCESS_KEY_ID", accessKeyId],
    ["OFFSITE_BACKUP_SECRET_ACCESS_KEY", secretAccessKey],
    ["OFFSITE_BACKUP_ENCRYPTION_SECRET", encryptionSecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    enabled,
    configured: enabled && missingVariables.length === 0,
    missingVariables,
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    encryptionSecret,
    forcePathStyle: readBoolean(
      process.env.OFFSITE_BACKUP_FORCE_PATH_STYLE,
      Boolean(endpoint),
    ),
    prefix:
      process.env.OFFSITE_BACKUP_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ||
      "district-7",
    retentionCount: positiveInteger(
      process.env.OFFSITE_BACKUP_RETENTION_COUNT,
      DEFAULT_RETENTION_COUNT,
    ),
  };
}

function createS3Client(config: OffsiteBackupConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function pruneOffsiteBackups(
  client: S3Client,
  config: OffsiteBackupConfig,
) {
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: `${config.prefix}/backup-`,
    }),
  );
  const objects = [...(response.Contents ?? [])]
    .filter((item) => item.Key)
    .sort(
      (left, right) =>
        (right.LastModified?.getTime() ?? 0) -
        (left.LastModified?.getTime() ?? 0),
    );
  const expired = objects.slice(config.retentionCount);
  if (expired.length === 0) return;
  await client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: expired.map((item) => ({ Key: item.Key! })),
        Quiet: true,
      },
    }),
  );
}

async function writeOffsiteBackupHealth<T extends OffsiteBackupResult>(
  health: T,
) {
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(getHealthPath(), JSON.stringify(health, null, 2), "utf8");
  return health;
}

function getHealthPath() {
  return path.join(getDataDir(), "offsite-backup-health.json");
}

function deriveEncryptionKey(secret: string) {
  if (secret.length < 24) {
    throw new Error("Off-site backup encryption secret is too short.");
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value?.trim()) return fallback;
  return value.trim().toLowerCase() === "true";
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getReleaseLabel() {
  return (
    process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
    process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
    "development"
  );
}

function classifyBackupError(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  if (error.message.includes("encryption secret")) return "encryption_config";
  if (error.message.includes("restore verification")) return "restore_verification";
  if (error.name) return error.name.slice(0, 80);
  return "backup_failed";
}
