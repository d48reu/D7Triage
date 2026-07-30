export type IntakeBoardCase = {
  id: string;
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
