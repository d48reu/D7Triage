import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const STAFF_COOKIE_NAME = "district7_staff_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getStaffPassword() {
  return process.env.STAFF_PASSWORD || "district7-local";
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getStaffPassword())
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
  return Date.now() - issuedAt <= SESSION_MAX_AGE_SECONDS * 1000;
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
  cookieStore.set(STAFF_COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearStaffSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE_NAME);
}

export function verifyStaffPassword(password: string) {
  return password === getStaffPassword();
}
