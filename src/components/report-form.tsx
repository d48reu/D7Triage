"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ISSUE_CATEGORIES,
  formatStatus,
} from "@/lib/issue-types";
import {
  compareIntakeMonthLabelsDescending,
  formatIntakeMonthGroup,
  intakeCaseMatchesSearch,
  nextIntakeMonthLabel,
  type IntakeBoardCase,
} from "@/lib/intake-board";
import {
  createStaffIntakeCaseAction,
  type CreateIntakeCaseState,
} from "@/server-actions/issues";

const STORAGE_KEY = "district7.intake-board.v2";
const LEGACY_STORAGE_KEY = "district7.intake-board.v1";
const MAX_PHOTO_COUNT = 4;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const BOARD_GRID =
  "grid-cols-[44px_250px_96px_132px_340px_280px_155px_220px_190px_155px_170px]";
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

type DraftRow = {
  id: string;
  residentName: string;
  dateLabel: string;
  description: string;
  addressText: string;
  residentPhone: string;
  residentEmail: string;
  category: string;
};

type DraftGroup = {
  id: string;
  label: string;
  caseMonthLabel?: string;
  color: string;
  collapsed: boolean;
  rows: DraftRow[];
};

type CreatedCaseMetadata = {
  reportId: string;
  publicTrackingToken: string;
  createdAt: string;
};

export function ReportForm({
  demoMode = false,
  existingCases,
  currentGroupLabel,
  todayLabel,
}: {
  demoMode?: boolean;
  existingCases: IntakeBoardCase[];
  currentGroupLabel: string;
  todayLabel: string;
}) {
  const [groups, setGroups] = useState<DraftGroup[]>(() =>
    makeInitialGroups(currentGroupLabel, existingCases, todayLabel),
  );
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [savedCases, setSavedCases] = useState(existingCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastCreatedCase, setLastCreatedCase] =
    useState<CreatedCaseMetadata | null>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setGroups(loadStoredGroups(currentGroupLabel, existingCases, todayLabel));
      setDraftsLoaded(true);
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [currentGroupLabel, existingCases, todayLabel]);

  useEffect(() => {
    if (!draftsLoaded) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Draft persistence is best-effort and never blocks intake.
    }
  }, [draftsLoaded, groups]);

  const visibleCases = useMemo(
    () =>
      savedCases.filter((intakeCase) =>
        intakeCaseMatchesSearch(intakeCase, searchQuery),
      ),
    [savedCases, searchQuery],
  );
  const casesByGroup = useMemo(() => {
    const grouped = new Map<string, IntakeBoardCase[]>();
    for (const intakeCase of visibleCases) {
      const label = formatIntakeMonthGroup(intakeCase.createdAt);
      grouped.set(label, [...(grouped.get(label) ?? []), intakeCase]);
    }
    return grouped;
  }, [visibleCases]);

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
          ? {
              ...group,
              collapsed: false,
              rows: [...group.rows, makeBlankRow(todayLabel)],
            }
          : group,
      ),
    );
  }

  function removeRow(groupId: string, rowId: string) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, rows: group.rows.filter((row) => row.id !== rowId) }
          : group,
      ),
    );
  }

  function addGroup() {
    setGroups((current) => {
      const label = nextIntakeMonthLabel(
        current.map((group) => group.label),
        currentGroupLabel,
      );
      return [
        ...current,
        {
          id: makeId("group"),
          label,
          caseMonthLabel: label,
          color: GROUP_COLORS[current.length % GROUP_COLORS.length].value,
          collapsed: false,
          rows: [makeBlankRow(todayLabel)],
        },
      ].sort((a, b) => compareIntakeMonthLabelsDescending(a.label, b.label));
    });
  }

  function addCurrentItem() {
    const currentGroup =
      groups.find(
        (group) =>
          group.label === currentGroupLabel ||
          group.caseMonthLabel === currentGroupLabel,
      ) ?? groups[0];
    if (currentGroup) addRow(currentGroup.id);
  }

  function handleCreatedCase(
    groupId: string,
    row: DraftRow,
    createdCase: CreatedCaseMetadata,
  ) {
    const savedCase: IntakeBoardCase = {
      id: createdCase.reportId,
      publicTrackingToken: createdCase.publicTrackingToken,
      status: "received",
      category: row.category,
      description: row.description,
      addressText: row.addressText,
      residentName: row.residentName,
      residentEmail: row.residentEmail,
      residentPhone: row.residentPhone,
      createdAt: createdCase.createdAt,
      districtLabel: "Pending review",
      attachmentCount: 0,
    };

    setSavedCases((current) => [savedCase, ...current]);
    setGroups((current) =>
      current.map((group) => {
        if (group.id !== groupId) return group;
        const remainingRows = group.rows.filter((item) => item.id !== row.id);
        return {
          ...group,
          rows:
            remainingRows.length > 0
              ? remainingRows
              : [makeBlankRow(todayLabel)],
        };
      }),
    );
    setLastCreatedCase(createdCase);
  }

  return (
    <div className="px-8 py-5 max-md:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={addCurrentItem}
            className="h-9 rounded bg-[#0073ea] px-4 font-semibold text-white shadow-sm hover:bg-[#0060b9]"
          >
            New item
          </button>
          <button
            type="button"
            onClick={addGroup}
            className="h-9 rounded border border-[#c9d3e8] bg-white px-3 font-medium text-[#323650] hover:bg-[#f5f7fb]"
          >
            New group
          </button>
          <label className="relative block">
            <span className="sr-only">Search saved cases</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search saved cases"
              className="h-9 w-64 rounded border border-[#c9d3e8] bg-white px-3 outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#cce5ff]"
            />
          </label>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="h-9 rounded px-2 text-[#4d5672] hover:bg-[#f0f3fb]"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="text-xs text-[#68728f]">
          {savedCases.length} saved case{savedCases.length === 1 ? "" : "s"} ·
          Click any blue draft cell to edit.
        </div>
      </div>

      {lastCreatedCase ? (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-[#a8dfc5] bg-[#effbf5] px-4 py-3 text-sm text-[#12613c]"
        >
          <span className="font-semibold">Case created. A fresh draft row is ready.</span>
          <div className="flex items-center gap-3">
            <Link
              href={`/staff/reports/${lastCreatedCase.reportId}`}
              className="font-semibold underline underline-offset-2"
            >
              Open case
            </Link>
            <button
              type="button"
              onClick={() => setLastCreatedCase(null)}
              className="rounded px-2 py-1 hover:bg-white"
              aria-label="Dismiss case created message"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {searchQuery ? (
        <div className="mt-4 text-sm text-[#4d5672]">
          Showing {visibleCases.length} of {savedCases.length} saved cases. Draft rows stay visible.
        </div>
      ) : null}

      <div className="mt-5 space-y-7">
        {groups.map((group) => {
          const groupCases =
            casesByGroup.get(group.caseMonthLabel ?? group.label) ?? [];
          const itemCount = groupCases.length + group.rows.length;

          return (
            <section key={group.id} aria-labelledby={`${group.id}-label`}>
              <div className="flex flex-wrap items-center gap-3 pl-1">
                <button
                  type="button"
                  onClick={() =>
                    updateGroup(group.id, { collapsed: !group.collapsed })
                  }
                  className="grid size-8 place-items-center rounded text-[20px] font-semibold hover:bg-[#f0f3fb]"
                  style={{ color: group.color }}
                  aria-label={`${group.collapsed ? "Expand" : "Collapse"} ${group.label}`}
                  aria-expanded={!group.collapsed}
                >
                  {group.collapsed ? ">" : "⌄"}
                </button>
                <GroupTitleMenu
                  id={`${group.id}-label`}
                  group={group}
                  onChange={(patch) => updateGroup(group.id, patch)}
                />
                <span className="text-xs text-[#7b839b]">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => addRow(group.id)}
                  className="h-8 rounded border border-[#c9d3e8] bg-white px-3 text-xs font-medium text-[#323650] hover:bg-[#f5f7fb]"
                >
                  Add item
                </button>
              </div>

              {!group.collapsed ? (
                <div
                  className="mt-3 overflow-x-auto border-l-8"
                  style={{ borderLeftColor: group.color }}
                >
                  <div className="min-w-[2032px] border-y border-r border-[#c9d3e8]">
                    <BoardHeader />
                    {groupCases.map((intakeCase) => (
                      <SavedCaseRow key={intakeCase.id} intakeCase={intakeCase} />
                    ))}
                    {group.rows.map((row) => (
                      <DraftCaseRow
                        key={row.id}
                        row={row}
                        demoMode={demoMode}
                        onChange={(patch) => updateRow(group.id, row.id, patch)}
                        onRemove={() => removeRow(group.id, row.id)}
                        onCreated={(createdCase) =>
                          handleCreatedCase(group.id, row, createdCase)
                        }
                      />
                    ))}
                    <div className={`grid h-10 ${BOARD_GRID} bg-white text-sm text-[#6a728c]`}>
                      <Cell />
                      <Cell>
                        <button
                          type="button"
                          onClick={() => addRow(group.id)}
                          className="w-full px-3 text-left text-[#676f8f] hover:text-[#0073ea]"
                        >
                          + Add item
                        </button>
                      </Cell>
                      {Array.from({ length: 9 }).map((_, index) => (
                        <Cell key={index} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function GroupTitleMenu({
  id,
  group,
  onChange,
}: {
  id: string;
  group: DraftGroup;
  onChange: (patch: Partial<DraftGroup>) => void;
}) {
  return (
    <details className="group/title relative">
      <summary
        id={id}
        className="flex min-w-48 cursor-pointer list-none items-center gap-2 rounded px-2 py-1 text-[20px] font-semibold outline-none hover:bg-[#f5f7fb] focus-visible:ring-2 focus-visible:ring-[#0073ea] [&::-webkit-details-marker]:hidden"
        style={{ color: group.color }}
        aria-label={`Edit ${group.label} group name and color`}
      >
        <span>{group.label}</span>
        <span
          aria-hidden="true"
          className="text-xs transition-transform group-open/title:rotate-180"
        >
          ▼
        </span>
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-[#c9d3e8] bg-white p-4 text-[#323650] shadow-xl">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68728f]">
            Group name
          </span>
          <input
            value={group.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className="mt-2 h-10 w-full rounded border border-[#b8c4da] px-3 text-sm font-semibold outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#cce5ff]"
            aria-label="Group name"
          />
        </label>
        <fieldset className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-[#68728f]">
            Group color
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {GROUP_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => onChange({ color: color.value })}
                className={`grid size-9 place-items-center rounded-full border-2 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0073ea] ${
                  group.color === color.value
                    ? "border-[#181b34]"
                    : "border-transparent"
                }`}
                aria-label={`Set ${group.label} group color to ${color.name}`}
                aria-pressed={group.color === color.value}
                title={color.name}
              >
                <span
                  className="grid size-6 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color.value }}
                >
                  {group.color === color.value ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="mt-3 text-xs leading-5 text-[#68728f]">
          Group name and color changes save on this computer.
        </p>
      </div>
    </details>
  );
}

function SavedCaseRow({ intakeCase }: { intakeCase: IntakeBoardCase }) {
  return (
    <div className={`grid min-h-16 ${BOARD_GRID} bg-white text-sm text-[#323650] hover:bg-[#f4f9ff]`}>
      <Cell center>
        <span className="size-2.5 rounded-full bg-[#00a25b]" title="Saved case" />
      </Cell>
      <Cell>
        <Link
          href={`/staff/reports/${intakeCase.id}`}
          className="flex w-full items-center px-3 font-medium text-[#175da8] hover:underline"
        >
          {intakeCase.residentName || "No constituent name"}
        </Link>
      </Cell>
      <Cell center>{formatBoardDate(intakeCase.createdAt)}</Cell>
      <Cell center>
        <StatusPill status={intakeCase.status} />
      </Cell>
      <Cell>
        <ReadOnlyText value={intakeCase.description} />
      </Cell>
      <Cell>
        <ReadOnlyText value={intakeCase.addressText} />
      </Cell>
      <Cell>
        <ReadOnlyText value={intakeCase.residentPhone || "—"} />
      </Cell>
      <Cell>
        <ReadOnlyText value={intakeCase.residentEmail} />
      </Cell>
      <Cell>
        <ReadOnlyText value={intakeCase.category} />
      </Cell>
      <Cell center>
        <span className="px-2 text-center text-xs text-[#4d5672]">
          {intakeCase.districtLabel}
        </span>
      </Cell>
      <Cell center>
        <div className="flex flex-col items-center gap-1.5 px-2 py-2">
          <Link
            href={`/staff/reports/${intakeCase.id}`}
            className="rounded border border-[#0073ea] bg-white px-3 py-1.5 text-xs font-semibold text-[#0060b9] hover:bg-[#eaf3ff]"
          >
            Open case
          </Link>
          <span className="text-[11px] text-[#68728f]">
            {intakeCase.attachmentCount} file{intakeCase.attachmentCount === 1 ? "" : "s"}
          </span>
        </div>
      </Cell>
    </div>
  );
}

function DraftCaseRow({
  row,
  demoMode,
  onChange,
  onRemove,
  onCreated,
}: {
  row: DraftRow;
  demoMode: boolean;
  onChange: (patch: Partial<DraftRow>) => void;
  onRemove: () => void;
  onCreated: (createdCase: CreatedCaseMetadata) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createStaffIntakeCaseAction,
    {
      status: "idle",
      message: "",
    } satisfies CreateIntakeCaseState,
  );
  const reportedCaseId = useRef<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedPhotoNames, setSelectedPhotoNames] = useState<string[]>([]);
  const [locationState, setLocationState] = useState({
    latitude: "",
    longitude: "",
    message: "",
  });
  const [jurisdictionPreview, setJurisdictionPreview] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

  useEffect(() => {
    if (
      state.status !== "success" ||
      !state.reportId ||
      !state.publicTrackingToken ||
      !state.createdAt ||
      reportedCaseId.current === state.reportId
    ) {
      return;
    }

    reportedCaseId.current = state.reportId;
    onCreated({
      reportId: state.reportId,
      publicTrackingToken: state.publicTrackingToken,
      createdAt: state.createdAt,
    });
  }, [onCreated, state]);

  function validatePhotos(files: FileList | null) {
    const photos = Array.from(files ?? []).filter((file) => file.size > 0);

    if (photos.length > MAX_PHOTO_COUNT) {
      return `Choose no more than ${MAX_PHOTO_COUNT} photos.`;
    }

    const invalidPhoto = photos.find(
      (photo) =>
        !ALLOWED_PHOTO_TYPES.has(photo.type) ||
        photo.size > MAX_PHOTO_SIZE_BYTES,
    );

    if (invalidPhoto) {
      return "Use JPEG, PNG, WebP, or GIF files up to 8 MB each.";
    }

    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("photos");
    const nextPhotoError =
      input instanceof HTMLInputElement ? validatePhotos(input.files) : null;

    setPhotoError(nextPhotoError);
    if (nextPhotoError) event.preventDefault();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPhotoError(validatePhotos(event.target.files));
    setSelectedPhotoNames(files.map((file) => file.name));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationState((current) => ({
        ...current,
        message: "Location unavailable",
      }));
      return;
    }

    setLocationState((current) => ({ ...current, message: "Getting location…" }));
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
          message: "Using typed address",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function previewJurisdiction() {
    if (!row.addressText.trim()) {
      setJurisdictionPreview({ status: "error", message: "Enter address" });
      return;
    }

    setJurisdictionPreview({ status: "loading", message: "Checking…" });

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
            districtHintStatus:
              | "likely_in_district"
              | "likely_outside_district"
              | "unclear";
          }
        | { ok: false; message?: string };

      if (!response.ok || !data.ok) {
        setJurisdictionPreview({
          status: "error",
          message: ("message" in data && data.message) || "Check failed",
        });
        return;
      }

      setJurisdictionPreview({
        status: "success",
        message:
          data.districtHintStatus === "likely_in_district"
            ? "Likely in D7"
            : data.districtHintStatus === "likely_outside_district"
              ? "Likely outside D7"
              : "Unclear",
      });
    } catch {
      setJurisdictionPreview({ status: "error", message: "Check failed" });
    }
  }

  function submitWithShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "Enter" || event.key === "NumpadEnter")
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className={`grid min-h-24 ${BOARD_GRID} bg-[#eaf5ff] text-sm text-[#323650] hover:bg-[#e1f0ff]`}
      aria-label={`Draft case for ${row.residentName || "new constituent"}`}
    >
      <input type="hidden" name="latitude" value={locationState.latitude} />
      <input type="hidden" name="longitude" value={locationState.longitude} />
      <input type="hidden" name="preferredLanguage" value="English" />
      <input type="hidden" name="contactConsent" value="on" />
      <input type="hidden" name="company" value="" />

      <Cell center>
        <span className="rounded bg-[#fff0b8] px-1.5 py-1 text-[10px] font-bold uppercase text-[#7a5600]">
          Draft
        </span>
      </Cell>
      <Cell>
        <BoardInput
          name="residentName"
          value={row.residentName}
          placeholder="Constituent name"
          maxLength={120}
          onChange={(value) => onChange({ residentName: value })}
        />
      </Cell>
      <Cell center>
        <span
          className="text-xs text-[#59627b]"
          title="The case creation date is set automatically."
        >
          {row.dateLabel}
        </span>
      </Cell>
      <Cell center>
        <span
          className="rounded bg-[#fff0b8] px-2 py-1 text-xs font-semibold text-[#7a5600]"
          title="The case enters the staff queue as Received."
        >
          Not created
        </span>
      </Cell>
      <Cell>
        <BoardTextarea
          name="description"
          value={row.description}
          required
          minLength={12}
          maxLength={4000}
          placeholder="What did the constituent call about?"
          onChange={(value) => onChange({ description: value })}
          onKeyDown={submitWithShortcut}
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
          onKeyDown={submitWithShortcut}
        />
      </Cell>
      <Cell>
        <BoardInput
          name="residentPhone"
          value={row.residentPhone}
          maxLength={40}
          placeholder="305…"
          onChange={(value) => onChange({ residentPhone: value })}
        />
      </Cell>
      <Cell>
        <BoardInput
          name="residentEmail"
          value={row.residentEmail}
          type="email"
          required
          placeholder="name@example.com"
          onChange={(value) => onChange({ residentEmail: value })}
        />
      </Cell>
      <Cell>
        <select
          name="category"
          required
          value={row.category}
          onChange={(event) => onChange({ category: event.target.value })}
          className="h-full w-full cursor-pointer bg-transparent px-3 outline-none hover:bg-white/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_#0073ea]"
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
        <div className="flex flex-col items-center gap-1 px-2 py-2 text-center">
          <button
            type="button"
            onClick={previewJurisdiction}
            disabled={jurisdictionPreview.status === "loading"}
            className="rounded border border-[#9aa8c4] bg-white px-2 py-1 text-xs font-semibold hover:bg-[#f5f7fb] disabled:opacity-60"
          >
            Check district
          </button>
          <button
            type="button"
            onClick={captureLocation}
            className="text-[11px] text-[#4d5672] hover:text-[#0073ea]"
          >
            Use location
          </button>
          <span
            className={`max-w-36 text-[10px] ${
              jurisdictionPreview.status === "error"
                ? "font-semibold text-[#9f1239]"
                : jurisdictionPreview.status === "success"
                  ? "font-semibold text-[#087f49]"
                  : "text-[#4d5672]"
            }`}
          >
            {jurisdictionPreview.message || locationState.message || "Optional preview"}
          </span>
        </div>
      </Cell>
      <Cell center>
        <div className="flex w-full flex-col items-center gap-1.5 px-2 py-2">
          <label className="w-full cursor-pointer rounded border border-[#9aa8c4] bg-white px-2 py-1.5 text-center text-xs font-semibold hover:bg-[#f5f7fb]">
            {selectedPhotoNames.length > 0
              ? `${selectedPhotoNames.length} file${selectedPhotoNames.length === 1 ? "" : "s"}`
              : "Add files"}
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={demoMode || isPending}
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {selectedPhotoNames.length > 0 ? (
            <span
              className="max-w-36 truncate text-[10px] text-[#4d5672]"
              title={selectedPhotoNames.join(", ")}
            >
              {selectedPhotoNames.join(", ")}
            </span>
          ) : null}
          <button
            type="submit"
            disabled={isPending || demoMode}
            className="w-full rounded bg-[#0073ea] px-2 py-1.5 text-xs font-semibold text-white hover:bg-[#0060b9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating…" : demoMode ? "Demo only" : "Create case"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="text-[11px] text-[#7a4650] hover:underline disabled:opacity-50"
          >
            Remove draft
          </button>
          <span
            aria-live="polite"
            className={`max-w-36 text-center text-[10px] ${
              state.status === "error" || photoError
                ? "font-semibold text-[#9f1239]"
                : "text-[#4d5672]"
            }`}
          >
            {photoError || state.message || "Ctrl + Enter to create"}
          </span>
        </div>
      </Cell>
    </form>
  );
}

function BoardHeader() {
  return (
    <div className={`grid ${BOARD_GRID} bg-white text-sm text-[#323650]`}>
      <HeaderCell label="Type" />
      <HeaderCell label="Constituent" />
      <HeaderCell label="Date" />
      <HeaderCell label="Status" />
      <HeaderCell label="Call Summary *" />
      <HeaderCell label="Address *" />
      <HeaderCell label="Phone" />
      <HeaderCell label="Email *" />
      <HeaderCell label="Category *" />
      <HeaderCell label="District" />
      <HeaderCell label="Files / Save" />
    </div>
  );
}

function HeaderCell({ label }: { label: string }) {
  return (
    <div className="flex h-10 items-center justify-center border-b border-r border-[#c9d3e8] bg-[#f8f9fc] px-2 text-center text-xs font-semibold">
      {label}
    </div>
  );
}

function Cell({
  children,
  center = false,
}: {
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`min-h-10 border-b border-r border-[#c9d3e8] ${
        center ? "flex items-center justify-center" : "flex items-stretch"
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
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
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
      className="h-full min-h-16 w-full cursor-text bg-transparent px-3 outline-none placeholder:text-[#6c758f] hover:bg-white/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_#0073ea]"
    />
  );
}

function BoardTextarea({
  value,
  onChange,
  onKeyDown,
  name,
  required = false,
  minLength,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
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
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="h-full min-h-24 w-full cursor-text resize-none bg-transparent px-3 py-2 outline-none placeholder:text-[#6c758f] hover:bg-white/70 focus:bg-white focus:shadow-[inset_0_0_0_2px_#0073ea]"
    />
  );
}

function ReadOnlyText({ value }: { value: string }) {
  return (
    <span className="line-clamp-3 w-full self-center px-3 py-2 text-xs leading-5" title={value}>
      {value}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "received"
      ? "bg-[#a7a7a7]"
      : status === "resolved" || status.startsWith("closed_")
        ? "bg-[#00854d]"
        : status === "follow_up_due" || status === "needs_more_info"
          ? "bg-[#bb335d]"
          : "bg-[#0073ea]";

  return (
    <span className={`rounded px-2 py-1 text-center text-xs font-semibold text-white ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}

function makeBlankRow(todayLabel: string, id = makeId("row")): DraftRow {
  return {
    id,
    residentName: "",
    dateLabel: todayLabel,
    description: "",
    addressText: "",
    residentPhone: "",
    residentEmail: "",
    category: "Other / unsure",
  };
}

function makeInitialGroups(
  currentGroupLabel: string,
  existingCases: IntakeBoardCase[],
  todayLabel: string,
) {
  return mergeDraftGroups(
    currentGroupLabel,
    existingCases,
    [],
    todayLabel,
  );
}

function loadStoredGroups(
  currentGroupLabel: string,
  existingCases: IntakeBoardCase[],
  todayLabel: string,
) {
  let storedGroups: DraftGroup[] = [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DraftGroup[];
      if (Array.isArray(parsed)) storedGroups = parsed.filter(isDraftGroup);
    }
  } catch {
    // Ignore corrupt local drafts and start from the saved case months.
  }

  return mergeDraftGroups(
    currentGroupLabel,
    existingCases,
    storedGroups,
    todayLabel,
  );
}

function mergeDraftGroups(
  currentGroupLabel: string,
  existingCases: IntakeBoardCase[],
  storedGroups: DraftGroup[],
  todayLabel: string,
) {
  const caseLabels = Array.from(
    new Set(existingCases.map((intakeCase) => formatIntakeMonthGroup(intakeCase.createdAt))),
  ).sort(compareIntakeMonthLabelsDescending);

  const knownLabels = new Set(
    storedGroups.flatMap((group) =>
      group.caseMonthLabel
        ? [group.label, group.caseMonthLabel]
        : [group.label],
    ),
  );
  const missingCaseGroups = caseLabels
    .filter((label) => !knownLabels.has(label))
    .map((label, index) => ({
      id: stableId("group", label),
      label,
      caseMonthLabel: label,
      color: GROUP_COLORS[index % GROUP_COLORS.length].value,
      collapsed: false,
      rows: [],
    }));
  const merged = [...storedGroups, ...missingCaseGroups];
  const existingCurrentGroup = merged.find(
    (group) =>
      group.label === currentGroupLabel ||
      group.caseMonthLabel === currentGroupLabel,
  );

  if (
    existingCurrentGroup &&
    storedGroups.length === 0 &&
    existingCurrentGroup.rows.length === 0
  ) {
    existingCurrentGroup.rows = [
      makeBlankRow(todayLabel, stableId("row", currentGroupLabel)),
    ];
  }

  if (!existingCurrentGroup) {
    merged.push({
      id: stableId("group", currentGroupLabel),
      label: currentGroupLabel,
      caseMonthLabel: currentGroupLabel,
      color: GROUP_COLORS[merged.length % GROUP_COLORS.length].value,
      collapsed: false,
      rows: [
        makeBlankRow(todayLabel, stableId("row", currentGroupLabel)),
      ],
    });
  }

  return merged.sort((a, b) =>
    compareIntakeMonthLabelsDescending(a.label, b.label),
  );
}

function stableId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function isDraftGroup(value: DraftGroup) {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.color === "string" &&
    Array.isArray(value.rows)
  );
}

function formatBoardDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
