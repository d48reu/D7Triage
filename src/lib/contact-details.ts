const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export function isValidOptionalEmail(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 || EMAIL_PATTERN.test(normalized);
}
