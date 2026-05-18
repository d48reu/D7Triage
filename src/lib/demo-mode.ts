function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isDemoMode() {
  return parseBoolean(process.env.DEMO_MODE, false);
}

export function getPublicDemoMode() {
  return parseBoolean(process.env.NEXT_PUBLIC_DEMO_MODE, false);
}
