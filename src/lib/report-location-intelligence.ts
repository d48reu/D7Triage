import { geocodeAddress, isGeocodingEnabled } from "@/lib/geocoding";
import {
  findMunicipalityForPoint,
  lookupMiamiDadeParcelByPoint,
} from "@/lib/location-intelligence";
import { getJurisdictionConfig } from "@/lib/issues-repository";

export async function resolveReportLocationIntelligence(input: {
  addressText: string;
  latitude: number | null;
  longitude: number | null;
}) {
  let resolvedLatitude = input.latitude;
  let resolvedLongitude = input.longitude;
  let locationSource: "device" | "census_geocoder" | "none" =
    input.latitude !== null && input.longitude !== null ? "device" : "none";
  let geocodingStatus: "captured" | "matched" | "failed" | "not_attempted" =
    input.latitude !== null && input.longitude !== null ? "captured" : "not_attempted";
  let geocodedAddress: string | null = null;
  let geocodingProvider: string | null = null;
  let geocodedAt: string | null = null;

  if (resolvedLatitude === null || resolvedLongitude === null) {
    if (isGeocodingEnabled()) {
      try {
        const geocoded = await geocodeAddress(input.addressText);
        if (geocoded) {
          resolvedLatitude = geocoded.latitude;
          resolvedLongitude = geocoded.longitude;
          locationSource = "census_geocoder";
          geocodingStatus = "matched";
          geocodedAddress = geocoded.matchedAddress;
          geocodingProvider = geocoded.provider;
          geocodedAt = new Date().toISOString();
        } else {
          geocodingStatus = "failed";
        }
      } catch {
        geocodingStatus = "failed";
      }
    }
  }

  const jurisdictionConfig = getJurisdictionConfig();
  const municipalityMatch = findMunicipalityForPoint(
    resolvedLatitude,
    resolvedLongitude,
    jurisdictionConfig,
  );
  const municipalityLookupStatus:
    | "matched"
    | "outside_municipality"
    | "failed"
    | "not_attempted" =
    resolvedLatitude !== null && resolvedLongitude !== null
      ? municipalityMatch
        ? "matched"
        : jurisdictionConfig.municipalityBoundaryGeoJson
          ? "outside_municipality"
          : "not_attempted"
      : "not_attempted";

  let parcelLookupStatus:
    | "matched"
    | "probable_right_of_way"
    | "failed"
    | "not_attempted" = "not_attempted";
  let parcelFolio: string | null = null;
  let parcelAddress: string | null = null;
  let parcelOwner: string | null = null;
  let rightOfWayHint: "on_parcel" | "probable_public_right_of_way" | "unclear" =
    "unclear";
  let parcelMatchedAt: string | null = null;

  if (resolvedLatitude !== null && resolvedLongitude !== null) {
    try {
      const parcelMatch = await lookupMiamiDadeParcelByPoint(
        resolvedLatitude,
        resolvedLongitude,
      );

      if (parcelMatch) {
        parcelLookupStatus =
          parcelMatch.rightOfWayHint === "on_parcel"
            ? "matched"
            : "probable_right_of_way";
        parcelFolio = parcelMatch.folio;
        parcelAddress = parcelMatch.address;
        parcelOwner = parcelMatch.owner;
        rightOfWayHint = parcelMatch.rightOfWayHint;
        parcelMatchedAt = new Date().toISOString();
      } else {
        parcelLookupStatus = "failed";
      }
    } catch {
      parcelLookupStatus = "failed";
    }
  }

  return {
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
    locationSource,
    geocodingStatus,
    geocodedAddress,
    geocodingProvider,
    geocodedAt,
    municipalityName: municipalityMatch?.municipalityName ?? null,
    municipalityCode: municipalityMatch?.municipalityCode ?? null,
    municipalityLookupStatus,
    municipalitySource: municipalityMatch?.source ?? null,
    municipalityMatchedAt: municipalityMatch ? new Date().toISOString() : null,
    parcelLookupStatus,
    parcelFolio,
    parcelAddress,
    parcelOwner,
    rightOfWayHint,
    parcelMatchedAt,
  };
}
