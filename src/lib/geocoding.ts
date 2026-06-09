export type GeocodeResult = {
  latitude: number;
  longitude: number;
  matchedAddress: string;
  provider: "census";
};

type CensusLocationsResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string;
      coordinates?: {
        x?: number;
        y?: number;
      };
    }>;
  };
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGeocodingProvider() {
  return (process.env.GEOCODING_PROVIDER || "census").trim().toLowerCase();
}

export function isGeocodingEnabled() {
  return getGeocodingProvider() !== "none";
}

function getGeocodingTimeoutMs() {
  return parsePositiveInteger(process.env.GEOCODING_TIMEOUT_MS, 4000);
}

function getCensusBenchmark() {
  return process.env.GEOCODING_CENSUS_BENCHMARK || "Public_AR_Current";
}

function getAddressCandidates(addressText: string) {
  const candidates = [addressText];
  const dixieAlias = addressText.replace(
    /\b(?:s\.?|south)?\s*dixie\s*(?:highway|hwy)\b/i,
    "SW 37th Ave",
  );

  if (dixieAlias !== addressText) {
    candidates.push(dixieAlias);
  }

  return Array.from(new Set(candidates));
}

async function geocodeWithCensus(addressText: string) {
  const candidates = getAddressCandidates(addressText);

  for (const candidate of candidates) {
    const url = new URL(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    url.searchParams.set("address", candidate);
    url.searchParams.set("benchmark", getCensusBenchmark());
    url.searchParams.set("format", "json");

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(getGeocodingTimeoutMs()),
    });

    if (!response.ok) {
      throw new Error(`Census geocoder request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as CensusLocationsResponse;
    const match = payload.result?.addressMatches?.[0];
    const latitude = match?.coordinates?.y;
    const longitude = match?.coordinates?.x;

    if (match?.matchedAddress && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return {
        latitude: Number(latitude),
        longitude: Number(longitude),
        matchedAddress: match.matchedAddress,
        provider: "census" as const,
      };
    }
  }

  return null;
}

export async function geocodeAddress(addressText: string) {
  const provider = getGeocodingProvider();
  const normalizedAddress = addressText.trim();

  if (!normalizedAddress || provider === "none") {
    return null;
  }

  if (provider !== "census") {
    throw new Error(`Unsupported geocoding provider: ${provider}`);
  }

  return geocodeWithCensus(normalizedAddress);
}
