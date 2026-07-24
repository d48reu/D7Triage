import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getHistoricalAttachmentById } from "@/lib/historical-archive-repository";
import { hasStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasStaffSession())) {
    return new NextResponse("Staff sign-in required", { status: 401 });
  }

  const { id } = await params;
  const attachment = getHistoricalAttachmentById(id);
  if (!attachment?.storagePath) {
    return new NextResponse("Archived file not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(attachment.storagePath);
    const fileName =
      attachment.fileName || path.basename(attachment.storagePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeHeaderFileName(fileName)}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Archived file not found", { status: 404 });
  }
}

function safeHeaderFileName(value: string) {
  return value.replace(/[\r\n"]/g, "_");
}
