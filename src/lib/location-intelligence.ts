import { geometryContainsPoint, parseGeoJsonFeatures, type Point } from "@/lib/geojson-utils";
import type { JurisdictionConfig } from "@/lib/issues-repository";

export type MunicipalityMatch = {
  municipalityName: string;
  municipalityCode: string | null;
  source: string;
};

export type ParcelMatch = {
  folio: string | null;
  address: string | null;
  owner: string | null;
  rightOfWayHint: "on_parcel" | "probable_public_right_of_way" | "unclear";
  source: string;
};

type ParcelQueryResponse = {
  features?: Array<{
    attributes?: {
      FOLIO?: string;
      TRUE_SITE_?: string;
      TRUE_OWNER?: string;
    };
  }>;
};

const MIAMI_DADE_MUNICIPALITY_GEOJSON_URL =
  "https://gisweb.miamidade.gov/arcgis/rest/services/MD_MDPDViewer/MapServer/8/query?where=1%3D1&outFields=NAME%2CMUNICID&returnGeometry=true&f=geojson&outSR=4326";
const MIAMI_DADE_PARCEL_QUERY_BASE =
  "https://services5.arcgis.com/wI5GZmCtnUU8ueya/arcgis/rest/services/Miami_Dade_County_Parcel_Boundary/FeatureServer/0/query";

function getLookupTimeoutMs() {
  const parsed = Number(process.env.LOCATION_LOOKUP_TIMEOUT_MS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5000;
}

export async function fetchOfficialMiamiDadeMunicipalityBoundaries() {
  const response = await fetch(MIAMI_DADE_MUNICIPALITY_GEOJSON_URL, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(getLookupTimeoutMs()),
  });

  if (!response.ok) {
    throw new Error(`Municipality boundary fetch failed with ${response.status}.`);
  }

  const raw = await response.text();
  const features = parseGeoJsonFeatures(raw);
  if (features.length === 0) {
    throw new Error("Municipality boundary dataset was empty.");
  }

  return {
    datasetName: "Miami-Dade County municipalities (official ArcGIS boundary layer)",
    geoJson: raw,
    featureCount: features.length,
  };
}

export function findMunicipalityForPoint(
  latitude: number | null,
  longitude: number | null,
  jurisdictionConfig: Pick<
    JurisdictionConfig,
    "municipalityBoundaryGeoJson" | "municipalityBoundaryName"
  >,
) {
  if (
    latitude === null ||
    longitude === null ||
    !jurisdictionConfig.municipalityBoundaryGeoJson
  ) {
    return null;
  }

  const point: Point = [longitude, latitude];
  const features = parseGeoJsonFeatures(jurisdictionConfig.municipalityBoundaryGeoJson);

  const match = features.find((feature) => geometryContainsPoint(feature.geometry, point));
  if (!match) {
    return null;
  }

  return {
    municipalityName: String(match.properties.NAME || "").trim() || "Unknown municipality",
    municipalityCode:
      match.properties.MUNICID !== undefined && match.properties.MUNICID !== null
        ? String(match.properties.MUNICID).trim() || null
        : null,
    source:
      jurisdictionConfig.municipalityBoundaryName ||
      "Miami-Dade County municipality boundary dataset",
  } satisfies MunicipalityMatch;
}

export async function lookupMiamiDadeParcelByPoint(
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude === null || longitude === null) {
    return null;
  }

  const url = new URL(MIAMI_DADE_PARCEL_QUERY_BASE);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "FOLIO,TRUE_SITE_,TRUE_OWNER");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("geometry", `${longitude},${latitude}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("f", "json");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(getLookupTimeoutMs()),
  });

  if (!response.ok) {
    throw new Error(`Parcel lookup failed with ${response.status}.`);
  }

  const payload = (await response.json()) as ParcelQueryResponse;
  const match = payload.features?.[0]?.attributes;

  if (!match) {
    return {
      folio: null,
      address: null,
      owner: null,
      rightOfWayHint: "probable_public_right_of_way" as const,
      source: "Miami-Dade County parcel boundary point query",
    };
  }

  return {
    folio: match.FOLIO?.trim() || null,
    address: match.TRUE_SITE_?.trim() || null,
    owner: match.TRUE_OWNER?.trim() || null,
    rightOfWayHint: "on_parcel" as const,
    source: "Miami-Dade County parcel boundary point query",
  } satisfies ParcelMatch;
}
