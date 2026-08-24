"use server";

import { requireStaffActionActor } from "@/lib/staff-action-auth";
import {
  recordOperationalEvent,
  type OperationalEventSeverity,
} from "@/lib/operational-events";

const ALLOWED_SEVERITIES = new Set<OperationalEventSeverity>([
  "info",
  "warning",
  "error",
]);

export type StaffOperationalEventInput = {
  eventType: string;
  severity: OperationalEventSeverity;
  action: string;
  outcome: string;
  errorCode?: string | null;
  route?: string | null;
  browserFamily?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
};

export async function recordStaffOperationalEventAction(
  input: StaffOperationalEventInput,
) {
  const actor = await requireStaffActionActor();
  if (!input || !ALLOWED_SEVERITIES.has(input.severity)) {
    return { ok: false };
  }

  recordOperationalEvent({
    eventType: String(input.eventType ?? ""),
    severity: input.severity,
    action: String(input.action ?? ""),
    outcome: String(input.outcome ?? ""),
    errorCode: input.errorCode ? String(input.errorCode) : null,
    route: input.route ? String(input.route) : null,
    browserFamily: input.browserFamily ? String(input.browserFamily) : null,
    viewportWidth: Number(input.viewportWidth) || null,
    viewportHeight: Number(input.viewportHeight) || null,
    staffMemberId: actor.staffMemberId,
  });
  return { ok: true };
}
