type BoundaryPreviewProps = {
  boundaryGeoJson: string | null;
  boundaryName: string | null;
  latitude: number | null;
  longitude: number | null;
  districtStatusLabel: string;
};

type Point = [number, number];

export function BoundaryPreview({
  boundaryGeoJson,
  boundaryName,
  latitude,
  longitude,
  districtStatusLabel,
}: BoundaryPreviewProps) {
  const polygons = parseBoundaryGeoJson(boundaryGeoJson);
  const point =
    latitude !== null && longitude !== null ? ([longitude, latitude] as Point) : null;
  const preview = buildPreview(polygons, point);

  return (
    <section className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Boundary preview
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {boundaryName || "No named boundary loaded"}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {point
              ? `Captured point is being evaluated against the configured district boundary. Current result: ${districtStatusLabel}.`
              : "No captured coordinates on this case yet, so the boundary is shown for context only."}
          </p>
        </div>
        {point ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Open In Map
          </a>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
        <svg viewBox="0 0 320 220" className="h-auto w-full">
          <rect x="0" y="0" width="320" height="220" fill="#f8fafc" />
          <g>
            {preview.paths.map((pathData, index) => (
              <path
                key={`${pathData}-${index}`}
                d={pathData}
                fill="rgba(14, 165, 233, 0.14)"
                stroke="#0284c7"
                strokeWidth="2"
              />
            ))}
            {preview.point ? (
              <circle
                cx={preview.point[0]}
                cy={preview.point[1]}
                r="5"
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="2"
              />
            ) : null}
          </g>
          <text x="12" y="208" fontSize="10" fill="#64748b">
            {preview.caption}
          </text>
        </svg>
      </div>
    </section>
  );
}

function parseBoundaryGeoJson(raw: string | null) {
  if (!raw?.trim()) return [] as Point[][];

  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      coordinates?: unknown;
      geometry?: { type?: string; coordinates?: unknown };
      features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
    };

    const geometries = getGeometries(parsed);
    return geometries.flatMap((geometry) => geometryToPolygons(geometry));
  } catch {
    return [];
  }
}

function getGeometries(value: {
  type?: string;
  coordinates?: unknown;
  geometry?: { type?: string; coordinates?: unknown };
  features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
}) {
  if (value.type === "FeatureCollection" && Array.isArray(value.features)) {
    return value.features
      .map((feature) => feature.geometry)
      .filter((geometry): geometry is { type?: string; coordinates?: unknown } => Boolean(geometry));
  }

  if (value.type === "Feature" && value.geometry) {
    return [value.geometry];
  }

  if (value.type && value.coordinates) {
    return [{ type: value.type, coordinates: value.coordinates }];
  }

  return [];
}

function geometryToPolygons(geometry: { type?: string; coordinates?: unknown }) {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    const [outerRing] = geometry.coordinates as number[][][];
    return outerRing ? [outerRing as Point[]] : [];
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as number[][][][])
      .map((polygon) => polygon[0] as Point[] | undefined)
      .filter((ring): ring is Point[] => Boolean(ring));
  }

  return [] as Point[][];
}

function buildPreview(polygons: Point[][], point: Point | null) {
  const allPoints = [...polygons.flat(), ...(point ? [point] : [])];

  if (allPoints.length === 0) {
    return {
      paths: [] as string[],
      point: null as [number, number] | null,
      caption: "No boundary or coordinates available yet.",
    };
  }

  const xs = allPoints.map((item) => item[0]);
  const ys = allPoints.map((item) => item[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 0.000001);
  const height = Math.max(maxY - minY, 0.000001);
  const pad = 18;
  const scaleX = (320 - pad * 2) / width;
  const scaleY = (220 - pad * 2) / height;
  const scale = Math.min(scaleX, scaleY);

  const project = ([x, y]: Point): [number, number] => [
    pad + (x - minX) * scale,
    220 - pad - (y - minY) * scale,
  ];

  const paths = polygons.map((polygon) =>
    polygon
      .map((item, index) => {
        const [x, y] = project(item);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z",
  );

  return {
    paths,
    point: point ? project(point) : null,
    caption:
      polygons.length > 0
        ? `Boundary polygons: ${polygons.length}${point ? " | Captured point shown in red" : ""}`
        : "Only a captured point is available right now.",
  };
}
