"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import {
  submitIssueReportAction,
  type SubmitIssueReportState,
} from "@/server-actions/issues";

const initialState: SubmitIssueReportState = {
  status: "idle",
  message: "Fill the new row, then create the item.",
};
const MAX_PHOTO_COUNT = 4;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXAMPLE_REPORTS = [
  {
    id: "traffic",
    title: "Lorenzo Cruz",
    category: "TRAFFIC",
    addressText: "6690 SW 40th St, Miami, FL 33155",
    phone: "305.724.7000",
    email: "frontdesk@example.com",
    description:
      "REQUEST TO PERFORM TRAFFIC STUDY, INSTALL SPEEDBUMPS, OR REVIEW SIGNAL TIMING NEAR THIS LOCATION.",
  },
  {
    id: "housing",
    title: "Ondina Arias",
    category: "HOUSING",
    addressText: "10800 SW 88th Street, Miami, FL 33176",
    phone: "305.624.7000",
    email: "frontdesk@example.com",
    description:
      "MEALS ON WHEELS and senior housing assistance request. Resident needs follow-up from District 7 staff.",
  },
  {
    id: "streetlight",
    title: "Denise Tyre",
    category: "STREETLIGHTS",
    addressText: "3750 S Dixie Highway, Miami, FL 33145",
    phone: "305.301.3000",
    email: "frontdesk@example.com",
    description:
      "Streetlights near the office are out and the area is much darker after sunset.",
  },
  {
    id: "flooding",
    title: "Carlos Villanueva",
    category: "FLOODING",
    addressText: "3599 Douglas Rd, Miami, FL 33133",
    phone: "786.633.9000",
    email: "frontdesk@example.com",
    description:
      "Storm drain backup after rain. Resident reports recurring water pooling near the curb.",
  },
] as const;

export function ReportForm({ demoMode = false }: { demoMode?: boolean }) {
  const [state, formAction, isPending] = useActionState(
    submitIssueReportAction,
    {
      status: "idle",
      message: demoMode
        ? "Hosted demo mode: the board is interactive, but new submissions are not retained."
        : initialState.message,
    } satisfies SubmitIssueReportState,
  );
  const [category, setCategory] = useState<string>("Other / unsure");
  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [residentName, setResidentName] = useState("");
  const [residentPhone, setResidentPhone] = useState("");
  const [residentEmail, setResidentEmail] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<{
    latitude: string;
    longitude: string;
    message: string;
  }>({
    latitude: "",
    longitude: "",
    message: "Coordinates optional.",
  });
  const [jurisdictionPreview, setJurisdictionPreview] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message: string;
    districtHintStatus?: "likely_in_district" | "likely_outside_district" | "unclear";
    districtLabel?: string;
    municipalityName?: string | null;
    geocodedAddress?: string | null;
    countyCommissionDistrictNumber?: string | null;
    countyCommissionerName?: string | null;
  }>({
    status: "idle",
    message: "District check has not been run.",
  });

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    [],
  );
  const groupLabel = useMemo(
    () => {
      const date = new Date();
      return `${date.getFullYear()} ${date.toLocaleDateString(undefined, {
        month: "long",
      })}`;
    },
    [],
  );

  function resetJurisdictionPreview() {
    setJurisdictionPreview({
      status: "idle",
      message: "District check has not been run.",
    });
  }

  function applyExample(exampleId: (typeof EXAMPLE_REPORTS)[number]["id"]) {
    const example = EXAMPLE_REPORTS.find((item) => item.id === exampleId);
    if (!example) return;

    setResidentName(example.title);
    setCategory(example.category);
    setDescription(example.description);
    setAddressText(example.addressText);
    setResidentPhone(example.phone);
    setResidentEmail(example.email);
    setLocationState({
      latitude: "",
      longitude: "",
      message: "Coordinates optional.",
    });
    resetJurisdictionPreview();
  }

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

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationState((current) => ({
        ...current,
        message: "This browser does not support location capture.",
      }));
      return;
    }

    setLocationState((current) => ({
      ...current,
      message: "Getting your location...",
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          message: "Location captured.",
        });
      },
      () => {
        setLocationState((current) => ({
          ...current,
          message: "Location not captured. The typed address will still be used.",
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async function previewJurisdiction() {
    if (!addressText.trim()) {
      setJurisdictionPreview({
        status: "error",
        message: "Enter an address first.",
      });
      return;
    }

    setJurisdictionPreview({
      status: "loading",
      message: "Checking District 7 coverage...",
    });

    try {
      const response = await fetch("/api/jurisdiction-preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          addressText,
          latitude: locationState.latitude ? Number(locationState.latitude) : null,
          longitude: locationState.longitude ? Number(locationState.longitude) : null,
        }),
      });

      const data = (await response.json()) as
        | {
            ok: true;
            districtHintStatus: "likely_in_district" | "likely_outside_district" | "unclear";
            districtLabel: string;
            municipalityName?: string | null;
            geocodedAddress?: string | null;
            countyCommissionDistrictNumber?: string | null;
            countyCommissionerName?: string | null;
          }
        | { ok: false; message?: string };

      if (!response.ok || !data.ok) {
        setJurisdictionPreview({
          status: "error",
          message:
            ("message" in data && data.message) ||
            "District check could not run right now.",
        });
        return;
      }

      setJurisdictionPreview({
        status: "success",
        message:
          data.districtHintStatus === "likely_outside_district"
            ? "Likely outside District 7."
            : data.districtHintStatus === "likely_in_district"
              ? "Likely in District 7."
              : "District unclear.",
        districtHintStatus: data.districtHintStatus,
        districtLabel: data.districtLabel,
        municipalityName: data.municipalityName,
        geocodedAddress: data.geocodedAddress,
        countyCommissionDistrictNumber: data.countyCommissionDistrictNumber,
        countyCommissionerName: data.countyCommissionerName,
      });
    } catch {
      setJurisdictionPreview({
        status: "error",
        message: "District check could not run right now.",
      });
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="px-10 py-5 max-md:px-4">
      <input type="hidden" name="latitude" value={locationState.latitude} />
      <input type="hidden" name="longitude" value={locationState.longitude} />
      <input type="hidden" name="preferredLanguage" value="English" />
      <input type="hidden" name="contactConsent" value="on" />
      <label className="hidden" aria-hidden="true">
        <span>Company</span>
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="submit"
          disabled={isPending}
          className="flex h-8 items-center rounded bg-[#0073ea] font-medium text-white shadow-sm disabled:opacity-60"
        >
          <span className="px-3">{isPending ? "Creating..." : "New item"}</span>
          <span className="border-l border-white/30 px-2">v</span>
        </button>
        <BoardTool label="Search" />
        <BoardTool label="Person" />
        <BoardTool label="Filter" />
        <BoardTool label="Sort" />
        <BoardTool label="Hide" />
        <BoardTool label="Group by" />
        <button
          type="button"
          onClick={previewJurisdiction}
          disabled={jurisdictionPreview.status === "loading"}
          className="h-8 rounded border border-[#c9d3e8] bg-white px-3 font-medium text-[#323650] hover:bg-[#f5f7fb] disabled:opacity-60"
        >
          {jurisdictionPreview.status === "loading" ? "Checking..." : "Check District 7"}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 pl-3 text-[20px] font-semibold text-[#ff158a]">
        <span>v</span>
        <span>{groupLabel}</span>
      </div>

      <div className="mt-3 overflow-x-auto border-l-8 border-[#ff158a]">
        <div className="min-w-[1760px] border-y border-r border-[#c9d3e8]">
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

          <div className="grid min-h-12 grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] bg-[#cfe8ff] text-sm text-[#323650]">
            <Cell center>
              <input
                type="checkbox"
                className="size-4 rounded border-[#b8c2d8]"
                aria-label="Select new item"
              />
            </Cell>
            <Cell active>
              <input
                name="residentName"
                value={residentName}
                onChange={(event) => setResidentName(event.target.value)}
                maxLength={120}
                placeholder="New item"
                className="h-full w-full bg-transparent px-3 outline-none placeholder:text-[#4c566f]"
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
              <Avatar label="D" tone="orange" />
            </Cell>
            <Cell center>
              <Avatar label="FD" tone="navy" />
            </Cell>
            <Cell center>{todayLabel}</Cell>
            <Cell status>
              <div className="flex h-full w-full items-center justify-center bg-[#a7a7a7] px-3 font-semibold text-white">
                Received
              </div>
            </Cell>
            <Cell>
              <textarea
                name="description"
                required
                minLength={12}
                maxLength={4000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Call summary..."
                className="h-full min-h-20 w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-[#6c758f]"
              />
            </Cell>
            <Cell>
              <textarea
                name="addressText"
                required
                maxLength={250}
                value={addressText}
                onChange={(event) => {
                  setAddressText(event.target.value);
                  resetJurisdictionPreview();
                }}
                placeholder="Address, intersection, park, or landmark"
                className="h-full min-h-20 w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-[#6c758f]"
              />
            </Cell>
            <Cell>
              <input
                name="residentPhone"
                value={residentPhone}
                onChange={(event) => setResidentPhone(event.target.value)}
                maxLength={40}
                placeholder="305..."
                className="h-full w-full bg-transparent px-3 outline-none placeholder:text-[#6c758f]"
              />
            </Cell>
            <Cell>
              <input
                name="residentEmail"
                type="email"
                required
                value={residentEmail}
                onChange={(event) => setResidentEmail(event.target.value)}
                placeholder="email required"
                className="h-full w-full bg-transparent px-3 outline-none placeholder:text-[#6c758f]"
              />
            </Cell>
            <Cell>
              <select
                name="category"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-full w-full bg-transparent px-3 outline-none"
              >
                {ISSUE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Cell>
            <Cell center>
              <label className="cursor-pointer rounded border border-[#c9d3e8] bg-white px-2 py-1 text-xs font-medium hover:bg-[#f5f7fb]">
                Files
                <input
                  name="photos"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={demoMode}
                  onChange={(event) =>
                    setPhotoError(validatePhotos(event.target.files))
                  }
                  className="hidden"
                />
              </label>
            </Cell>
          </div>

          {EXAMPLE_REPORTS.map((example, index) => (
            <ExampleRow
              key={example.id}
              example={example}
              dateLabel={index < 2 ? todayLabel : index === 2 ? "Jul 17" : "Jul 16"}
              status={
                index === 0 || index === 1 || index === 2
                  ? "Needs follow up"
                  : "Referred out"
              }
            />
          ))}

          <div className="grid h-9 grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] bg-white text-sm text-[#6a728c]">
            <Cell center>
              <input
                type="checkbox"
                className="size-4 rounded border-[#d2daeb]"
                aria-label="Select add item row"
              />
            </Cell>
            <Cell>
              <button
                type="submit"
                disabled={isPending}
                className="px-3 text-left text-[#676f8f] hover:text-[#0073ea] disabled:opacity-60"
              >
                + Add item
              </button>
            </Cell>
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
            <Cell />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_360px]">
        <div
          className={`rounded border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-[#f5b2c3] bg-[#fff0f3] text-[#9f1239]"
              : "border-[#d9e0ef] bg-white text-[#4d5672]"
          }`}
        >
          {state.message}
          {photoError ? (
            <div className="mt-2 font-medium text-[#9f1239]">{photoError}</div>
          ) : null}
          <div className="mt-2 text-xs text-[#6a728c]">
            Required columns: Item/contact name can be blank, but Call Summary,
            Address, Email, and Category must be filled.
          </div>
        </div>

        <div
          className={`rounded border px-4 py-3 text-sm ${
            jurisdictionPreview.status === "error"
              ? "border-[#f5b2c3] bg-[#fff0f3] text-[#9f1239]"
              : jurisdictionPreview.districtHintStatus === "likely_outside_district"
                ? "border-[#ffd79a] bg-[#fff8e8] text-[#8a4b00]"
                : jurisdictionPreview.districtHintStatus === "likely_in_district"
                  ? "border-[#b9e7cc] bg-[#effbf4] text-[#087f49]"
                  : "border-[#d9e0ef] bg-white text-[#4d5672]"
          }`}
        >
          <div className="font-semibold">District preview</div>
          <div className="mt-1">{jurisdictionPreview.message}</div>
          {jurisdictionPreview.status === "success" ? (
            <div className="mt-2 space-y-1 text-xs">
              {jurisdictionPreview.districtLabel ? (
                <div>{jurisdictionPreview.districtLabel}</div>
              ) : null}
              {jurisdictionPreview.municipalityName ? (
                <div>Municipality: {jurisdictionPreview.municipalityName}</div>
              ) : null}
              {jurisdictionPreview.countyCommissionDistrictNumber ? (
                <div>
                  County district: {jurisdictionPreview.countyCommissionDistrictNumber}
                  {jurisdictionPreview.countyCommissionerName
                    ? ` (${jurisdictionPreview.countyCommissionerName})`
                    : ""}
                </div>
              ) : null}
              {jurisdictionPreview.geocodedAddress ? (
                <div>Matched: {jurisdictionPreview.geocodedAddress}</div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={captureLocation}
            className="mt-3 rounded border border-[#c9d3e8] bg-white px-3 py-1.5 text-xs font-medium text-[#323650] hover:bg-[#f5f7fb]"
          >
            Use device location
          </button>
          <div className="mt-2 text-xs text-[#6a728c]">{locationState.message}</div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 rounded-xl border border-[#c9d3e8] bg-white px-5 py-3 text-sm text-[#4d5672] shadow-lg max-md:hidden">
        How can I help?
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#4d5672]">
        {EXAMPLE_REPORTS.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => applyExample(example.id)}
            className="rounded border border-[#d9e0ef] bg-white px-3 py-2 hover:border-[#0073ea] hover:bg-[#f5faff]"
          >
            Fill with {example.title}
          </button>
        ))}
      </div>
    </form>
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

function Avatar({
  label,
  tone,
}: {
  label: string;
  tone: "orange" | "navy";
}) {
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-full text-xs font-bold text-white ${
        tone === "orange" ? "bg-[#ff642e]" : "bg-[#101735]"
      }`}
    >
      {label}
    </span>
  );
}

function ExampleRow({
  example,
  dateLabel,
  status,
}: {
  example: (typeof EXAMPLE_REPORTS)[number];
  dateLabel: string;
  status: "Needs follow up" | "Referred out";
}) {
  return (
    <div
      className="grid min-h-9 grid-cols-[34px_340px_66px_98px_142px_88px_170px_410px_300px_160px_230px_210px_140px] bg-white text-left text-sm text-[#323650] hover:bg-[#eaf5ff]"
    >
      <Cell center>
        <input
          type="checkbox"
          className="size-4 rounded border-[#d2daeb]"
          aria-label={`Select ${example.title}`}
        />
      </Cell>
      <Cell>
        <div className="flex items-center px-8">{example.title}</div>
      </Cell>
      <Cell center>
        <span className="rounded-full border border-[#7c87a3] px-1.5 text-lg leading-5 text-[#4b556f]">
          +
        </span>
      </Cell>
      <Cell center>
        <Avatar label={example.title.startsWith("Ondina") ? "AS" : "D"} tone="orange" />
      </Cell>
      <Cell center>
        <Avatar label="KB" tone="navy" />
      </Cell>
      <Cell center>{dateLabel}</Cell>
      <Cell status>
        <div
          className={`flex h-full w-full items-center justify-center px-3 font-semibold text-white ${
            status === "Needs follow up" ? "bg-[#bb335d]" : "bg-[#a7a7a7]"
          }`}
        >
          {status}
        </div>
      </Cell>
      <Cell>
        <div className="line-clamp-1 px-3 py-2">{example.description}</div>
      </Cell>
      <Cell>
        <div className="line-clamp-1 px-3 py-2">{example.addressText}</div>
      </Cell>
      <Cell>
        <div className="px-3 py-2">{example.phone}</div>
      </Cell>
      <Cell>
        <div className="line-clamp-1 px-3 py-2">{example.email}</div>
      </Cell>
      <Cell>
        <div className="line-clamp-1 px-3 py-2">{example.category}</div>
      </Cell>
      <Cell />
    </div>
  );
}
