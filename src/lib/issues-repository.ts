import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ISSUE_CATEGORIES, type IssueStatus } from "@/lib/issue-types";
import { ROUTING_RULES } from "@/lib/routing-matrix";

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

export type AiSuggestion = {
  id: string;
  reportId: string;
  summary: string;
  suggestedCategory: string;
  suggestedUrgency: string;
  suggestedResponsibleParty: string;
  suggestedAgencyId: string | null;
  confidence: string;
  explanation: string;
  recommendedNextStep: string;
  missingInformation: string[];
  draftResponse: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
  agency: Agency | null;
};

export type Agency = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactUrl: string | null;
  defaultReferralMethod: string | null;
  escalationNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManagedRoutingRule = {
  id: string;
  category: string;
  agencyId: string | null;
  ownerLabel: string;
  staffGuidance: string;
  residentExplanation: string;
  escalationNotes: string;
  createdAt: string;
  updatedAt: string;
  agency: Agency | null;
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

type AiSuggestionRow = {
  id: string;
  report_id: string;
  summary: string | null;
  suggested_category: string | null;
  suggested_urgency: string | null;
  suggested_responsible_party: string | null;
  suggested_agency_id: string | null;
  confidence: string | null;
  explanation: string | null;
  recommended_next_step: string | null;
  missing_information_json: string | null;
  draft_response: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
  agency_name: string | null;
  agency_contact_name: string | null;
  agency_contact_email: string | null;
  agency_contact_phone: string | null;
  agency_contact_url: string | null;
  agency_default_referral_method: string | null;
  agency_escalation_notes: string | null;
  agency_is_active: number | null;
  agency_created_at: string | null;
  agency_updated_at: string | null;
};

type AgencyRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  default_referral_method: string | null;
  escalation_notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type ManagedRoutingRuleRow = {
  id: string;
  category: string;
  agency_id: string | null;
  owner_label: string;
  staff_guidance: string;
  resident_explanation: string;
  escalation_notes: string;
  created_at: string;
  updated_at: string;
  agency_name: string | null;
  agency_contact_name: string | null;
  agency_contact_email: string | null;
  agency_contact_phone: string | null;
  agency_contact_url: string | null;
  agency_default_referral_method: string | null;
  agency_escalation_notes: string | null;
  agency_is_active: number | null;
  agency_created_at: string | null;
  agency_updated_at: string | null;
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

function hasColumn(
  database: Database.Database,
  table: string,
  column: string,
) {
  const rows = database.prepare(`pragma table_info(${table})`).all() as {
    name: string;
  }[];

  return rows.some((row) => row.name === column);
}

function ensureSchemaMigrations(database: Database.Database) {
  if (!hasColumn(database, "referrals", "agency_id")) {
    database.exec("alter table referrals add column agency_id text;");
  }

  if (!hasColumn(database, "ai_suggestions", "suggested_agency_id")) {
    database.exec("alter table ai_suggestions add column suggested_agency_id text;");
  }

  if (!hasColumn(database, "ai_suggestions", "recommended_next_step")) {
    database.exec("alter table ai_suggestions add column recommended_next_step text;");
  }

  if (!hasColumn(database, "ai_suggestions", "missing_information_json")) {
    database.exec("alter table ai_suggestions add column missing_information_json text;");
  }

  if (!hasColumn(database, "ai_suggestions", "model")) {
    database.exec("alter table ai_suggestions add column model text;");
  }

  if (!hasColumn(database, "ai_suggestions", "input_tokens")) {
    database.exec("alter table ai_suggestions add column input_tokens integer;");
  }

  if (!hasColumn(database, "ai_suggestions", "output_tokens")) {
    database.exec("alter table ai_suggestions add column output_tokens integer;");
  }

  if (!hasColumn(database, "ai_suggestions", "total_tokens")) {
    database.exec("alter table ai_suggestions add column total_tokens integer;");
  }
}

function seedRoutingData(database: Database.Database) {
  const agencyCount = (
    database.prepare("select count(*) as count from agencies").get() as {
      count: number;
    }
  ).count;

  if (agencyCount === 0) {
    const insertAgency = database.prepare(`
      insert into agencies (
        id, name, contact_name, contact_email, contact_phone, contact_url,
        default_referral_method, escalation_notes, is_active, created_at,
        updated_at
      ) values (
        @id, @name, null, null, null, null, @defaultReferralMethod,
        @escalationNotes, 1, @createdAt, @updatedAt
      )
    `);

    const now = nowIso();
    const uniqueNames = Array.from(
      new Set(ROUTING_RULES.map((rule) => rule.likelyResponsibleParty)),
    );

    for (const name of uniqueNames) {
      const matchingRule = ROUTING_RULES.find(
        (rule) => rule.likelyResponsibleParty === name,
      );

      insertAgency.run({
        id: makeId(),
        name,
        defaultReferralMethod: "Email",
        escalationNotes: matchingRule?.escalationNotes ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const routingRuleCount = (
    database.prepare("select count(*) as count from routing_rules").get() as {
      count: number;
    }
  ).count;

  if (routingRuleCount === 0) {
    const agencies = database
      .prepare("select id, name from agencies")
      .all() as { id: string; name: string }[];
    const agencyMap = new Map(agencies.map((agency) => [agency.name, agency.id]));
    const insertRule = database.prepare(`
      insert into routing_rules (
        id, category, agency_id, owner_label, staff_guidance,
        resident_explanation, escalation_notes, created_at, updated_at
      ) values (
        @id, @category, @agencyId, @ownerLabel, @staffGuidance,
        @residentExplanation, @escalationNotes, @createdAt, @updatedAt
      )
    `);
    const now = nowIso();

    for (const rule of ROUTING_RULES) {
      insertRule.run({
        id: makeId(),
        category: rule.category,
        agencyId: agencyMap.get(rule.likelyResponsibleParty) ?? null,
        ownerLabel: rule.likelyResponsibleParty,
        staffGuidance: rule.staffGuidance,
        residentExplanation: rule.residentExplanation,
        escalationNotes: rule.escalationNotes,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
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
      suggested_agency_id text,
      confidence text,
      explanation text,
      recommended_next_step text,
      missing_information_json text,
      draft_response text,
      model text,
      input_tokens integer,
      output_tokens integer,
      total_tokens integer,
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

    create table if not exists agencies (
      id text primary key,
      name text not null unique,
      contact_name text,
      contact_email text,
      contact_phone text,
      contact_url text,
      default_referral_method text,
      escalation_notes text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists routing_rules (
      id text primary key,
      category text not null unique,
      agency_id text references agencies(id) on delete set null,
      owner_label text not null,
      staff_guidance text not null,
      resident_explanation text not null,
      escalation_notes text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_issue_reports_status on issue_reports(status);
    create index if not exists idx_issue_reports_created_at on issue_reports(created_at);
    create index if not exists idx_status_events_report on issue_status_events(report_id);
    create index if not exists idx_staff_notes_report on staff_notes(report_id);
    create index if not exists idx_referrals_report on referrals(report_id);
    create index if not exists idx_attachments_report on issue_attachments(report_id);
    create index if not exists idx_notification_events_report on notification_events(report_id);
    create index if not exists idx_routing_rules_category on routing_rules(category);
    create index if not exists idx_ai_suggestions_report on ai_suggestions(report_id);
  `);

  ensureSchemaMigrations(db);
  seedRoutingData(db);

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

function mapAiSuggestion(row: AiSuggestionRow): AiSuggestion {
  const hasAgency = Boolean(row.agency_name);

  return {
    id: row.id,
    reportId: row.report_id,
    summary: row.summary ?? "",
    suggestedCategory: row.suggested_category ?? "Other / unsure",
    suggestedUrgency: row.suggested_urgency ?? "medium",
    suggestedResponsibleParty: row.suggested_responsible_party ?? "",
    suggestedAgencyId: row.suggested_agency_id,
    confidence: row.confidence ?? "low",
    explanation: row.explanation ?? "",
    recommendedNextStep: row.recommended_next_step ?? "",
    missingInformation: row.missing_information_json
      ? (JSON.parse(row.missing_information_json) as string[])
      : [],
    draftResponse: row.draft_response ?? "",
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    createdAt: row.created_at,
    agency: hasAgency
      ? {
          id: row.suggested_agency_id!,
          name: row.agency_name!,
          contactName: row.agency_contact_name,
          contactEmail: row.agency_contact_email,
          contactPhone: row.agency_contact_phone,
          contactUrl: row.agency_contact_url,
          defaultReferralMethod: row.agency_default_referral_method,
          escalationNotes: row.agency_escalation_notes,
          isActive: row.agency_is_active === 1,
          createdAt: row.agency_created_at!,
          updatedAt: row.agency_updated_at!,
        }
      : null,
  };
}

function mapAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactUrl: row.contact_url,
    defaultReferralMethod: row.default_referral_method,
    escalationNotes: row.escalation_notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapManagedRoutingRule(row: ManagedRoutingRuleRow): ManagedRoutingRule {
  const hasAgency = Boolean(row.agency_name);

  return {
    id: row.id,
    category: row.category,
    agencyId: row.agency_id,
    ownerLabel: row.owner_label,
    staffGuidance: row.staff_guidance,
    residentExplanation: row.resident_explanation,
    escalationNotes: row.escalation_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agency: hasAgency
      ? {
          id: row.agency_id!,
          name: row.agency_name!,
          contactName: row.agency_contact_name,
          contactEmail: row.agency_contact_email,
          contactPhone: row.agency_contact_phone,
          contactUrl: row.agency_contact_url,
          defaultReferralMethod: row.agency_default_referral_method,
          escalationNotes: row.agency_escalation_notes,
          isActive: row.agency_is_active === 1,
          createdAt: row.agency_created_at!,
          updatedAt: row.agency_updated_at!,
        }
      : null,
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

export function listAgencies() {
  const rows = getDb()
    .prepare("select * from agencies order by lower(name) asc")
    .all() as AgencyRow[];

  return rows.map(mapAgency);
}

export function getAgencyById(id: string) {
  const row = getDb()
    .prepare("select * from agencies where id = ?")
    .get(id) as AgencyRow | undefined;

  return row ? mapAgency(row) : null;
}

export function upsertAgency(input: {
  id?: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactUrl?: string;
  defaultReferralMethod?: string;
  escalationNotes?: string;
  isActive?: boolean;
}) {
  const database = getDb();
  const now = nowIso();

  if (input.id) {
    database
      .prepare(
        `update agencies
         set name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
             contact_url = ?, default_referral_method = ?, escalation_notes = ?,
             is_active = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        input.name.trim(),
        input.contactName?.trim() || null,
        input.contactEmail?.trim() || null,
        input.contactPhone?.trim() || null,
        input.contactUrl?.trim() || null,
        input.defaultReferralMethod?.trim() || null,
        input.escalationNotes?.trim() || null,
        input.isActive === false ? 0 : 1,
        now,
        input.id,
      );

    return getAgencyById(input.id);
  }

  const id = makeId();
  database
    .prepare(
      `insert into agencies (
        id, name, contact_name, contact_email, contact_phone, contact_url,
        default_referral_method, escalation_notes, is_active, created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      input.contactName?.trim() || null,
      input.contactEmail?.trim() || null,
      input.contactPhone?.trim() || null,
      input.contactUrl?.trim() || null,
      input.defaultReferralMethod?.trim() || null,
      input.escalationNotes?.trim() || null,
      input.isActive === false ? 0 : 1,
      now,
      now,
    );

  return getAgencyById(id);
}

export function listManagedRoutingRules() {
  const rows = getDb()
    .prepare(
      `select
         routing_rules.*,
         agencies.name as agency_name,
         agencies.contact_name as agency_contact_name,
         agencies.contact_email as agency_contact_email,
         agencies.contact_phone as agency_contact_phone,
         agencies.contact_url as agency_contact_url,
         agencies.default_referral_method as agency_default_referral_method,
         agencies.escalation_notes as agency_escalation_notes,
         agencies.is_active as agency_is_active,
         agencies.created_at as agency_created_at,
         agencies.updated_at as agency_updated_at
       from routing_rules
       left join agencies on agencies.id = routing_rules.agency_id`,
    )
    .all() as ManagedRoutingRuleRow[];

  const mapped = rows.map(mapManagedRoutingRule);
  const orderMap = new Map<string, number>(
    ISSUE_CATEGORIES.map((category, index) => [category, index]),
  );
  mapped.sort(
    (a, b) =>
      (orderMap.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (orderMap.get(b.category) ?? Number.MAX_SAFE_INTEGER),
  );
  return mapped;
}

export function getManagedRoutingRule(category: string) {
  const rules = listManagedRoutingRules();
  return (
    rules.find((rule) => rule.category === category) ??
    rules.find((rule) => rule.category === "Other / unsure") ??
    null
  );
}

export function upsertRoutingRule(input: {
  category: string;
  agencyId?: string;
  ownerLabel?: string;
  staffGuidance: string;
  residentExplanation: string;
  escalationNotes: string;
}) {
  const database = getDb();
  const now = nowIso();
  const agency = input.agencyId ? getAgencyById(input.agencyId) : null;
  const ownerLabel = agency?.name || input.ownerLabel?.trim() || "District 7 triage";
  const existing = database
    .prepare("select id from routing_rules where category = ?")
    .get(input.category) as { id: string } | undefined;

  if (existing) {
    database
      .prepare(
        `update routing_rules
         set agency_id = ?, owner_label = ?, staff_guidance = ?,
             resident_explanation = ?, escalation_notes = ?, updated_at = ?
         where category = ?`,
      )
      .run(
        input.agencyId || null,
        ownerLabel,
        input.staffGuidance.trim(),
        input.residentExplanation.trim(),
        input.escalationNotes.trim(),
        now,
        input.category,
      );
  } else {
    database
      .prepare(
        `insert into routing_rules (
          id, category, agency_id, owner_label, staff_guidance,
          resident_explanation, escalation_notes, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.category,
        input.agencyId || null,
        ownerLabel,
        input.staffGuidance.trim(),
        input.residentExplanation.trim(),
        input.escalationNotes.trim(),
        now,
        now,
      );
  }

  return getManagedRoutingRule(input.category);
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

export function listAiSuggestions(reportId: string) {
  const rows = getDb()
    .prepare(
      `select
         ai_suggestions.*,
         agencies.name as agency_name,
         agencies.contact_name as agency_contact_name,
         agencies.contact_email as agency_contact_email,
         agencies.contact_phone as agency_contact_phone,
         agencies.contact_url as agency_contact_url,
         agencies.default_referral_method as agency_default_referral_method,
         agencies.escalation_notes as agency_escalation_notes,
         agencies.is_active as agency_is_active,
         agencies.created_at as agency_created_at,
         agencies.updated_at as agency_updated_at
       from ai_suggestions
       left join agencies on agencies.id = ai_suggestions.suggested_agency_id
       where ai_suggestions.report_id = ?
       order by datetime(ai_suggestions.created_at) desc`,
    )
    .all(reportId) as AiSuggestionRow[];

  return rows.map(mapAiSuggestion);
}

export function getLatestAiSuggestion(reportId: string) {
  return listAiSuggestions(reportId)[0] ?? null;
}

export function countAiSuggestionsSince(reportId: string, sinceIso: string) {
  const row = getDb()
    .prepare(
      `select count(*) as count
       from ai_suggestions
       where report_id = ? and datetime(created_at) >= datetime(?)`,
    )
    .get(reportId, sinceIso) as { count: number };

  return row.count;
}

export function addAiSuggestion(input: {
  reportId: string;
  summary: string;
  suggestedCategory: string;
  suggestedUrgency: string;
  suggestedResponsibleParty: string;
  suggestedAgencyId?: string | null;
  confidence: string;
  explanation: string;
  recommendedNextStep: string;
  missingInformation: string[];
  draftResponse: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}) {
  const id = makeId();
  getDb()
    .prepare(
      `insert into ai_suggestions (
        id, report_id, summary, suggested_category, suggested_urgency,
        suggested_responsible_party, suggested_agency_id, confidence, explanation,
        recommended_next_step, missing_information_json, draft_response, model,
        input_tokens, output_tokens, total_tokens, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.reportId,
      input.summary,
      input.suggestedCategory,
      input.suggestedUrgency,
      input.suggestedResponsibleParty,
      input.suggestedAgencyId || null,
      input.confidence,
      input.explanation,
      input.recommendedNextStep,
      JSON.stringify(input.missingInformation),
      input.draftResponse,
      input.model || null,
      input.inputTokens ?? null,
      input.outputTokens ?? null,
      input.totalTokens ?? null,
      nowIso(),
    );

  return getLatestAiSuggestion(input.reportId);
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
  agencyId?: string;
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
          id, report_id, agency_id, agency_name, referral_method,
          external_reference, follow_up_date, notes, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.reportId,
        input.agencyId || null,
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
