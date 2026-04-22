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

export type Referral = {
  id: string;
  reportId: string;
  agencyName: string;
  referralMethod: string;
  externalReference: string | null;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
};

export type IssueAttachment = {
  id: string;
  reportId: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export type NotificationEvent = {
  id: string;
  reportId: string;
  eventType: string;
  recipient: string | null;
  subject: string;
  body: string;
  deliveryStatus: string;
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

type ReferralRow = {
  id: string;
  report_id: string;
  agency_name: string;
  referral_method: string;
  external_reference: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
};

type IssueAttachmentRow = {
  id: string;
  report_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type NotificationEventRow = {
  id: string;
  report_id: string;
  event_type: string;
  recipient: string | null;
  subject: string;
  body: string;
  delivery_status: string;
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

    create table if not exists notification_events (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      event_type text not null,
      recipient text,
      subject text not null,
      body text not null,
      delivery_status text not null default 'local_stub',
      created_at text not null
    );

    create index if not exists idx_issue_reports_status on issue_reports(status);
    create index if not exists idx_issue_reports_created_at on issue_reports(created_at);
    create index if not exists idx_status_events_report on issue_status_events(report_id);
    create index if not exists idx_staff_notes_report on staff_notes(report_id);
    create index if not exists idx_referrals_report on referrals(report_id);
    create index if not exists idx_attachments_report on issue_attachments(report_id);
    create index if not exists idx_notification_events_report on notification_events(report_id);
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

function mapReferral(row: ReferralRow): Referral {
  return {
    id: row.id,
    reportId: row.report_id,
    agencyName: row.agency_name,
    referralMethod: row.referral_method,
    externalReference: row.external_reference,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapAttachment(row: IssueAttachmentRow): IssueAttachment {
  return {
    id: row.id,
    reportId: row.report_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function mapNotificationEvent(row: NotificationEventRow): NotificationEvent {
  return {
    id: row.id,
    reportId: row.report_id,
    eventType: row.event_type,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    deliveryStatus: row.delivery_status,
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

    database
      .prepare(
        `insert into notification_events (
          id, report_id, event_type, recipient, subject, body, delivery_status,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        id,
        "confirmation",
        input.residentEmail,
        "District 7 received your report",
        `Your report was received and is waiting for staff review. Tracking token: ${token}`,
        "local_stub",
        createdAt,
      );
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

export function listReferrals(reportId: string) {
  const rows = getDb()
    .prepare(
      "select * from referrals where report_id = ? order by datetime(created_at) desc",
    )
    .all(reportId) as ReferralRow[];

  return rows.map(mapReferral);
}

export function listAttachments(reportId: string) {
  const rows = getDb()
    .prepare(
      "select * from issue_attachments where report_id = ? order by datetime(created_at) desc",
    )
    .all(reportId) as IssueAttachmentRow[];

  return rows.map(mapAttachment);
}

export function getAttachmentById(id: string) {
  const row = getDb()
    .prepare("select * from issue_attachments where id = ?")
    .get(id) as IssueAttachmentRow | undefined;

  return row ? mapAttachment(row) : null;
}

export function addAttachment(input: {
  reportId: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  const id = makeId();
  getDb()
    .prepare(
      `insert into issue_attachments (
        id, report_id, file_name, storage_path, mime_type, size_bytes, created_at
      ) values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.reportId,
      input.fileName,
      input.storagePath,
      input.mimeType || null,
      input.sizeBytes ?? null,
      nowIso(),
    );

  return getAttachmentById(id);
}

export function listNotificationEvents(reportId: string) {
  const rows = getDb()
    .prepare(
      "select * from notification_events where report_id = ? order by datetime(created_at) desc",
    )
    .all(reportId) as NotificationEventRow[];

  return rows.map(mapNotificationEvent);
}

export function addNotificationEvent(input: {
  reportId: string;
  eventType: string;
  recipient?: string | null;
  subject: string;
  body: string;
  deliveryStatus?: string;
}) {
  getDb()
    .prepare(
      `insert into notification_events (
        id, report_id, event_type, recipient, subject, body, delivery_status,
        created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      makeId(),
      input.reportId,
      input.eventType,
      input.recipient || null,
      input.subject,
      input.body,
      input.deliveryStatus || "local_stub",
      nowIso(),
    );
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPotentialDuplicates(report: IssueReport) {
  const reportAddress = normalizeSearchText(report.addressText);

  if (!reportAddress) {
    return [];
  }

  return listIssueReports()
    .filter((candidate) => candidate.id !== report.id)
    .filter((candidate) => candidate.category === report.category)
    .filter((candidate) => {
      const candidateAddress = normalizeSearchText(candidate.addressText);
      return (
        candidateAddress === reportAddress ||
        candidateAddress.includes(reportAddress) ||
        reportAddress.includes(candidateAddress)
      );
    })
    .slice(0, 5);
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

    database
      .prepare(
        `insert into notification_events (
          id, report_id, event_type, recipient, subject, body, delivery_status,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.reportId,
        "status_update",
        null,
        `Report status updated to ${input.status}`,
        input.publicNote?.trim() || `Report status updated to ${input.status}.`,
        "local_stub",
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

export function addReferral(input: {
  reportId: string;
  agencyName: string;
  referralMethod: string;
  externalReference?: string;
  followUpDate?: string;
  notes?: string;
  publicNote?: string;
}) {
  const database = getDb();
  const createdAt = nowIso();
  const publicNote =
    input.publicNote?.trim() ||
    `This report was referred to ${input.agencyName} for review.`;

  database.transaction(() => {
    database
      .prepare(
        `insert into referrals (
          id, report_id, agency_name, referral_method, external_reference,
          follow_up_date, notes, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.reportId,
        input.agencyName,
        input.referralMethod,
        input.externalReference?.trim() || null,
        input.followUpDate?.trim() || null,
        input.notes?.trim() || null,
        createdAt,
      );

    database
      .prepare("update issue_reports set status = ?, updated_at = ? where id = ?")
      .run("routed", createdAt, input.reportId);

    database
      .prepare(
        "insert into issue_status_events (id, report_id, status, public_note, created_at) values (?, ?, ?, ?, ?)",
      )
      .run(makeId(), input.reportId, "routed", publicNote, createdAt);

    database
      .prepare(
        `insert into notification_events (
          id, report_id, event_type, recipient, subject, body, delivery_status,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.reportId,
        "referral",
        null,
        `Report referred to ${input.agencyName}`,
        publicNote,
        "local_stub",
        createdAt,
      );
  })();
}
