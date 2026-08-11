import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  importHistoricalArchive,
  markHistoricalAttachmentStored,
  parseHistoricalArchiveManifest,
} from "@/lib/historical-archive-repository";
import { getDataDir } from "@/lib/data-paths";
import { getStaffActionActor } from "@/lib/staff-action-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;
const MAX_ASSET_COUNT = 50;
const MAX_ASSET_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 80 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await getStaffActionActor())) {
    return new NextResponse("Staff sign-in required", { status: 401 });
  }

  try {
    const formData = await request.formData();
    const manifestFile = formData.get("manifest");
    const assetFiles = formData
      .getAll("assets")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!(manifestFile instanceof File) || manifestFile.size === 0) {
      return NextResponse.json(
        { error: "Choose the verified history manifest JSON file." },
        { status: 400 },
      );
    }
    if (manifestFile.size > MAX_MANIFEST_BYTES) {
      return NextResponse.json(
        { error: "The history manifest is larger than the safe import limit." },
        { status: 413 },
      );
    }
    if (assetFiles.length > MAX_ASSET_COUNT) {
      return NextResponse.json(
        { error: `Upload no more than ${MAX_ASSET_COUNT} archived files at once.` },
        { status: 413 },
      );
    }

    const totalAssetBytes = assetFiles.reduce(
      (total, file) => total + file.size,
      0,
    );
    if (
      assetFiles.some((file) => file.size > MAX_ASSET_BYTES) ||
      totalAssetBytes > MAX_TOTAL_ASSET_BYTES
    ) {
      return NextResponse.json(
        { error: "The archived files exceed the safe import size limit." },
        { status: 413 },
      );
    }

    const manifestInput = JSON.parse(await manifestFile.text()) as unknown;
    const manifest = parseHistoricalArchiveManifest(manifestInput);
    const expectedAssetIds = new Set(
      [
        ...manifest.attachmentRefs,
        ...manifest.eventAttachmentRefs,
      ].map((item) => item.externalAssetId),
    );
    const uploads = assetFiles.map((file) => {
      const externalAssetId = file.name.match(/^(\d+)_/)?.[1] ?? "";
      if (!externalAssetId || !expectedAssetIds.has(externalAssetId)) {
        throw new Error(
          `Archived file "${file.name}" does not match the verified manifest.`,
        );
      }
      return { file, externalAssetId };
    });

    const importResult = importHistoricalArchive(manifest);
    const archiveDir = path.join(getDataDir(), "historical-attachments");
    await fs.mkdir(archiveDir, { recursive: true });

    let storedAssets = 0;
    for (const { file, externalAssetId } of uploads) {
      const safeFileName = safeArchiveFileName(file.name);
      const storagePath = path.join(archiveDir, safeFileName);
      await fs.writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
      const linkedRows = markHistoricalAttachmentStored({
        externalAssetId,
        fileName: safeFileName.replace(/^\d+_/, ""),
        storagePath,
        mimeType: file.type || inferMimeType(safeFileName),
        sizeBytes: file.size,
      });
      if (linkedRows > 0) storedAssets += 1;
    }

    return NextResponse.json({
      ok: true,
      ...importResult,
      uploadedAssets: uploads.length,
      storedAssets,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Historical import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function safeArchiveFileName(value: string) {
  const baseName = path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return baseName.slice(0, 180) || "archived-file";
}

function inferMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const types: Record<string, string> = {
    ".gif": "image/gif",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return types[extension] ?? "application/octet-stream";
}
