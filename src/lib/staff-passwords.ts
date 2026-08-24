import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const HASH_PREFIX = "scrypt";
const HASH_LENGTH = 64;

const STAFF_PASSWORD_HASHES = new Map<string, string>([
  [
    "alejandro servali",
    "scrypt$wGwskssifGNTDP4PQBGS9w$ojooO6i7Eg-QToS8cpHrNQi5GXRKZLj0TreFWwMRXrg7uyd9F_y0OIJd2K37JUW8Bts7IhXhhpZyh72l4safyg",
  ],
  [
    "carol gustafson",
    "scrypt$VqEcCjsMy8zdB4FhCb_VBg$4RQbIIYA7xry6gguCsSKsf__yKsIWyIhyuXuaOmOBdypln2GGYy0L2Ff3fyWiK9ryUTAN_qVf0TxCtSQ3OhqJw",
  ],
  [
    "david garcia",
    "scrypt$zuvujEkjXV8HoDYt0xtJDw$qzZqk-EgmUg4qL4dhdQ3ncdeW9OYF6yhpB_7KYwVGLbh8klAZC8zMw-6MrevcNXKjVHDtnyU2YMu2nO8Thr1Nw",
  ],
  [
    "diego abreu",
    "scrypt$2fcsOAJrbPzbTVWE6_0rbQ$jWB-xAYYgKv6zfuOmwxqRsMes5dO7hve_cypJ4OFNKdiXwbi8wAncFAkuVweJ_bgsppWcBkjDCToMHYcQLI6wQ",
  ],
]);

function normalizeStaffName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getConfiguredStaffCredentialNames() {
  return [...STAFF_PASSWORD_HASHES.keys()];
}

export function createStaffPasswordHash(
  password: string,
  salt = crypto.randomBytes(16),
) {
  const digest = crypto.scryptSync(password, salt, HASH_LENGTH);
  return `${HASH_PREFIX}$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

export async function verifyStaffPasswordHash(
  password: string,
  encodedHash: string,
) {
  const [prefix, encodedSalt, encodedDigest, ...extraParts] =
    encodedHash.split("$");
  if (
    prefix !== HASH_PREFIX ||
    !encodedSalt ||
    !encodedDigest ||
    extraParts.length > 0
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedDigest = Buffer.from(encodedDigest, "base64url");
    if (salt.length < 16 || expectedDigest.length !== HASH_LENGTH) return false;

    const actualDigest = (await scrypt(
      password,
      salt,
      HASH_LENGTH,
    )) as Buffer;

    return crypto.timingSafeEqual(actualDigest, expectedDigest);
  } catch {
    return false;
  }
}

export async function verifyIndividualStaffPassword(
  staffMemberName: string,
  password: string,
) {
  const encodedHash = STAFF_PASSWORD_HASHES.get(
    normalizeStaffName(staffMemberName),
  );
  if (!encodedHash) return false;
  return verifyStaffPasswordHash(password, encodedHash);
}
