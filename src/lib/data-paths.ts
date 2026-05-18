import path from "node:path";

function normalizeDataDir(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return path.join(process.cwd(), ".data");
  }

  return path.isAbsolute(trimmed)
    ? trimmed
    : path.join(/* turbopackIgnore: true */ process.cwd(), trimmed);
}

export function getDataDir() {
  return normalizeDataDir(process.env.DATA_DIR);
}

export function getDbPath() {
  return path.join(getDataDir(), "issues.db");
}

export function getUploadsDir() {
  return path.join(getDataDir(), "uploads");
}
