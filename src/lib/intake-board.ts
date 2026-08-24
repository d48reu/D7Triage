export type IntakeBoardCase = {
  id: string;
  revision: number;
  publicTrackingToken: string;
  status: string;
  assignedStaffId: string | null;
  category: string;
  description: string;
  intakeNotes: string;
  resolutionNotes: string;
  addressText: string;
  residentName: string;
  residentEmail: string;
  residentPhone: string;
  createdAt: string;
  districtLabel: string;
  attachmentCount: number;
};

export type IntakeDraftIdentity = {
  residentName: string;
  dateValue: string;
  description: string;
  resolutionNotes: string;
  addressText: string;
  residentPhone: string;
  residentEmail: string;
};

export type IntakeDraftForSave = {
  category: string;
  dateValue: string;
  status: string;
  description: string;
  addressText: string;
};

export function validateIntakeDraftForSave(draft: IntakeDraftForSave) {
  const missingFields: string[] = [];

  if (!draft.category.trim()) missingFields.push("category");
  if (!draft.description.trim()) missingFields.push("call summary");
  if (!draft.addressText.trim()) missingFields.push("address");
  if (!draft.dateValue.trim()) missingFields.push("date");
  if (!draft.status.trim()) missingFields.push("status");

  if (missingFields.length > 0) {
    if (missingFields.length === 1) {
      return `Complete the required ${missingFields[0]} field before saving.`;
    }

    const lastField = missingFields.at(-1);
    return `Complete these required fields: ${missingFields
      .slice(0, -1)
      .join(", ")} and ${lastField}.`;
  }

  if (draft.description.trim().length < 12) {
    return "Call summary must be at least 12 characters before saving.";
  }

  return null;
}

function normalizeIdentityValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function intakeDraftMatchesSavedCase(
  draft: IntakeDraftIdentity,
  intakeCase: IntakeBoardCase,
) {
  if (!draft.description.trim() || !draft.addressText.trim()) return false;

  return (
    draft.dateValue === intakeCase.createdAt.slice(0, 10) &&
    normalizeIdentityValue(draft.residentName) ===
      normalizeIdentityValue(intakeCase.residentName) &&
    normalizeIdentityValue(draft.description) ===
      normalizeIdentityValue(intakeCase.description) &&
    normalizeIdentityValue(draft.resolutionNotes) ===
      normalizeIdentityValue(intakeCase.resolutionNotes) &&
    normalizeIdentityValue(draft.addressText) ===
      normalizeIdentityValue(intakeCase.addressText) &&
    normalizeIdentityValue(draft.residentPhone) ===
      normalizeIdentityValue(intakeCase.residentPhone) &&
    normalizeIdentityValue(draft.residentEmail) ===
      normalizeIdentityValue(intakeCase.residentEmail)
  );
}

export function formatIntakeMonthGroup(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unknown";

  return `${date.getFullYear()} ${date.toLocaleDateString("en-US", {
    month: "long",
  })}`;
}

export function compareIntakeMonthLabelsDescending(a: string, b: string) {
  return monthLabelTimestamp(b) - monthLabelTimestamp(a);
}

export function intakeCaseMatchesSearch(
  intakeCase: IntakeBoardCase,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    intakeCase.residentName,
    intakeCase.residentEmail,
    intakeCase.residentPhone,
    intakeCase.description,
    intakeCase.intakeNotes,
    intakeCase.resolutionNotes,
    intakeCase.addressText,
    intakeCase.category,
    intakeCase.status,
    intakeCase.districtLabel,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function nextIntakeMonthLabel(labels: string[], fallback: string) {
  const latestTimestamp = labels.reduce(
    (latest, label) => Math.max(latest, monthLabelTimestamp(label)),
    monthLabelTimestamp(fallback),
  );
  const date = new Date(latestTimestamp);

  if (!Number.isFinite(date.getTime())) return "New group";

  date.setMonth(date.getMonth() + 1);
  return formatIntakeMonthGroup(date);
}

function monthLabelTimestamp(label: string) {
  const match = label.match(/^(\d{4})\s+([A-Za-z]+)$/);
  if (!match) return Number.NEGATIVE_INFINITY;

  const parsed = new Date(`${match[2]} 1, ${match[1]}`);
  return Number.isFinite(parsed.getTime())
    ? parsed.getTime()
    : Number.NEGATIVE_INFINITY;
}
