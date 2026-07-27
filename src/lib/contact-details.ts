const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export function isEmailAddress(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidOptionalEmail(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 || isEmailAddress(normalized);
}

export function getDeliverableEmail(value: string) {
  const normalized = value.trim();
  return isEmailAddress(normalized) ? normalized : null;
}
