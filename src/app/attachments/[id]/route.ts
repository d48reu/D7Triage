import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAttachmentById } from "@/lib/issues-repository";
import { hasStaffSession } from "@/lib/staff-auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasStaffSession())) {
    return new NextResponse("Staff sign-in required", { status: 401 });
  }

  const { id } = await params;
  const attachment = getAttachmentById(id);

  if (!attachment) {
    return new NextResponse("Attachment not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(attachment.storagePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.fileName}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Attachment file not found", { status: 404 });
  }
}
