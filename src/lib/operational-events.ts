import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getIssuesDatabase } from "@/lib/issues-repository";

export type OperationalEventSeverity = "info" | "warning" | "error";

export type OperationalEvent = {
  id: string;
  eventType: string;
  severity: OperationalEventSeverity;
  action: string;
  outcome: string;
  errorCode: string | null;
  route: string;
  browserFamily: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  release: string;
  staffMemberId: string | null;
  createdAt: string;
};

type OperationalEventRow = {
  id: string;
  event_type: string;
  severity: OperationalEventSeverity;
  action: string;
  outcome: string;
  error_code: string | null;
  route: string;
  browser_family: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  release: string;
  staff_member_id: string | null;
  created_at: string;
};

export function recordOperationalEvent(input: {
  eventType: string;
  severity: OperationalEventSeverity;
  action: string;
  outcome: string;
  errorCode?: string | null;
  route?: string | null;
  browserFamily?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  release?: string | null;
  staffMemberId?: string | null;
}) {
  const database = getOperationalDatabase();
  const event: OperationalEvent = {
    id: crypto.randomUUID(),
    eventType: safeToken(input.eventType, "unknown_event"),
    severity: input.severity,
    action: safeToken(input.action, "unknown_action"),
    outcome: safeToken(input.outcome, "unknown_outcome"),
    errorCode: input.errorCode ? safeToken(input.errorCode, "unknown") : null,
    route: sanitizeRoute(input.route),
    browserFamily: input.browserFamily
      ? safeToken(input.browserFamily, "Other")
      : null,
    viewportWidth: safeViewport(input.viewportWidth),
    viewportHeight: safeViewport(input.viewportHeight),
    release: safeToken(input.release || getReleaseLabel(), "development"),
    staffMemberId: input.staffMemberId?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  database
    .prepare(
      `insert into operational_events (
        id, event_type, severity, action, outcome, error_code, route,
        browser_family, viewport_width, viewport_height, release,
        staff_member_id, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.id,
      event.eventType,
      event.severity,
      event.action,
      event.outcome,
      event.errorCode,
      event.route,
      event.browserFamily,
      event.viewportWidth,
      event.viewportHeight,
      event.release,
      event.staffMemberId,
      event.createdAt,
    );

  pruneOperationalEvents(database, 1000);
  console[severityConsoleMethod(event.severity)](
    JSON.stringify({
      level: event.severity,
      event: event.eventType,
      action: event.action,
      outcome: event.outcome,
      errorCode: event.errorCode,
      route: event.route,
      browserFamily: event.browserFamily,
      viewport: [event.viewportWidth, event.viewportHeight],
      release: event.release,
    }),
  );
  return event;
}

export function listOperationalEvents(limit = 100) {
  const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
  const rows = getOperationalDatabase()
    .prepare(
      `select * from operational_events
       order by datetime(created_at) desc
       limit ?`,
    )
    .all(safeLimit) as OperationalEventRow[];
  return rows.map(mapOperationalEvent);
}

export function getOperationalEventSummary(days = 7) {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const rows = getOperationalDatabase()
    .prepare(
      `select outcome, count(*) as count
       from operational_events
       where datetime(created_at) >= datetime(?)
       group by outcome`,
    )
    .all(since) as Array<{ outcome: string; count: number }>;
  return Object.fromEntries(rows.map((row) => [row.outcome, row.count]));
}

export function getReleaseLabel() {
  return (
    process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
    process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
    "development"
  );
}

function getOperationalDatabase() {
  const database = getIssuesDatabase();
  database.exec(`
    create table if not exists operational_events (
      id text primary key,
      event_type text not null,
      severity text not null,
      action text not null,
      outcome text not null,
      error_code text,
      route text not null,
      browser_family text,
      viewport_width integer,
      viewport_height integer,
      release text not null,
      staff_member_id text references staff_members(id) on delete set null,
      created_at text not null
    );
    create index if not exists idx_operational_events_created_at
      on operational_events(created_at);
    create index if not exists idx_operational_events_outcome
      on operational_events(outcome, created_at);
  `);
  return database;
}

function pruneOperationalEvents(database: Database.Database, keep: number) {
  database
    .prepare(
      `delete from operational_events
       where id in (
         select id from operational_events
         order by datetime(created_at) desc
         limit -1 offset ?
       )`,
    )
    .run(keep);
}

function mapOperationalEvent(row: OperationalEventRow): OperationalEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    severity: row.severity,
    action: row.action,
    outcome: row.outcome,
    errorCode: row.error_code,
    route: row.route,
    browserFamily: row.browser_family,
    viewportWidth: row.viewport_width,
    viewportHeight: row.viewport_height,
    release: row.release,
    staffMemberId: row.staff_member_id,
    createdAt: row.created_at,
  };
}

function sanitizeRoute(value: string | null | undefined) {
  const route = (value || "/staff/intake-board").split(/[?#]/, 1)[0];
  return route
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/[a-f0-9]{20,}(?=\/|$)/gi, "/:token")
    .slice(0, 160);
}

function safeToken(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_.:/-]+/g, "_")
    .slice(0, 80);
  return normalized || fallback;
}

function safeViewport(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) < 10000
    ? Number(value)
    : null;
}

function severityConsoleMethod(severity: OperationalEventSeverity) {
  return severity === "error" ? "error" : severity === "warning" ? "warn" : "info";
}
