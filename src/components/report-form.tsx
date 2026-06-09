"use client";

import { useActionState, useState } from "react";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import {
  submitIssueReportAction,
  type SubmitIssueReportState,
} from "@/server-actions/issues";

const initialState: SubmitIssueReportState = {
  status: "idle",
  message: "Reports are saved locally and reviewed by staff.",
};

const EXAMPLE_REPORTS = [
  {
    id: "sidewalk",
    title: "Broken sidewalk near a home",
    category: "SIDEWALKS",
    addressText: "3636 SW 16th Terrace, Miami, FL 33145",
    description:
      "The sidewalk in front of this address is cracked and lifted in several places, creating a tripping hazard for people walking by.",
  },
  {
    id: "roads",
    title: "Traffic concern on a neighborhood street",
    category: "TRAFFIC",
    addressText: "655 NW 37th Avenue, Miami, FL 33125",
    description:
      "There is a large pothole near the travel lane and drivers are swerving around it. It has gotten noticeably worse over the last week.",
  },
  {
    id: "streetlights",
    title: "Streetlight issue",
    category: "STREETLIGHTS",
    addressText: "3750 S Dixie Highway, Miami, FL 33145",
    description:
      "Several streetlights near this location are out, making the area much darker after sunset and harder to use safely.",
  },
  {
    id: "outside",
    title: "Outside-district example",
    category: "TRAFFIC",
    addressText: "100 Washington Ave, Miami Beach, FL 33139",
    description:
      "There is a pothole near the curb lane that residents have been avoiding. This example helps show how the app handles reports outside District 7.",
  },
] as const;

export function ReportForm({ demoMode = false }: { demoMode?: boolean }) {
  const [state, formAction, isPending] = useActionState(
    submitIssueReportAction,
    {
      status: "idle",
      message: demoMode
        ? "Hosted demo mode: the form is interactive, but new submissions are not retained."
        : initialState.message,
    } satisfies SubmitIssueReportState,
  );
  const [category, setCategory] = useState<string>("Other / unsure");
  const [description, setDescription] = useState("");
  const [addressText, setAddressText] = useState("");
  const [locationState, setLocationState] = useState<{
    latitude: string;
    longitude: string;
    message: string;
  }>({
    latitude: "",
    longitude: "",
    message: "Optional. Helps future map and boundary checks if available.",
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
    message: "Optional. Preview whether the location appears to be inside District 7.",
  });

  function resetJurisdictionPreview() {
    setJurisdictionPreview({
      status: "idle",
      message: "Optional. Preview whether the location appears to be inside District 7.",
    });
  }

  function applyExample(exampleId: (typeof EXAMPLE_REPORTS)[number]["id"]) {
    const example = EXAMPLE_REPORTS.find((item) => item.id === exampleId);
    if (!example) return;

    setCategory(example.category);
    setDescription(example.description);
    setAddressText(example.addressText);
    setLocationState({
      latitude: "",
      longitude: "",
      message: "Optional. Helps future map and boundary checks if available.",
    });
    resetJurisdictionPreview();
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
          message: "Location captured for boundary-aware routing.",
        });
      },
      () => {
        setLocationState((current) => ({
          ...current,
          message: "We couldn’t capture your location. You can still submit with the address field.",
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
        message: "Enter a location or address first.",
      });
      return;
    }

    setJurisdictionPreview({
      status: "loading",
      message: "Checking whether this location appears to be in District 7...",
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
            "We couldn’t preview District 7 coverage right now.",
        });
        return;
      }

      setJurisdictionPreview({
        status: "success",
        message:
          data.districtHintStatus === "likely_outside_district"
            ? "This location appears to be outside Miami-Dade County District 7. You can still submit, and staff will review the jurisdiction."
            : data.districtHintStatus === "likely_in_district"
              ? "This location appears to be inside Miami-Dade County District 7."
              : "We couldn’t confidently place this location in or out of District 7 yet, but you can still submit it for review.",
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
        message: "We couldn’t preview District 7 coverage right now.",
      });
    }
  }

  return (
    <form action={formAction} className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold">Issue details</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use plain language. Staff will review and route it.
          </p>
        </div>

      <div className="space-y-5 p-5">
        {demoMode ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="font-semibold">Hosted demo note</div>
            <p className="mt-1 leading-6">
              This shareable demo lets you explore the form and staff workflow, but
              new public submissions are not retained. Use the curated examples
              below and the seeded staff inbox to see the full routing experience.
            </p>
          </div>
        ) : null}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-800">
                Try an example
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Use a curated example to see what a clear report looks like, then edit it as needed.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {EXAMPLE_REPORTS.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => applyExample(example.id)}
                className="rounded-md border border-slate-200 bg-white px-4 py-3 text-left hover:border-sky-300 hover:bg-sky-50"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {example.title}
                </div>
                <div className="mt-1 text-xs font-medium text-sky-700">
                  {example.category}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {example.addressText}
                </div>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Category
          </span>
          <select
            name="category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
          >
            {ISSUE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Description
          </span>
          <textarea
            name="description"
            required
            minLength={12}
            maxLength={4000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-36 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
            placeholder="Example: There is a large pothole near the school entrance and cars are swerving around it."
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Location or address
          </span>
          <input
            name="addressText"
            required
            maxLength={250}
            value={addressText}
            onChange={(event) => {
              setAddressText(event.target.value);
              resetJurisdictionPreview();
            }}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
            placeholder="Street address, intersection, park, or landmark"
          />
          <p className="mt-2 text-xs text-slate-500">
            Cross streets, school names, park names, route numbers, and nearby
            landmarks help staff determine jurisdiction faster. If device
            location is unavailable, the app will try to place the report from
            the typed address.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={previewJurisdiction}
              disabled={jurisdictionPreview.status === "loading"}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {jurisdictionPreview.status === "loading"
                ? "Checking..."
                : "Check District 7 Coverage"}
            </button>
            <span className="text-xs text-slate-500">
              This preview does not block submission.
            </span>
          </div>
          <div
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              jurisdictionPreview.status === "error"
                ? "bg-rose-50 text-rose-800"
                : jurisdictionPreview.districtHintStatus === "likely_outside_district"
                  ? "bg-amber-50 text-amber-900"
                  : jurisdictionPreview.districtHintStatus === "likely_in_district"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-50 text-slate-600"
            }`}
          >
            {jurisdictionPreview.message}
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
                    Likely county commission district:{" "}
                    {jurisdictionPreview.countyCommissionDistrictNumber}
                    {jurisdictionPreview.countyCommissionerName
                      ? ` (${jurisdictionPreview.countyCommissionerName})`
                      : ""}
                  </div>
                ) : null}
                {jurisdictionPreview.geocodedAddress ? (
                  <div>Matched address: {jurisdictionPreview.geocodedAddress}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </label>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-800">
                Optional device location
              </div>
              <p className="mt-1 text-xs text-slate-500">
                If you allow it, we’ll attach coordinates for map-based
                boundary checks. Otherwise, we’ll try to geocode the typed
                address on the server.
              </p>
            </div>
            <button
              type="button"
              onClick={captureLocation}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Use My Location
            </button>
          </div>
          <input type="hidden" name="latitude" value={locationState.latitude} />
          <input type="hidden" name="longitude" value={locationState.longitude} />
          <p className="mt-3 text-xs text-slate-500">{locationState.message}</p>
          {locationState.latitude && locationState.longitude ? (
            <p className="mt-1 text-xs text-slate-500">
              {locationState.latitude}, {locationState.longitude}
            </p>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-800">
            Photos
          </span>
          <input
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={demoMode}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-slate-500">
            {demoMode
              ? "Disabled in the hosted demo so the site stays lightweight and stable."
              : "Optional. JPEG, PNG, WebP, or GIF. Up to 4 files, 8 MB each."}
          </p>
        </label>
      </div>

      <div className="border-y border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-semibold">Follow-up contact</h2>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="residentName"
            label="Name"
            placeholder="Optional"
            maxLength={120}
          />
          <Field
            name="residentEmail"
            label="Email"
            placeholder="you@example.com"
            type="email"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="residentPhone"
            label="Phone"
            placeholder="Optional"
            maxLength={40}
          />
          <Field
            name="preferredLanguage"
            label="Preferred language"
            defaultValue="English"
            maxLength={60}
          />
        </div>

        <label className="hidden" aria-hidden="true">
          <span>Company</span>
          <input
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
          />
        </label>

        <label className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <input
            name="contactConsent"
            type="checkbox"
            required
            defaultChecked
            className="mt-1"
          />
          <span>I agree to receive email updates about this report.</span>
        </label>

        <label className="flex gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          <input
            name="newsletterOptIn"
            type="checkbox"
            className="mt-1"
          />
          <span>
            I would also like to receive District 7 newsletter and community
            updates by email.
          </span>
        </label>

        <div
          className={`rounded-md px-3 py-2 text-sm ${
            state.status === "error"
              ? "bg-rose-50 text-rose-800"
              : "bg-slate-50 text-slate-600"
          }`}
        >
          {state.message}
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {isPending
              ? "Submitting..."
              : demoMode
                ? "Continue In Demo"
                : "Submit Report"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  defaultValue,
  maxLength,
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
        placeholder={placeholder}
      />
    </label>
  );
}
