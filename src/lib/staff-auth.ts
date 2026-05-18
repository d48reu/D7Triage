import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const STAFF_COOKIE_NAME = "district7_staff_session";
const DEFAULT_STAFF_PASSWORD = "district7-local";

function getStaffPassword() {
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
    return getStaffPassword();
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
  const configuredPassword = process.env.STAFF_PASSWORD?.trim();
  const configuredSecret = process.env.STAFF_SESSION_SECRET?.trim();

  return {
    hasCustomPassword: Boolean(configuredPassword),
    usingDefaultPassword: !configuredPassword,
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

function createSessionValue() {
  const payload = `staff.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function isValidSession(value?: string) {
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const signature = parts[2];
  const expected = sign(payload);

  if (signature.length !== expected.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  const issuedAt = Number(parts[1]);
  return Date.now() - issuedAt <= getSessionMaxAgeSeconds() * 1000;
}

export async function hasStaffSession() {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(STAFF_COOKIE_NAME)?.value);
}

export async function requireStaffSession() {
  if (!(await hasStaffSession())) {
    redirect("/staff/login");
  }
}

export async function createStaffSession() {
  const cookieStore = await cookies();
  const maxAge = getSessionMaxAgeSeconds();
  cookieStore.set(STAFF_COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_NAME);
}

export function verifyStaffPassword(password: string) {
  return password === getStaffPassword();
}
