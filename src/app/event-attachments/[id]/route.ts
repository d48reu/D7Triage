import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getLiveEventAttachmentById } from "@/lib/live-events-repository";
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
  const attachment = getLiveEventAttachmentById(id);
  if (!attachment) {
    return new NextResponse("Event file not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(attachment.storagePath);
    const safeName = attachment.fileName.replace(/["\r\n]/g, "");
    return new NextResponse(file, {
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Event file not found", { status: 404 });
  }
}
