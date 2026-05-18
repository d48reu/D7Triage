export type GeoJsonGeometry = {
  type?: string;
  coordinates?: unknown;
};

type GeoJsonValue = {
  type?: string;
  coordinates?: unknown;
  geometry?: GeoJsonGeometry;
  properties?: Record<string, unknown>;
  features?: Array<{ geometry?: GeoJsonGeometry; properties?: Record<string, unknown> }>;
};

export type GeoJsonFeature = {
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
};

export type Point = [number, number];

export function parseGeoJsonFeatures(raw: string | null | undefined) {
  if (!raw?.trim()) return [] as GeoJsonFeature[];

  try {
    const parsed = JSON.parse(raw) as GeoJsonValue;
    return getGeoJsonFeatures(parsed);
  } catch {
    return [];
  }
}

export function getGeoJsonFeatures(value: GeoJsonValue) {
  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    return value.features
      .filter((feature): feature is { geometry?: GeoJsonGeometry; properties?: Record<string, unknown> } => Boolean(feature))
      .map((feature) => ({
        geometry: feature.geometry || {},
        properties: feature.properties || {},
      }))
      .filter((feature) => Boolean(feature.geometry.type && feature.geometry.coordinates));
  }

  if (value.type === "Feature" && value.geometry) {
    return [
      {
        geometry: value.geometry,
        properties: value.properties || {},
      },
    ].filter((feature) => Boolean(feature.geometry.type && feature.geometry.coordinates));
  }

  if (value.type && value.coordinates) {
    return [
      {
        geometry: { type: value.type, coordinates: value.coordinates },
        properties: value.properties || {},
      },
    ];
  }

  return [] as GeoJsonFeature[];
}

export function geometryContainsPoint(
  geometry: GeoJsonGeometry,
  point: Point,
) {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return polygonContainsPoint(geometry.coordinates as number[][][], point);
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as number[][][][]).some((polygon) =>
      polygonContainsPoint(polygon, point),
    );
  }

  return false;
}

function polygonContainsPoint(
  polygon: number[][][],
  point: Point,
) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;
  const [outerRing, ...holes] = polygon;
  if (!ringContainsPoint(outerRing, point)) return false;
  return !holes.some((ring) => ringContainsPoint(ring, point));
}

function ringContainsPoint(
  ring: number[][],
  point: Point,
) {
  let inside = false;
  const [px, py] = point;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0];
    const yi = ring[i]?.[1];
    const xj = ring[j]?.[0];
    const yj = ring[j]?.[1];

    if (
      xi === undefined ||
      yi === undefined ||
      xj === undefined ||
      yj === undefined
    ) {
      continue;
    }

    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}
