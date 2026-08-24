import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const HASH_PREFIX = "scrypt";
const HASH_LENGTH = 64;

const STAFF_PASSWORD_HASHES = new Map<string, string>([
  [
    "alejandro servali",
    "scrypt$iJgh5pEu2vHVr_V5CGiP4g$Sser50RT9Qyl2zftzb71aFbqN8SUNHuhS3wHBFHD3yW7zuleo6yRBcTy4hd7DYLJsAH6bdHoVwM_5ODDypkgRA",
  ],
  [
    "carol gustafson",
    "scrypt$OzT5T077tCgeBQEMJ1Ee-Q$utrS-O5_oN9zajhIW0RIS_Ue1nEOVrv2gNaI-1GLQtDW_6gnKlNDBMiUF93mSGwLHWUosWUWsu8MkK5_n8Qy8A",
  ],
  [
    "david garcia",
    "scrypt$pQeZSWvax0DPP80OA11mkQ$GNj8KJOTC_u9vDGH0NFJ1ChQ9tWAkAIxMYWT0Ir80UDV8b1h1UlxNibjqwZN4dkUIDosHw_R8vme1X7WFOOvHQ",
  ],
  [
    "diego abreu",
    "scrypt$ZvcAUbLywGAb56ZJKCMEWw$Wa9D9hBASTeU3p8vBFwarYxqA3jhn-O8EtwrepqIi8NEvC0nIMBG2e8WOy_ba9qdL1WHPk8ew9ioV4K0v2y9WQ",
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
