import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo-mode";
import {
  getConfiguredStaffCredentialNames,
  verifyIndividualStaffPassword,
} from "@/lib/staff-passwords";

const STAFF_COOKIE_NAME = "district7_staff_session";
const DEFAULT_STAFF_PASSWORD = "district7-local";
const LEGACY_PASSWORD_STAFF_NAMES = new Set(["karl eugene boehm"]);

export type StaffSession = {
  issuedAt: number;
  staffMemberId: string | null;
};

function getSharedStaffPassword() {
  const configuredPassword = process.env.STAFF_PASSWORD?.trim();
  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_STAFF_PASSWORD;
  }

  throw new Error("STAFF_PASSWORD must be configured in production.");
}

function getSessionSecret() {
  const configuredSecret = process.env.STAFF_SESSION_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return getSharedStaffPassword();
  }

  throw new Error("STAFF_SESSION_SECRET must be configured in production.");
}

function getSessionMaxAgeSeconds() {
  const configuredHours = Number(process.env.STAFF_SESSION_MAX_AGE_HOURS);
  const hours =
    Number.isFinite(configuredHours) && configuredHours > 0
      ? configuredHours
      : 12;
  return Math.floor(hours * 60 * 60);
}

export function getStaffAuthConfiguration() {
  const configuredSecret = process.env.STAFF_SESSION_SECRET?.trim();

  return {
    individualPasswordCount: getConfiguredStaffCredentialNames().length,
    legacyPasswordStaffCount: LEGACY_PASSWORD_STAFF_NAMES.size,
    sharedPasswordFallbackEnabled:
      isDemoMode() || process.env.NODE_ENV !== "production",
    usingDedicatedSessionSecret: Boolean(configuredSecret),
    sessionMaxAgeHours: getSessionMaxAgeSeconds() / 3600,
  };
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function createSessionValue(staffMemberId: string | null) {
  const payload = Buffer.from(
    JSON.stringify({
      issuedAt: Date.now(),
      staffMemberId,
    } satisfies StaffSession),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function hasValidSignature(payload: string, signature: string) {
  const expected = sign(payload);

  if (!signature || signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function isFreshIssuedAt(issuedAt: number) {
  const age = Date.now() - issuedAt;
  return Number.isFinite(issuedAt) && age >= 0 && age <= getSessionMaxAgeSeconds() * 1000;
}

function readSessionValue(value?: string): StaffSession | null {
  if (!value) return null;

  const parts = value.split(".");

  if (parts.length === 2) {
    const [payload, signature] = parts;
    if (!hasValidSignature(payload, signature)) return null;

    try {
      const parsed = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as Partial<StaffSession>;
      const issuedAt = Number(parsed.issuedAt);
      const staffMemberId =
        typeof parsed.staffMemberId === "string" && parsed.staffMemberId.trim()
          ? parsed.staffMemberId.trim()
          : null;

      return isFreshIssuedAt(issuedAt) ? { issuedAt, staffMemberId } : null;
    } catch {
      return null;
    }
  }

  // Keep existing shared-password sessions valid long enough for the user to
  // choose their coworker identity once after this feature is deployed.
  if (parts.length === 3) {
    const payload = `${parts[0]}.${parts[1]}`;
    const signature = parts[2];
    const issuedAt = Number(parts[1]);

    if (!hasValidSignature(payload, signature) || !isFreshIssuedAt(issuedAt)) {
      return null;
    }

    return { issuedAt, staffMemberId: null };
  }

  return null;
}

function setStaffSessionCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  staffMemberId: string | null,
) {
  cookieStore.set(STAFF_COOKIE_NAME, createSessionValue(staffMemberId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  return readSessionValue(cookieStore.get(STAFF_COOKIE_NAME)?.value);
}

export async function hasStaffSession() {
  return Boolean(await getStaffSession());
}

export async function requireStaffSession() {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }
  return session;
}

export async function createStaffSession(staffMemberId: string | null = null) {
  const cookieStore = await cookies();
  setStaffSessionCookie(cookieStore, staffMemberId);
}

export async function setStaffIdentity(staffMemberId: string) {
  const cookieStore = await cookies();
  const session = readSessionValue(cookieStore.get(STAFF_COOKIE_NAME)?.value);
  if (!session) return false;

  setStaffSessionCookie(cookieStore, staffMemberId);
  return true;
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_NAME);
}

export async function verifyStaffPassword(
  staffMemberName: string,
  password: string,
) {
  if (await verifyIndividualStaffPassword(staffMemberName, password)) {
    return true;
  }

  if (
    LEGACY_PASSWORD_STAFF_NAMES.has(
      staffMemberName.trim().replace(/\s+/g, " ").toLowerCase(),
    )
  ) {
    return password === getSharedStaffPassword();
  }

  if (isDemoMode() || process.env.NODE_ENV !== "production") {
    return password === getSharedStaffPassword();
  }

  return false;
}
