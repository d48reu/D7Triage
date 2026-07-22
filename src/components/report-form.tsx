"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import {
  submitIssueReportAction,
  type SubmitIssueReportState,
} from "@/server-actions/issues";

const STORAGE_KEY = "district7.intake-board.v1";
const MAX_PHOTO_COUNT = 4;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const GROUP_COLORS = [
  { name: "Pink", value: "#ff158a" },
  { name: "Blue", value: "#0073ea" },
  { name: "Green", value: "#00a25b" },
  { name: "Orange", value: "#fdab3d" },
  { name: "Purple", value: "#784bd1" },
] as const;

const STATUS_OPTIONS = [
  { label: "Received", color: "#a7a7a7" },
  { label: "Needs follow up", color: "#bb335d" },
  { label: "Referred out", color: "#a7a7a7" },
  { label: "Resolved", color: "#00854d" },
] as const;

type DraftRow = {
  id: string;
  residentName: string;
  ownerInitials: string;
  answeredBy: string;
  dateLabel: string;
  status: string;
  description: string;
  addressText: string;
  residentPhone: string;
  residentEmail: string;
  category: string;
};

type DraftGroup = {
  id: string;
  label: string;
  color: string;
  rows: DraftRow[];
};

const EXAMPLE_ROWS: DraftRow[] = [
  {
    id: "traffic",
    residentName: "Lorenzo Cruz",
    ownerInitials: "D",
    answeredBy: "KB",
    dateLabel: "Jul 22",
    status: "Needs follow up",
    category: "TRAFFIC",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    residentPhone: "305.724.7000",
    residentEmail: "frontdesk@example.com",
    description:
      "REQUEST TO PERFORM TRAFFIC STUDY, INSTALL SPEEDBUMPS, OR REVIEW SIGNAL TIMING NEAR THIS LOCATION.",
  },
  {
    id: "housing",
    residentName: "Ondina Arias",
    ownerInitials: "AS",
    answeredBy: "KB",
    dateLabel: "Jul 22",
    status: "Needs follow up",
    category: "HOUSING",
    addressText: "10800 SW 88th Street, Miami, FL 33176",
    residentPhone: "305.624.7000",
    residentEmail: "frontdesk@example.com",
    description:
      "MEALS ON WHEELS and senior housing assistance request. Resident needs follow-up from District 7 staff.",
  },
  {
    id: "streetlight",
    residentName: "Denise Tyre",
    ownerInitials: "D",
    answeredBy: "KB",
    dateLabel: "Jul 17",
    status: "Needs follow up",
    category: "STREETLIGHTS",
    addressText: "3750 S Dixie Highway, Miami, FL 33145",
    residentPhone: "305.301.3000",
    residentEmail: "frontdesk@example.com",
    description:
      "Streetlights near the office are out and the area is much darker after sunset.",
  },
  {
    id: "flooding",
    residentName: "Carlos Villanueva",
    ownerInitials: "D",
    answeredBy: "KB",
    dateLabel: "Jul 16",
    status: "Referred out",
    category: "FLOODING",
    addressText: "3599 Douglas Rd, Miami, FL 33133",
    residentPhone: "786.633.9000",
    residentEmail: "frontdesk@example.com",
    description:
      "Storm drain backup after rain. Resident reports recurring water pooling near the curb.",
  },
];

export function ReportForm({ demoMode = false }: { demoMode?: boolean }) {
  const currentGroupLabel = useMemo(() => formatMonthGroup(new Date()), []);
  const [groups, setGroups] = useState<DraftGroup[]>(() =>
    loadInitialGroups(currentGroupLabel),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {
      // Local draft persistence should not block intake.
    }
  }, [groups]);

  function updateGroup(groupId: string, patch: Partial<DraftGroup>) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group,
      ),
    );
  }

  function updateRow(groupId: string, rowId: string, patch: Partial<DraftRow>) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              rows: group.rows.map((row) =>
                row.id === rowId ? { ...row, ...patch } : row,
              ),
            }
          : group,
      ),
    );
  }

  function addRow(groupId: string) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, rows: [...group.rows, makeBlankRow()] }
          : group,
      ),
    );
  }

  function addGroup() {
    setGroups((current) => [
      ...current,
      {
        id: makeId("group"),
        label: nextGroupLabel(current.at(-1)?.label ?? currentGroupLabel),
        color: GROUP_COLORS[current.length % GROUP_COLORS.length].value,
        rows: [makeBlankRow()],
      },
    ]);
  }

  function duplicateFirstExample(groupId: string) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              rows: [
                ...group.rows,
                {
                  ...EXAMPLE_ROWS[0],
                  id: makeId("row"),
                  residentEmail: "frontdesk@example.com",
                },
              ],
            }
          : group,
      ),
    );
  }

  return (
    <div className="px-10 py-5 max-md:px-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            const firstGroup = groups[0];
            if (firstGroup) addRow(firstGroup.id);
          }}
          className="flex h-8 items-center rounded bg-[#0073ea] font-medium text-white shadow-sm"
        >
          <span className="px-3">New item</span>
          <span className="border-l border-white/30 px-2">v</span>
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="h-8 rounded border border-[#c9d3e8] bg-white px-3 font-medium text-[#323650] hover:bg-[#f5f7fb]"
        >
          New group
        </button>
        <BoardTool label="Search" />
        <BoardTool label="Person" />
        <BoardTool label="Filter" />
        <BoardTool label="Sort" />
        <BoardTool label="Hide" />
        <BoardTool label="Group by" />
      </div>

      <div className="mt-5 space-y-7">
        {groups.map((group) => (
          <section key={group.id}>
            <div className="flex flex-wrap items-center gap-3 pl-3">
              <span
                className="text-[20px] font-semibold"
                style={{ color: group.color }}
              >
                v
              </span>
              <input
                value={group.label}
                onChange={(event) =>
                  updateGroup(group.id, { label: event.target.value })
                }
                className="min-w-48 bg-transparent text-[20px] font-semibold outline-none"
                style={{ color: group.color }}
                aria-label="Group name"
              />
              <label className="flex items-center gap-2 text-xs font-medium text-[#4d5672]">
                <span>Color</span>
                <select
                  value={group.color}
                  onChange={(event) =>
                    updateGroup(group.id, { color: event.target.value })
                  }
                  className="h-8 rounded border border-[#c9d3e8] bg-white px-2"
                  aria-label={`Color for ${group.label}`}
                >
                  {GROUP_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => addRow(group.id)}
                className="h-8 rounded border border-[#c9d3e8] bg-white px-3 text-xs font-medium text-[#323650] hover:bg-[#f5f7fb]"
              >
                Add item
              </button>
              <button
                type="button"
                onClick={() => duplicateFirstExample(group.id)}
                className="h-8 rounded border border-[#c9d3e8] bg-white px-3 text-xs font-medium text-[#323650] hover:bg-[#f5f7fb]"
              >
                Add sample
              </button>
            </div>

            <div
              className="mt-3 overflow-x-auto border-l-8"
              style={{ borderLeftColor: group.color }}
            >
              <div className="min-w-[1820px] border-y border-r border-[#c9d3e8]">
                <BoardHeader />
                {group.rows.map((row, index) => (
                  <DraftCaseRow
                    key={row.id}
                    row={row}
                    demoMode={demoMode}
                    highlighted={index === 0}
                    onChange={(patch) => updateRow(group.id, row.id, patch)}
                  />
                ))}
                <div className="grid h-9 grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] bg-white text-sm text-[#6a728c]">
                  <Cell center>
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[#d2daeb]"
                      aria-label={`Select add item row for ${group.label}`}
                    />
                  </Cell>
                  <Cell>
                    <button
                      type="button"
                      onClick={() => addRow(group.id)}
                      className="px-3 text-left text-[#676f8f] hover:text-[#0073ea]"
                    >
                      + Add item
                    </button>
                  </Cell>
                  {Array.from({ length: 11 }).map((_, index) => (
                    <Cell key={index} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="fixed bottom-4 right-4 rounded-xl border border-[#c9d3e8] bg-white px-5 py-3 text-sm text-[#4d5672] shadow-lg max-md:hidden">
        How can I help?
      </div>
    </div>
  );
}

function DraftCaseRow({
  row,
  demoMode,
  highlighted,
  onChange,
}: {
  row: DraftRow;
  demoMode: boolean;
  highlighted: boolean;
  onChange: (patch: Partial<DraftRow>) => void;
}) {
  const [state, formAction, isPending] = useActionState(submitIssueReportAction, {
    status: "idle",
    message: "Ready",
  } satisfies SubmitIssueReportState);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState({
    latitude: "",
    longitude: "",
    message: "",
  });
  const [jurisdictionPreview, setJurisdictionPreview] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  function validatePhotos(files: FileList | null) {
    const photos = Array.from(files ?? []).filter((file) => file.size > 0);

    if (photos.length > MAX_PHOTO_COUNT) {
      return `You can attach up to ${MAX_PHOTO_COUNT} photos per report.`;
    }

    const invalidPhoto = photos.find(
      (photo) =>
        !ALLOWED_PHOTO_TYPES.has(photo.type) ||
        photo.size > MAX_PHOTO_SIZE_BYTES,
    );

    if (invalidPhoto) {
      return "Photos must be JPEG, PNG, WebP, or GIF files and each must be 8 MB or smaller.";
    }

    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("photos");
    const nextPhotoError =
      input instanceof HTMLInputElement ? validatePhotos(input.files) : null;

    setPhotoError(nextPhotoError);
    if (nextPhotoError) {
      event.preventDefault();
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPhotoError(validatePhotos(event.target.files));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationState((current) => ({
        ...current,
        message: "Location unavailable",
      }));
      return;
    }

    setLocationState((current) => ({
      ...current,
      message: "Getting location...",
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          message: "Location captured",
        });
      },
      () => {
        setLocationState((current) => ({
          ...current,
          message: "Typed address will be used",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function previewJurisdiction() {
    if (!row.addressText.trim()) {
      setJurisdictionPreview({
        status: "error",
        message: "Enter address",
      });
      return;
    }

    setJurisdictionPreview({
      status: "loading",
      message: "Checking...",
    });

    try {
      const response = await fetch("/api/jurisdiction-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          addressText: row.addressText,
          latitude: locationState.latitude ? Number(locationState.latitude) : null,
          longitude: locationState.longitude ? Number(locationState.longitude) : null,
        }),
      });
      const data = (await response.json()) as
        | {
            ok: true;
            districtHintStatus: "likely_in_district" | "likely_outside_district" | "unclear";
          }
        | { ok: false; message?: string };

      if (!response.ok || !data.ok) {
        setJurisdictionPreview({
          status: "error",
          message:
            ("message" in data && data.message) || "Check failed",
        });
        return;
      }

      setJurisdictionPreview({
        status: "success",
        message:
          data.districtHintStatus === "likely_in_district"
            ? "In D7"
            : data.districtHintStatus === "likely_outside_district"
              ? "Outside D7"
              : "Unclear",
      });
    } catch {
      setJurisdictionPreview({
        status: "error",
        message: "Check failed",
      });
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className={`grid min-h-12 grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] text-sm text-[#323650] ${
        highlighted ? "bg-[#cfe8ff]" : "bg-white hover:bg-[#eaf5ff]"
      }`}
    >
      <input type="hidden" name="latitude" value={locationState.latitude} />
      <input type="hidden" name="longitude" value={locationState.longitude} />
      <input type="hidden" name="preferredLanguage" value="English" />
      <input type="hidden" name="contactConsent" value="on" />
      <input type="hidden" name="company" value="" />

      <Cell center>
        <input
          type="checkbox"
          className="size-4 rounded border-[#b8c2d8]"
          aria-label={`Select ${row.residentName || "new item"}`}
        />
      </Cell>
      <Cell active={highlighted}>
        <BoardInput
          name="residentName"
          value={row.residentName}
          placeholder="New item"
          maxLength={120}
          onChange={(value) => onChange({ residentName: value })}
        />
      </Cell>
      <Cell center>
        <button
          type="button"
          onClick={previewJurisdiction}
          className="rounded-full border border-[#7c87a3] px-1.5 text-lg leading-5 text-[#4b556f] hover:bg-white"
          aria-label="Check District 7 coverage"
        >
          +
        </button>
      </Cell>
      <Cell center>
        <EditableAvatar
          value={row.ownerInitials}
          tone="orange"
          onChange={(value) => onChange({ ownerInitials: value })}
        />
      </Cell>
      <Cell center>
        <EditableAvatar
          value={row.answeredBy}
          tone="navy"
          onChange={(value) => onChange({ answeredBy: value })}
        />
      </Cell>
      <Cell center>
        <BoardInput
          value={row.dateLabel}
          ariaLabel="Date"
          onChange={(value) => onChange({ dateLabel: value })}
        />
      </Cell>
      <Cell status>
        <select
          value={row.status}
          onChange={(event) => onChange({ status: event.target.value })}
          className="h-full w-full appearance-none px-2 text-center font-semibold text-white outline-none"
          style={{ backgroundColor: getStatusColor(row.status) }}
          aria-label="Status"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status.label} value={status.label}>
              {status.label}
            </option>
          ))}
        </select>
      </Cell>
      <Cell>
        <BoardTextarea
          name="description"
          value={row.description}
          required
          minLength={12}
          maxLength={4000}
          placeholder="Call summary..."
          onChange={(value) => onChange({ description: value })}
        />
      </Cell>
      <Cell>
        <BoardTextarea
          name="addressText"
          value={row.addressText}
          required
          maxLength={250}
          placeholder="Address, intersection, park, or landmark"
          onChange={(value) => onChange({ addressText: value })}
        />
      </Cell>
      <Cell>
        <BoardInput
          name="residentPhone"
          value={row.residentPhone}
          maxLength={40}
          placeholder="305..."
          onChange={(value) => onChange({ residentPhone: value })}
        />
      </Cell>
      <Cell>
        <BoardInput
          name="residentEmail"
          value={row.residentEmail}
          type="email"
          required
          placeholder="email required"
          onChange={(value) => onChange({ residentEmail: value })}
        />
      </Cell>
      <Cell>
        <select
          name="category"
          required
          value={row.category}
          onChange={(event) => onChange({ category: event.target.value })}
          className="h-full w-full bg-transparent px-3 outline-none"
          aria-label="Category"
        >
          {ISSUE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Cell>
      <Cell center>
        <div className="flex flex-col items-center gap-1 px-1 py-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-[#0073ea] px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Creating" : "Create"}
          </button>
          <label className="cursor-pointer rounded border border-[#c9d3e8] bg-white px-2 py-1 text-xs font-medium hover:bg-[#f5f7fb]">
            Files
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={demoMode}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={captureLocation}
            className="text-[11px] text-[#4d5672] hover:text-[#0073ea]"
          >
            Location
          </button>
          <span
            className={`max-w-28 truncate text-[10px] ${
              state.status === "error" || photoError
                ? "font-semibold text-[#9f1239]"
                : jurisdictionPreview.status === "success"
                  ? "font-semibold text-[#087f49]"
                  : "text-[#4d5672]"
            }`}
            title={[
              photoError,
              state.message,
              locationState.message,
              jurisdictionPreview.message
                ? `District: ${jurisdictionPreview.message}`
                : "",
            ]
              .filter(Boolean)
              .join(" | ")}
          >
            {photoError ||
              (jurisdictionPreview.message
                ? `D7: ${jurisdictionPreview.message}`
                : state.message)}
          </span>
        </div>
      </Cell>
    </form>
  );
}

function BoardHeader() {
  return (
    <div className="grid grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] bg-white text-sm text-[#323650]">
      <HeaderCell />
      <HeaderCell label="Item" />
      <HeaderCell />
      <HeaderCell label="People" />
      <HeaderCell label="Answered by" />
      <HeaderCell label="Date" />
      <HeaderCell label="Status" />
      <HeaderCell label="Call Summary" />
      <HeaderCell label="Constituent Address" />
      <HeaderCell label="Constituent Phone" />
      <HeaderCell label="Constituent Email" />
      <HeaderCell label="Category" />
      <HeaderCell label="Files" />
    </div>
  );
}

function BoardTool({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="h-8 rounded px-2 text-[#323650] hover:bg-[#f0f3fb]"
    >
      {label}
    </button>
  );
}

function HeaderCell({ label }: { label?: string }) {
  return (
    <div className="flex h-9 items-center justify-center border-b border-r border-[#c9d3e8] px-2">
      {label}
    </div>
  );
}

function Cell({
  children,
  center = false,
  active = false,
  status = false,
}: {
  children?: React.ReactNode;
  center?: boolean;
  active?: boolean;
  status?: boolean;
}) {
  return (
    <div
      className={`min-h-12 border-b border-r border-[#c9d3e8] ${
        center ? "flex items-center justify-center" : "flex items-stretch"
      } ${active ? "outline outline-1 outline-[#323650]" : ""} ${
        status ? "p-0" : ""
      }`}
    >
      {children}
    </div>
  );
}

function BoardInput({
  value,
  onChange,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      maxLength={maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="h-full min-h-12 w-full bg-transparent px-3 outline-none placeholder:text-[#6c758f] focus:bg-white"
    />
  );
}

function BoardTextarea({
  value,
  onChange,
  name,
  required = false,
  minLength,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  name: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      name={name}
      required={required}
      minLength={minLength}
      maxLength={maxLength}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-full min-h-20 w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-[#6c758f] focus:bg-white"
    />
  );
}

function EditableAvatar({
  value,
  tone,
  onChange,
}: {
  value: string;
  tone: "orange" | "navy";
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      maxLength={3}
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      className={`size-7 rounded-full text-center text-xs font-bold text-white outline-none ${
        tone === "orange" ? "bg-[#ff642e]" : "bg-[#101735]"
      }`}
      aria-label={tone === "orange" ? "People initials" : "Answered by initials"}
    />
  );
}

function getStatusColor(status: string) {
  return (
    STATUS_OPTIONS.find((option) => option.label === status)?.color ??
    STATUS_OPTIONS[0].color
  );
}

function makeBlankRow(): DraftRow {
  const now = new Date();
  return {
    id: makeId("row"),
    residentName: "",
    ownerInitials: "D",
    answeredBy: "FD",
    dateLabel: now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    status: "Received",
    description: "",
    addressText: "",
    residentPhone: "",
    residentEmail: "",
    category: "Other / unsure",
  };
}

function loadInitialGroups(currentGroupLabel: string): DraftGroup[] {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DraftGroup[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Local draft restore is best-effort only.
    }
  }

  return [
    {
      id: makeId("group"),
      label: currentGroupLabel,
      color: GROUP_COLORS[0].value,
      rows: [makeBlankRow(), ...EXAMPLE_ROWS],
    },
  ];
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatMonthGroup(date: Date) {
  return `${date.getFullYear()} ${date.toLocaleDateString(undefined, {
    month: "long",
  })}`;
}

function nextGroupLabel(previousLabel: string) {
  const match = previousLabel.match(/^(\d{4})\s+([A-Za-z]+)$/);
  if (!match) return "New group";

  const parsed = new Date(`${match[2]} 1, ${match[1]}`);
  if (!Number.isFinite(parsed.getTime())) return "New group";

  parsed.setMonth(parsed.getMonth() + 1);
  return formatMonthGroup(parsed);
}
