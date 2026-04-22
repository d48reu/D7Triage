import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IssueStatus } from "@/lib/issue-types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "issues.db");

let db: Database.Database | null = null;

export type IssueReport = {
  id: string;
  publicTrackingToken: string;
  status: IssueStatus;
  category: string;
  description: string;
  addressText: string;
  residentName: string | null;
  residentEmail: string;
  residentPhone: string | null;
  preferredLanguage: string;
  contactConsent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IssueStatusEvent = {
  id: string;
  reportId: string;
  status: IssueStatus;
  publicNote: string | null;
  createdAt: string;
};

export type StaffNote = {
  id: string;
  reportId: string;
  body: string;
  createdAt: string;
};

type IssueReportRow = {
  id: string;
  public_tracking_token: string;
  status: IssueStatus;
  category: string;
  description: string;
  address_text: string;
  resident_name: string | null;
  resident_email: string;
  resident_phone: string | null;
  preferred_language: string;
  contact_consent: number;
  created_at: string;
  updated_at: string;
};

type IssueStatusEventRow = {
  id: string;
  report_id: string;
  status: IssueStatus;
  public_note: string | null;
  created_at: string;
};

type StaffNoteRow = {
  id: string;
  report_id: string;
  body: string;
  created_at: string;
};

export type CreateIssueReportInput = {
  category: string;
  description: string;
  addressText: string;
  residentName?: string;
  residentEmail: string;
  residentPhone?: string;
  preferredLanguage?: string;
  contactConsent: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return crypto.randomUUID();
}

function makeTrackingToken() {
  return crypto.randomBytes(12).toString("hex");
}

function getDb() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    create table if not exists issue_reports (
      id text primary key,
      public_tracking_token text not null unique,
      status text not null,
      category text not null,
      description text not null,
      address_text text not null,
      resident_name text,
      resident_email text not null,
      resident_phone text,
      preferred_language text not null default 'English',
      contact_consent integer not null default 1,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists issue_attachments (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      file_name text not null,
      storage_path text not null,
      mime_type text,
      size_bytes integer,
      created_at text not null
    );

    create table if not exists issue_status_events (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      status text not null,
      public_note text,
      created_at text not null
    );

    create table if not exists staff_notes (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      body text not null,
      created_at text not null
    );

    create table if not exists referrals (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      agency_name text not null,
      referral_method text not null,
      external_reference text,
      follow_up_date text,
      notes text,
      created_at text not null
    );

    create table if not exists ai_suggestions (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      summary text,
      suggested_category text,
      suggested_urgency text,
      suggested_responsible_party text,
      confidence text,
      explanation text,
      draft_response text,
      created_at text not null
    );

    create index if not exists idx_issue_reports_status on issue_reports(status);
    create index if not exists idx_issue_reports_created_at on issue_reports(created_at);
    create index if not exists idx_status_events_report on issue_status_events(report_id);
    create index if not exists idx_staff_notes_report on staff_notes(report_id);
  `);

  return db;
}

function mapReport(row: IssueReportRow): IssueReport {
  return {
    id: row.id,
    publicTrackingToken: row.public_tracking_token,
    status: row.status,
    category: row.category,
    description: row.description,
    addressText: row.address_text,
    residentName: row.resident_name,
    residentEmail: row.resident_email,
    residentPhone: row.resident_phone,
    preferredLanguage: row.preferred_language,
    contactConsent: row.contact_consent === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStatusEvent(row: IssueStatusEventRow): IssueStatusEvent {
  return {
    id: row.id,
    reportId: row.report_id,
    status: row.status,
    publicNote: row.public_note,
    createdAt: row.created_at,
  };
}

function mapStaffNote(row: StaffNoteRow): StaffNote {
  return {
    id: row.id,
    reportId: row.report_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function createIssueReport(input: CreateIssueReportInput) {
  const database = getDb();
  const id = makeId();
  const createdAt = nowIso();
  const token = makeTrackingToken();

  const insertReport = database.prepare(`
    insert into issue_reports (
      id, public_tracking_token, status, category, description, address_text,
      resident_name, resident_email, resident_phone, preferred_language,
      contact_consent, created_at, updated_at
    ) values (
      @id, @publicTrackingToken, @status, @category, @description, @addressText,
      @residentName, @residentEmail, @residentPhone, @preferredLanguage,
      @contactConsent, @createdAt, @updatedAt
    )
  `);

  const insertStatusEvent = database.prepare(`
    insert into issue_status_events (
      id, report_id, status, public_note, created_at
    ) values (
      @id, @reportId, @status, @publicNote, @createdAt
    )
  `);

  database.transaction(() => {
    insertReport.run({
      id,
      publicTrackingToken: token,
      status: "received",
      category: input.category,
      description: input.description,
      addressText: input.addressText,
      residentName: input.residentName || null,
      residentEmail: input.residentEmail,
      residentPhone: input.residentPhone || null,
      preferredLanguage: input.preferredLanguage || "English",
      contactConsent: input.contactConsent ? 1 : 0,
      createdAt,
      updatedAt: createdAt,
    });

    insertStatusEvent.run({
      id: makeId(),
      reportId: id,
      status: "received",
      publicNote: "Your report was received and is waiting for staff review.",
      createdAt,
    });
  })();

  return getIssueReportById(id);
}

export function listIssueReports() {
  const rows = getDb()
    .prepare(
      "select * from issue_reports order by datetime(created_at) desc limit 100",
    )
    .all() as IssueReportRow[];

  return rows.map(mapReport);
}

export function getIssueReportById(id: string) {
  const row = getDb()
    .prepare("select * from issue_reports where id = ?")
    .get(id) as IssueReportRow | undefined;

  return row ? mapReport(row) : null;
}

export function getIssueReportByToken(token: string) {
  const row = getDb()
    .prepare("select * from issue_reports where public_tracking_token = ?")
    .get(token) as IssueReportRow | undefined;

  return row ? mapReport(row) : null;
}

export function listStatusEvents(reportId: string) {
  const rows = getDb()
    .prepare(
      "select * from issue_status_events where report_id = ? order by datetime(created_at) desc",
    )
    .all(reportId) as IssueStatusEventRow[];

  return rows.map(mapStatusEvent);
}

export function listStaffNotes(reportId: string) {
  const rows = getDb()
    .prepare(
      "select * from staff_notes where report_id = ? order by datetime(created_at) desc",
    )
    .all(reportId) as StaffNoteRow[];

  return rows.map(mapStaffNote);
}

export function updateIssueStatus(input: {
  reportId: string;
  status: IssueStatus;
  publicNote?: string;
}) {
  const database = getDb();
  const updatedAt = nowIso();

  database.transaction(() => {
    database
      .prepare("update issue_reports set status = ?, updated_at = ? where id = ?")
      .run(input.status, updatedAt, input.reportId);

    database
      .prepare(
        "insert into issue_status_events (id, report_id, status, public_note, created_at) values (?, ?, ?, ?, ?)",
      )
      .run(
        makeId(),
        input.reportId,
        input.status,
        input.publicNote?.trim() || null,
        updatedAt,
      );
  })();
}

export function addStaffNote(input: { reportId: string; body: string }) {
  getDb()
    .prepare(
      "insert into staff_notes (id, report_id, body, created_at) values (?, ?, ?, ?)",
    )
    .run(makeId(), input.reportId, input.body, nowIso());
}
