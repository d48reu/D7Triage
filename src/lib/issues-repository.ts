import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  DEMO_JURISDICTION_SEED,
  DEMO_NOTES,
  DEMO_NOTIFICATION_EVENTS,
  DEMO_REFERRALS,
  DEMO_REPORTS,
  DEMO_STATUS_EVENTS,
  DEMO_STAFF_MEMBERS,
} from "@/demo-data/demo-seed";
import { isDemoMode } from "@/lib/demo-mode";
import {
  ISSUE_CATEGORIES,
  formatStatus,
  normalizeIssueCategory,
  type IssueStatus,
} from "@/lib/issue-types";
import {
  NOTIFICATION_TEMPLATE_DEFINITIONS,
  type NotificationTemplateKey,
} from "@/lib/notification-template-definitions";
import { ROUTING_RULES } from "@/lib/routing-matrix";
import { getDataDir, getDbPath } from "@/lib/data-paths";

const DATA_DIR = getDataDir();
const DB_PATH = getDbPath();

const STAFF_ROSTER_ADDITIONS = [
  {
    id: "staff-carol-gustafson",
    name: "Carol Gustafson",
  },
  {
    id: "staff-karl-eugene-boehm",
    name: "Karl Eugene Boehm",
  },
] as const;

let db: Database.Database | null = null;

export type IssueReport = {
  id: string;
  publicTrackingToken: string;
  status: IssueStatus;
  assignedStaffId: string | null;
  assignedAt: string | null;
  category: string;
  description: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: "device" | "census_geocoder" | "none";
  geocodingStatus: "captured" | "matched" | "failed" | "not_attempted";
  geocodedAddress: string | null;
  geocodingProvider: string | null;
  geocodedAt: string | null;
  municipalityName: string | null;
  municipalityCode: string | null;
  municipalityLookupStatus: "matched" | "outside_municipality" | "failed" | "not_attempted";
  municipalitySource: string | null;
  municipalityMatchedAt: string | null;
  parcelLookupStatus: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  parcelFolio: string | null;
  parcelAddress: string | null;
  parcelOwner: string | null;
  rightOfWayHint: "on_parcel" | "probable_public_right_of_way" | "unclear";
  parcelMatchedAt: string | null;
  residentName: string | null;
  residentEmail: string;
  residentPhone: string | null;
  preferredLanguage: string;
  contactConsent: boolean;
  newsletterOptIn: boolean;
  newsletterOptInAt: string | null;
  notificationReviewStatus: "ready" | "needs_edit" | "hold" | null;
  notificationReviewNote: string | null;
  notificationReviewedAt: string | null;
  duplicateOfReportId: string | null;
  duplicateReviewDecision: "linked_to_master" | "kept_separate" | null;
  duplicateReviewedAt: string | null;
  duplicateReviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterContact = {
  residentEmail: string;
  residentName: string | null;
  residentPhone: string | null;
  preferredLanguage: string;
  firstOptedInAt: string;
  lastOptedInAt: string;
  latestReportId: string;
  reportCount: number;
};

export type JurisdictionConfig = {
  districtMatchKeywords: string[];
  districtOutsideKeywords: string[];
  stateKeywords: string[];
  countyKeywords: string[];
  utilityKeywords: string[];
  privatePropertyKeywords: string[];
  schoolKeywords: string[];
  transitKeywords: string[];
  parksKeywords: string[];
  districtBoundaryName: string | null;
  districtBoundaryGeoJson: string | null;
  municipalityBoundaryName: string | null;
  municipalityBoundaryGeoJson: string | null;
  countyCommissionDistrictsName: string | null;
  countyCommissionDistrictsGeoJson: string | null;
  updatedAt: string | null;
};

export type AnalyticsView = {
  id: string;
  name: string;
  preset: string;
  dateFrom: string | null;
  dateTo: string | null;
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

export type IssueAuditEvent = {
  id: string;
  reportId: string;
  eventType: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  actorLabel: string;
  createdAt: string;
};

export type AssignmentAcknowledgment = {
  id: string;
  reportId: string;
  staffMemberId: string;
  createdAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  focusAreas: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Referral = {
  id: string;
  reportId: string;
  agencyName: string;
  referralMethod: string;
  outcomeStatus: string;
  externalReference: string | null;
  followUpDate: string | null;
  notes: string | null;
  outcomeNote: string | null;
  updatedAt: string;
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
  templateKey: NotificationTemplateKey | null;
  templateUpdatedAt: string | null;
  recipient: string | null;
  subject: string;
  body: string;
  deliveryStatus: string;
  createdAt: string;
};

export type NotificationTemplate = {
  key: NotificationTemplateKey;
  label: string;
  subjectTemplate: string;
  bodyTemplate: string;
  updatedAt: string;
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
  feedbackDisposition: "accepted" | "accepted_with_edits" | "rejected" | null;
  feedbackNote: string | null;
  feedbackCreatedAt: string | null;
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
  municipalityName: string | null;
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
  assigned_staff_id: string | null;
  assigned_at: string | null;
  category: string;
  description: string;
  address_text: string;
  latitude: number | null;
  longitude: number | null;
  location_source: "device" | "census_geocoder" | "none";
  geocoding_status: "captured" | "matched" | "failed" | "not_attempted";
  geocoded_address: string | null;
  geocoding_provider: string | null;
  geocoded_at: string | null;
  municipality_name: string | null;
  municipality_code: string | null;
  municipality_lookup_status: "matched" | "outside_municipality" | "failed" | "not_attempted";
  municipality_source: string | null;
  municipality_matched_at: string | null;
  parcel_lookup_status: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  parcel_folio: string | null;
  parcel_address: string | null;
  parcel_owner: string | null;
  right_of_way_hint: "on_parcel" | "probable_public_right_of_way" | "unclear";
  parcel_matched_at: string | null;
  resident_name: string | null;
  resident_email: string;
  resident_phone: string | null;
  preferred_language: string;
  contact_consent: number;
  newsletter_opt_in: number;
  newsletter_opt_in_at: string | null;
  notification_review_status: "ready" | "needs_edit" | "hold" | null;
  notification_review_note: string | null;
  notification_reviewed_at: string | null;
  duplicate_of_report_id: string | null;
  duplicate_review_decision: "linked_to_master" | "kept_separate" | null;
  duplicate_reviewed_at: string | null;
  duplicate_review_note: string | null;
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

type IssueAuditEventRow = {
  id: string;
  report_id: string;
  event_type: string;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  actor_label: string;
  created_at: string;
};

type StaffMemberRow = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  focus_areas: string | null;
  role_label: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type AssignmentAcknowledgmentRow = {
  id: string;
  report_id: string;
  staff_member_id: string;
  created_at: string;
};

type ReferralRow = {
  id: string;
  report_id: string;
  agency_name: string;
  referral_method: string;
  outcome_status: string;
  external_reference: string | null;
  follow_up_date: string | null;
  notes: string | null;
  outcome_note: string | null;
  updated_at: string;
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
  template_key: NotificationTemplateKey | null;
  template_updated_at: string | null;
  recipient: string | null;
  subject: string;
  body: string;
  delivery_status: string;
  created_at: string;
};

type NotificationTemplateRow = {
  key: NotificationTemplateKey;
  label: string;
  subject_template: string;
  body_template: string;
  updated_at: string;
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
  feedback_disposition: "accepted" | "accepted_with_edits" | "rejected" | null;
  feedback_note: string | null;
  feedback_created_at: string | null;
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
  municipality_name: string | null;
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

type JurisdictionSettingsRow = {
  id: number;
  district_match_keywords: string | null;
  district_outside_keywords: string | null;
  state_keywords: string | null;
  county_keywords: string | null;
  utility_keywords: string | null;
  private_property_keywords: string | null;
  school_keywords: string | null;
  transit_keywords: string | null;
  parks_keywords: string | null;
  district_boundary_name: string | null;
  district_boundary_geojson: string | null;
  municipality_boundary_name: string | null;
  municipality_boundary_geojson: string | null;
  county_commission_districts_name: string | null;
  county_commission_districts_geojson: string | null;
  updated_at: string | null;
};

type AnalyticsViewRow = {
  id: string;
  name: string;
  preset: string;
  date_from: string | null;
  date_to: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateIssueReportInput = {
  category: string;
  description: string;
  addressText: string;
  latitude?: number | null;
  longitude?: number | null;
  locationSource?: "device" | "census_geocoder" | "none";
  geocodingStatus?: "captured" | "matched" | "failed" | "not_attempted";
  geocodedAddress?: string | null;
  geocodingProvider?: string | null;
  geocodedAt?: string | null;
  municipalityName?: string | null;
  municipalityCode?: string | null;
  municipalityLookupStatus?: "matched" | "outside_municipality" | "failed" | "not_attempted";
  municipalitySource?: string | null;
  municipalityMatchedAt?: string | null;
  parcelLookupStatus?: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  parcelFolio?: string | null;
  parcelAddress?: string | null;
  parcelOwner?: string | null;
  rightOfWayHint?: "on_parcel" | "probable_public_right_of_way" | "unclear";
  parcelMatchedAt?: string | null;
  residentName?: string;
  residentEmail: string;
  residentPhone?: string;
  preferredLanguage?: string;
  contactConsent: boolean;
  newsletterOptIn?: boolean;
  createdAt?: string;
  initialStatus?: IssueStatus;
};

function nowIso() {
  return new Date().toISOString();
}

function parseKeywordList(value: string | null | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function splitLegacyStaffRoleLabel(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { title: null, focusAreas: null };
  }

  const parts = raw.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      title: parts[0] || null,
      focusAreas: parts.slice(1).join(" | ") || null,
    };
  }

  return {
    title: raw,
    focusAreas: null,
  };
}

export function formatStaffMemberLabel(staffMember: Pick<StaffMember, "name" | "title" | "focusAreas">) {
  if (staffMember.title && staffMember.focusAreas) {
    return `${staffMember.name} (${staffMember.title}; ${staffMember.focusAreas})`;
  }

  if (staffMember.title) {
    return `${staffMember.name} (${staffMember.title})`;
  }

  return staffMember.name;
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
  if (!hasColumn(database, "routing_rules", "municipality_name")) {
    database.exec(`
      alter table routing_rules rename to routing_rules_legacy;

      create table routing_rules (
        id text primary key,
        category text not null,
        municipality_name text,
        agency_id text references agencies(id) on delete set null,
        owner_label text not null,
        staff_guidance text not null,
        resident_explanation text not null,
        escalation_notes text not null,
        created_at text not null,
        updated_at text not null
      );

      insert into routing_rules (
        id, category, municipality_name, agency_id, owner_label, staff_guidance,
        resident_explanation, escalation_notes, created_at, updated_at
      )
      select
        id, category, null, agency_id, owner_label, staff_guidance,
        resident_explanation, escalation_notes, created_at, updated_at
      from routing_rules_legacy;

      drop table routing_rules_legacy;

      create index if not exists idx_routing_rules_category on routing_rules(category);
      create unique index if not exists idx_routing_rules_category_municipality
        on routing_rules(category, ifnull(municipality_name, ''));
    `);
  }

  if (!hasColumn(database, "issue_reports", "newsletter_opt_in")) {
    database.exec("alter table issue_reports add column newsletter_opt_in integer not null default 0;");
  }

  database.exec(`
    create table if not exists staff_members (
      id text primary key,
      name text not null unique,
      email text,
      title text,
      focus_areas text,
      role_label text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_staff_members_name on staff_members(name);
  `);

  if (!hasColumn(database, "staff_members", "title")) {
    database.exec("alter table staff_members add column title text;");
  }

  if (!hasColumn(database, "staff_members", "focus_areas")) {
    database.exec("alter table staff_members add column focus_areas text;");
  }

  database.exec(`
    update staff_members
    set
      title = trim(case
        when title is not null and trim(title) <> '' then title
        when role_label is not null and instr(role_label, '|') > 0 then substr(role_label, 1, instr(role_label, '|') - 1)
        else role_label
      end),
      focus_areas = trim(case
        when focus_areas is not null and trim(focus_areas) <> '' then focus_areas
        when role_label is not null and instr(role_label, '|') > 0 then substr(role_label, instr(role_label, '|') + 1)
        else null
      end)
    where
      (title is null or trim(title) = '')
      or (focus_areas is null and role_label is not null and instr(role_label, '|') > 0);
  `);

  if (!hasColumn(database, "issue_reports", "assigned_staff_id")) {
    database.exec("alter table issue_reports add column assigned_staff_id text references staff_members(id) on delete set null;");
  }

  if (!hasColumn(database, "issue_reports", "assigned_at")) {
    database.exec("alter table issue_reports add column assigned_at text;");
    database.exec(`
      update issue_reports
      set assigned_at = updated_at
      where assigned_staff_id is not null and assigned_at is null;
    `);
  }

  if (!hasColumn(database, "issue_reports", "newsletter_opt_in_at")) {
    database.exec("alter table issue_reports add column newsletter_opt_in_at text;");
  }

  if (!hasColumn(database, "issue_reports", "latitude")) {
    database.exec("alter table issue_reports add column latitude real;");
  }

  if (!hasColumn(database, "issue_reports", "longitude")) {
    database.exec("alter table issue_reports add column longitude real;");
  }

  if (!hasColumn(database, "issue_reports", "location_source")) {
    database.exec("alter table issue_reports add column location_source text not null default 'none';");
  }

  if (!hasColumn(database, "issue_reports", "geocoding_status")) {
    database.exec("alter table issue_reports add column geocoding_status text not null default 'not_attempted';");
  }

  if (!hasColumn(database, "issue_reports", "geocoded_address")) {
    database.exec("alter table issue_reports add column geocoded_address text;");
  }

  if (!hasColumn(database, "issue_reports", "geocoding_provider")) {
    database.exec("alter table issue_reports add column geocoding_provider text;");
  }

  if (!hasColumn(database, "issue_reports", "geocoded_at")) {
    database.exec("alter table issue_reports add column geocoded_at text;");
  }

  if (!hasColumn(database, "issue_reports", "municipality_name")) {
    database.exec("alter table issue_reports add column municipality_name text;");
  }

  if (!hasColumn(database, "issue_reports", "municipality_code")) {
    database.exec("alter table issue_reports add column municipality_code text;");
  }

  if (!hasColumn(database, "issue_reports", "municipality_lookup_status")) {
    database.exec("alter table issue_reports add column municipality_lookup_status text not null default 'not_attempted';");
  }

  if (!hasColumn(database, "issue_reports", "municipality_source")) {
    database.exec("alter table issue_reports add column municipality_source text;");
  }

  if (!hasColumn(database, "issue_reports", "municipality_matched_at")) {
    database.exec("alter table issue_reports add column municipality_matched_at text;");
  }

  if (!hasColumn(database, "issue_reports", "parcel_lookup_status")) {
    database.exec("alter table issue_reports add column parcel_lookup_status text not null default 'not_attempted';");
  }

  if (!hasColumn(database, "issue_reports", "parcel_folio")) {
    database.exec("alter table issue_reports add column parcel_folio text;");
  }

  if (!hasColumn(database, "issue_reports", "parcel_address")) {
    database.exec("alter table issue_reports add column parcel_address text;");
  }

  if (!hasColumn(database, "issue_reports", "parcel_owner")) {
    database.exec("alter table issue_reports add column parcel_owner text;");
  }

  if (!hasColumn(database, "issue_reports", "right_of_way_hint")) {
    database.exec("alter table issue_reports add column right_of_way_hint text not null default 'unclear';");
  }

  if (!hasColumn(database, "issue_reports", "parcel_matched_at")) {
    database.exec("alter table issue_reports add column parcel_matched_at text;");
  }

  if (!hasColumn(database, "issue_reports", "notification_review_status")) {
    database.exec("alter table issue_reports add column notification_review_status text;");
  }

  if (!hasColumn(database, "issue_reports", "notification_review_note")) {
    database.exec("alter table issue_reports add column notification_review_note text;");
  }

  if (!hasColumn(database, "issue_reports", "notification_reviewed_at")) {
    database.exec("alter table issue_reports add column notification_reviewed_at text;");
  }

  if (!hasColumn(database, "issue_reports", "duplicate_of_report_id")) {
    database.exec("alter table issue_reports add column duplicate_of_report_id text references issue_reports(id) on delete set null;");
  }

  if (!hasColumn(database, "issue_reports", "duplicate_review_decision")) {
    database.exec("alter table issue_reports add column duplicate_review_decision text;");
  }

  if (!hasColumn(database, "issue_reports", "duplicate_reviewed_at")) {
    database.exec("alter table issue_reports add column duplicate_reviewed_at text;");
  }

  if (!hasColumn(database, "issue_reports", "duplicate_review_note")) {
    database.exec("alter table issue_reports add column duplicate_review_note text;");
  }

  if (!hasColumn(database, "referrals", "agency_id")) {
    database.exec("alter table referrals add column agency_id text;");
  }

  if (!hasColumn(database, "referrals", "outcome_status")) {
    database.exec("alter table referrals add column outcome_status text not null default 'sent';");
  }

  if (!hasColumn(database, "referrals", "outcome_note")) {
    database.exec("alter table referrals add column outcome_note text;");
  }

  if (!hasColumn(database, "referrals", "updated_at")) {
    database.exec("alter table referrals add column updated_at text;");
    database.exec("update referrals set updated_at = created_at where updated_at is null;");
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

  if (!hasColumn(database, "ai_suggestions", "feedback_disposition")) {
    database.exec("alter table ai_suggestions add column feedback_disposition text;");
  }

  if (!hasColumn(database, "ai_suggestions", "feedback_note")) {
    database.exec("alter table ai_suggestions add column feedback_note text;");
  }

  if (!hasColumn(database, "ai_suggestions", "feedback_created_at")) {
    database.exec("alter table ai_suggestions add column feedback_created_at text;");
  }

  if (!hasColumn(database, "notification_events", "template_key")) {
    database.exec("alter table notification_events add column template_key text;");
  }

  if (!hasColumn(database, "notification_events", "template_updated_at")) {
    database.exec("alter table notification_events add column template_updated_at text;");
  }

  database.exec(`
    create table if not exists assignment_acknowledgments (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      staff_member_id text not null references staff_members(id) on delete cascade,
      created_at text not null
    );

    create index if not exists idx_assignment_ack_lookup
      on assignment_acknowledgments(report_id, staff_member_id, created_at);
  `);

  if (!hasColumn(database, "jurisdiction_settings", "state_keywords")) {
    database.exec("alter table jurisdiction_settings add column state_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "county_keywords")) {
    database.exec("alter table jurisdiction_settings add column county_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "utility_keywords")) {
    database.exec("alter table jurisdiction_settings add column utility_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "private_property_keywords")) {
    database.exec("alter table jurisdiction_settings add column private_property_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "school_keywords")) {
    database.exec("alter table jurisdiction_settings add column school_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "transit_keywords")) {
    database.exec("alter table jurisdiction_settings add column transit_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "parks_keywords")) {
    database.exec("alter table jurisdiction_settings add column parks_keywords text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "district_boundary_name")) {
    database.exec("alter table jurisdiction_settings add column district_boundary_name text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "district_boundary_geojson")) {
    database.exec("alter table jurisdiction_settings add column district_boundary_geojson text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "municipality_boundary_name")) {
    database.exec("alter table jurisdiction_settings add column municipality_boundary_name text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "municipality_boundary_geojson")) {
    database.exec("alter table jurisdiction_settings add column municipality_boundary_geojson text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "county_commission_districts_name")) {
    database.exec("alter table jurisdiction_settings add column county_commission_districts_name text;");
  }

  if (!hasColumn(database, "jurisdiction_settings", "county_commission_districts_geojson")) {
    database.exec("alter table jurisdiction_settings add column county_commission_districts_geojson text;");
  }

  database.exec("create unique index if not exists idx_routing_rules_category_municipality on routing_rules(category, ifnull(municipality_name, ''));");

  database.exec(`
    create table if not exists submission_rate_limits (
      id text primary key,
      key_type text not null,
      key_value text not null,
      created_at text not null
    );
    create index if not exists idx_submission_rate_limits_lookup
      on submission_rate_limits(key_type, key_value, created_at);
  `);
}

function seedRoutingData(database: Database.Database) {
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
  const findAgency = database.prepare("select id from agencies where name = ?");
  const now = nowIso();
  const uniqueNames = Array.from(
    new Set(ROUTING_RULES.map((rule) => rule.likelyResponsibleParty)),
  );

  for (const name of uniqueNames) {
    const existing = findAgency.get(name) as { id: string } | undefined;
    if (existing) continue;

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

  const agencies = database
    .prepare("select id, name from agencies")
    .all() as { id: string; name: string }[];
  const agencyMap = new Map(agencies.map((agency) => [agency.name, agency.id]));
  const findGenericRule = database.prepare(
    "select id from routing_rules where category = ? and municipality_name is null",
  );
  const insertRule = database.prepare(`
    insert into routing_rules (
      id, category, agency_id, owner_label, staff_guidance,
      resident_explanation, escalation_notes, created_at, updated_at
    ) values (
      @id, @category, @agencyId, @ownerLabel, @staffGuidance,
      @residentExplanation, @escalationNotes, @createdAt, @updatedAt
    )
  `);

  for (const rule of ROUTING_RULES) {
    const existing = findGenericRule.get(rule.category) as { id: string } | undefined;
    if (existing) continue;

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

function seedJurisdictionSettings(database: Database.Database) {
  const row = database
    .prepare("select id from jurisdiction_settings where id = 1")
    .get() as { id: number } | undefined;

  if (!row) {
    database
      .prepare(
        `insert into jurisdiction_settings (
          id, district_match_keywords, district_outside_keywords, state_keywords,
          county_keywords, utility_keywords, private_property_keywords,
          school_keywords, transit_keywords, parks_keywords,
          district_boundary_name, district_boundary_geojson,
          municipality_boundary_name, municipality_boundary_geojson,
          county_commission_districts_name, county_commission_districts_geojson,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        1,
        process.env.DISTRICT_7_MATCH_KEYWORDS ?? "",
        process.env.DISTRICT_7_OUTSIDE_KEYWORDS ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        nowIso(),
      );
  }

  const existing = database
    .prepare(
      `select
        district_boundary_name,
        district_boundary_geojson,
        municipality_boundary_name,
        municipality_boundary_geojson,
        county_commission_districts_name,
        county_commission_districts_geojson
      from jurisdiction_settings where id = 1`,
    )
    .get() as {
    district_boundary_name: string | null;
    district_boundary_geojson: string | null;
    municipality_boundary_name: string | null;
    municipality_boundary_geojson: string | null;
    county_commission_districts_name: string | null;
    county_commission_districts_geojson: string | null;
  };

  if (
    existing?.district_boundary_geojson &&
    existing?.municipality_boundary_geojson &&
    existing?.county_commission_districts_geojson
  ) {
    return;
  }

  database
    .prepare(
      `update jurisdiction_settings
       set
         district_boundary_name = coalesce(nullif(district_boundary_name, ''), ?),
         district_boundary_geojson = coalesce(nullif(district_boundary_geojson, ''), ?),
         municipality_boundary_name = coalesce(nullif(municipality_boundary_name, ''), ?),
         municipality_boundary_geojson = coalesce(nullif(municipality_boundary_geojson, ''), ?),
         county_commission_districts_name = coalesce(nullif(county_commission_districts_name, ''), ?),
         county_commission_districts_geojson = coalesce(nullif(county_commission_districts_geojson, ''), ?),
         updated_at = ?
       where id = 1`,
    )
    .run(
      DEMO_JURISDICTION_SEED.districtBoundaryName,
      DEMO_JURISDICTION_SEED.districtBoundaryGeoJson,
      DEMO_JURISDICTION_SEED.municipalityBoundaryName,
      DEMO_JURISDICTION_SEED.municipalityBoundaryGeoJson,
      DEMO_JURISDICTION_SEED.countyCommissionDistrictsName,
      DEMO_JURISDICTION_SEED.countyCommissionDistrictsGeoJson,
      nowIso(),
    );
}

function seedNotificationTemplates(database: Database.Database) {
  const upsertTemplate = database.prepare(
    `insert into notification_templates (
      key, label, subject_template, body_template, updated_at
    ) values (?, ?, ?, ?, ?)
    on conflict(key) do update set
      label = excluded.label,
      subject_template = coalesce(notification_templates.subject_template, excluded.subject_template),
      body_template = coalesce(notification_templates.body_template, excluded.body_template)`,
  );

  for (const template of NOTIFICATION_TEMPLATE_DEFINITIONS) {
    upsertTemplate.run(
      template.key,
      template.label,
      template.subjectTemplate,
      template.bodyTemplate,
      nowIso(),
    );
  }
}

function applyStaffRosterAdditions(database: Database.Database) {
  const insertStaffMember = database.prepare(`
    insert into staff_members (
      id, name, email, title, focus_areas, role_label, is_active, created_at, updated_at
    )
    select
      @id, @name, null, null, null, null, 1, @createdAt, @updatedAt
    where not exists (
      select 1
      from staff_members
      where id = @id or lower(name) = lower(@name)
    )
  `);

  for (const staffMember of STAFF_ROSTER_ADDITIONS) {
    insertStaffMember.run({
      ...staffMember,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

function seedDemoData(database: Database.Database) {
  if (!isDemoMode()) return;

  const staffCount = (
    database.prepare("select count(*) as count from staff_members").get() as {
      count: number;
    }
  ).count;

  if (staffCount === 0) {
    const insertStaffMember = database.prepare(`
      insert into staff_members (
        id, name, email, title, focus_areas, role_label, is_active, created_at, updated_at
      ) values (
        @id, @name, @email, @title, @focusAreas, @roleLabel, 1, @createdAt, @updatedAt
      )
    `);

    for (const staffMember of DEMO_STAFF_MEMBERS) {
      const roleLabel = [staffMember.title, staffMember.focusAreas]
        .filter(Boolean)
        .join(" | ");

      insertStaffMember.run({
        ...staffMember,
        roleLabel: roleLabel || null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  const reportCount = (
    database.prepare("select count(*) as count from issue_reports").get() as {
      count: number;
    }
  ).count;

  if (reportCount > 0) return;

  const insertReport = database.prepare(`
    insert into issue_reports (
      id, public_tracking_token, status, assigned_staff_id, assigned_at, category, description, address_text,
      latitude, longitude, location_source, geocoding_status, geocoded_address,
      geocoding_provider, geocoded_at, municipality_name, municipality_code,
      municipality_lookup_status, municipality_source, municipality_matched_at,
      parcel_lookup_status, parcel_folio, parcel_address, parcel_owner, right_of_way_hint,
      parcel_matched_at, resident_name, resident_email, resident_phone, preferred_language,
      contact_consent, newsletter_opt_in, newsletter_opt_in_at, notification_review_status,
      notification_review_note, notification_reviewed_at, duplicate_of_report_id,
      duplicate_review_decision, duplicate_reviewed_at, duplicate_review_note, created_at, updated_at
    ) values (
      @id, @publicTrackingToken, @status, @assignedStaffId, @assignedAt, @category, @description, @addressText,
      @latitude, @longitude, @locationSource, @geocodingStatus, @geocodedAddress,
      @geocodingProvider, @geocodedAt, @municipalityName, @municipalityCode,
      @municipalityLookupStatus, @municipalitySource, @municipalityMatchedAt,
      @parcelLookupStatus, @parcelFolio, @parcelAddress, @parcelOwner, @rightOfWayHint,
      @parcelMatchedAt, @residentName, @residentEmail, @residentPhone, @preferredLanguage,
      @contactConsent, @newsletterOptIn, @newsletterOptInAt, @notificationReviewStatus,
      @notificationReviewNote, @notificationReviewedAt, null,
      null, null, null, @createdAt, @updatedAt
    )
  `);

  const insertStatusEvent = database.prepare(`
    insert into issue_status_events (
      id, report_id, status, public_note, created_at
    ) values (
      @id, @reportId, @status, @publicNote, @createdAt
    )
  `);

  const insertStaffNote = database.prepare(`
    insert into staff_notes (
      id, report_id, body, created_at
    ) values (
      @id, @reportId, @body, @createdAt
    )
  `);

  const insertReferral = database.prepare(`
    insert into referrals (
      id, report_id, agency_name, referral_method, outcome_status, external_reference,
      follow_up_date, notes, outcome_note, updated_at, created_at
    ) values (
      @id, @reportId, @agencyName, @referralMethod, @outcomeStatus, @externalReference,
      @followUpDate, @notes, @outcomeNote, @updatedAt, @createdAt
    )
  `);

  const insertNotificationEvent = database.prepare(`
    insert into notification_events (
      id, report_id, event_type, template_key, template_updated_at, recipient, subject, body, delivery_status, created_at
    ) values (
      @id, @reportId, @eventType, @templateKey, @templateUpdatedAt, @recipient, @subject, @body, @deliveryStatus, @createdAt
    )
  `);

  const templateUpdatedAt = nowIso();

  for (const report of DEMO_REPORTS) {
    insertReport.run({
      ...report,
      contactConsent: report.contactConsent ? 1 : 0,
      newsletterOptIn: report.newsletterOptIn ? 1 : 0,
    });
  }

  for (const event of DEMO_STATUS_EVENTS) {
    insertStatusEvent.run(event);
  }

  for (const note of DEMO_NOTES) {
    insertStaffNote.run(note);
  }

  for (const referral of DEMO_REFERRALS) {
    insertReferral.run(referral);
  }

  for (const event of DEMO_NOTIFICATION_EVENTS) {
    insertNotificationEvent.run({
      ...event,
      templateUpdatedAt: event.templateKey ? templateUpdatedAt : null,
    });
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
      assigned_staff_id text references staff_members(id) on delete set null,
      assigned_at text,
      category text not null,
      description text not null,
      address_text text not null,
      latitude real,
      longitude real,
      location_source text not null default 'none',
      geocoding_status text not null default 'not_attempted',
      geocoded_address text,
      geocoding_provider text,
      geocoded_at text,
      municipality_name text,
      municipality_code text,
      municipality_lookup_status text not null default 'not_attempted',
      municipality_source text,
      municipality_matched_at text,
      parcel_lookup_status text not null default 'not_attempted',
      parcel_folio text,
      parcel_address text,
      parcel_owner text,
      right_of_way_hint text not null default 'unclear',
      parcel_matched_at text,
      resident_name text,
      resident_email text not null,
      resident_phone text,
      preferred_language text not null default 'English',
      contact_consent integer not null default 1,
      newsletter_opt_in integer not null default 0,
      newsletter_opt_in_at text,
      notification_review_status text,
      notification_review_note text,
      notification_reviewed_at text,
      duplicate_of_report_id text references issue_reports(id) on delete set null,
      duplicate_review_decision text,
      duplicate_reviewed_at text,
      duplicate_review_note text,
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

    create table if not exists assignment_acknowledgments (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      staff_member_id text not null references staff_members(id) on delete cascade,
      created_at text not null
    );

    create table if not exists issue_audit_events (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      event_type text not null,
      field_name text not null,
      field_label text not null,
      old_value text,
      new_value text,
      actor_label text not null,
      created_at text not null
    );

    create table if not exists staff_members (
      id text primary key,
      name text not null unique,
      email text,
      title text,
      focus_areas text,
      role_label text,
      is_active integer not null default 1,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists referrals (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      agency_name text not null,
      referral_method text not null,
      outcome_status text not null default 'sent',
      external_reference text,
      follow_up_date text,
      notes text,
      outcome_note text,
      updated_at text not null,
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
      feedback_disposition text,
      feedback_note text,
      feedback_created_at text,
      created_at text not null
    );

    create table if not exists notification_events (
      id text primary key,
      report_id text not null references issue_reports(id) on delete cascade,
      event_type text not null,
      template_key text,
      template_updated_at text,
      recipient text,
      subject text not null,
      body text not null,
      delivery_status text not null default 'local_stub',
      created_at text not null
    );

    create table if not exists notification_templates (
      key text primary key,
      label text not null,
      subject_template text not null,
      body_template text not null,
      updated_at text not null
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
      category text not null,
      municipality_name text,
      agency_id text references agencies(id) on delete set null,
      owner_label text not null,
      staff_guidance text not null,
      resident_explanation text not null,
      escalation_notes text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists jurisdiction_settings (
      id integer primary key,
      district_match_keywords text,
      district_outside_keywords text,
      state_keywords text,
      county_keywords text,
      utility_keywords text,
      private_property_keywords text,
      school_keywords text,
      transit_keywords text,
      parks_keywords text,
      district_boundary_name text,
      district_boundary_geojson text,
      municipality_boundary_name text,
      municipality_boundary_geojson text,
      county_commission_districts_name text,
      county_commission_districts_geojson text,
      updated_at text
    );

    create table if not exists analytics_views (
      id text primary key,
      name text not null unique,
      preset text not null,
      date_from text,
      date_to text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists submission_rate_limits (
      id text primary key,
      key_type text not null,
      key_value text not null,
      created_at text not null
    );

    create index if not exists idx_issue_reports_status on issue_reports(status);
    create index if not exists idx_issue_reports_created_at on issue_reports(created_at);
    create index if not exists idx_issue_reports_duplicate_master on issue_reports(duplicate_of_report_id);
    create index if not exists idx_issue_reports_assigned_staff on issue_reports(assigned_staff_id);
    create index if not exists idx_status_events_report on issue_status_events(report_id);
    create index if not exists idx_staff_notes_report on staff_notes(report_id);
    create index if not exists idx_assignment_ack_lookup
      on assignment_acknowledgments(report_id, staff_member_id, created_at);
    create index if not exists idx_audit_events_report on issue_audit_events(report_id, created_at);
    create index if not exists idx_referrals_report on referrals(report_id);
    create index if not exists idx_attachments_report on issue_attachments(report_id);
    create index if not exists idx_notification_events_report on notification_events(report_id);
    create index if not exists idx_routing_rules_category on routing_rules(category);
    create unique index if not exists idx_routing_rules_category_municipality
      on routing_rules(category, ifnull(municipality_name, ''));
    create index if not exists idx_ai_suggestions_report on ai_suggestions(report_id);
    create index if not exists idx_analytics_views_name on analytics_views(name);
    create index if not exists idx_submission_rate_limits_lookup
      on submission_rate_limits(key_type, key_value, created_at);
  `);

  ensureSchemaMigrations(db);
  seedRoutingData(db);
  seedJurisdictionSettings(db);
  seedNotificationTemplates(db);
  applyStaffRosterAdditions(db);
  seedDemoData(db);

  return db;
}

export function getIssuesDatabase() {
  return getDb();
}

function mapReport(row: IssueReportRow): IssueReport {
  return {
    id: row.id,
    publicTrackingToken: row.public_tracking_token,
    status: row.status,
    assignedStaffId: row.assigned_staff_id,
    assignedAt: row.assigned_at,
    category: row.category,
    description: row.description,
    addressText: row.address_text,
    latitude: row.latitude,
    longitude: row.longitude,
    locationSource: row.location_source,
    geocodingStatus: row.geocoding_status,
    geocodedAddress: row.geocoded_address,
    geocodingProvider: row.geocoding_provider,
    geocodedAt: row.geocoded_at,
    municipalityName: row.municipality_name,
    municipalityCode: row.municipality_code,
    municipalityLookupStatus: row.municipality_lookup_status,
    municipalitySource: row.municipality_source,
    municipalityMatchedAt: row.municipality_matched_at,
    parcelLookupStatus: row.parcel_lookup_status,
    parcelFolio: row.parcel_folio,
    parcelAddress: row.parcel_address,
    parcelOwner: row.parcel_owner,
    rightOfWayHint: row.right_of_way_hint,
    parcelMatchedAt: row.parcel_matched_at,
    residentName: row.resident_name,
    residentEmail: row.resident_email,
    residentPhone: row.resident_phone,
    preferredLanguage: row.preferred_language,
    contactConsent: row.contact_consent === 1,
    newsletterOptIn: row.newsletter_opt_in === 1,
    newsletterOptInAt: row.newsletter_opt_in_at,
    notificationReviewStatus: row.notification_review_status,
    notificationReviewNote: row.notification_review_note,
    notificationReviewedAt: row.notification_reviewed_at,
    duplicateOfReportId: row.duplicate_of_report_id,
    duplicateReviewDecision: row.duplicate_review_decision,
    duplicateReviewedAt: row.duplicate_reviewed_at,
    duplicateReviewNote: row.duplicate_review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnalyticsView(row: AnalyticsViewRow): AnalyticsView {
  return {
    id: row.id,
    name: row.name,
    preset: row.preset,
    dateFrom: row.date_from,
    dateTo: row.date_to,
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

function mapIssueAuditEvent(row: IssueAuditEventRow): IssueAuditEvent {
  return {
    id: row.id,
    reportId: row.report_id,
    eventType: row.event_type,
    fieldName: row.field_name,
    fieldLabel: row.field_label,
    oldValue: row.old_value,
    newValue: row.new_value,
    actorLabel: row.actor_label,
    createdAt: row.created_at,
  };
}

function mapStaffMember(row: StaffMemberRow): StaffMember {
  const legacyParts = splitLegacyStaffRoleLabel(row.role_label);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    title: row.title ?? legacyParts.title,
    focusAreas: row.focus_areas ?? legacyParts.focusAreas,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignmentAcknowledgment(
  row: AssignmentAcknowledgmentRow,
): AssignmentAcknowledgment {
  return {
    id: row.id,
    reportId: row.report_id,
    staffMemberId: row.staff_member_id,
    createdAt: row.created_at,
  };
}

function mapReferral(row: ReferralRow): Referral {
  return {
    id: row.id,
    reportId: row.report_id,
    agencyName: row.agency_name,
    referralMethod: row.referral_method,
    outcomeStatus: row.outcome_status,
    externalReference: row.external_reference,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    outcomeNote: row.outcome_note,
    updatedAt: row.updated_at,
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
    templateKey: row.template_key,
    templateUpdatedAt: row.template_updated_at,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    deliveryStatus: row.delivery_status,
    createdAt: row.created_at,
  };
}

function mapNotificationTemplate(row: NotificationTemplateRow): NotificationTemplate {
  return {
    key: row.key,
    label: row.label,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    updatedAt: row.updated_at,
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
    feedbackDisposition: row.feedback_disposition,
    feedbackNote: row.feedback_note,
    feedbackCreatedAt: row.feedback_created_at,
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
    municipalityName: row.municipality_name,
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
  const createdAt = input.createdAt ?? nowIso();
  const initialStatus = input.initialStatus ?? "received";
  const token = makeTrackingToken();
  const initialPublicNote =
    initialStatus === "received"
      ? "Your report was received and is waiting for staff review."
      : `Your report status is ${formatStatus(initialStatus)}.`;

  const insertReport = database.prepare(`
    insert into issue_reports (
    id, public_tracking_token, status, assigned_staff_id, assigned_at, category, description, address_text,
      latitude, longitude, location_source, geocoding_status, geocoded_address,
      geocoding_provider, geocoded_at, municipality_name, municipality_code,
      municipality_lookup_status, municipality_source, municipality_matched_at,
      parcel_lookup_status, parcel_folio, parcel_address, parcel_owner, right_of_way_hint,
      parcel_matched_at, resident_name, resident_email, resident_phone, preferred_language,
      contact_consent, newsletter_opt_in, newsletter_opt_in_at,
      notification_review_status, notification_review_note, notification_reviewed_at,
      duplicate_of_report_id, duplicate_review_decision, duplicate_reviewed_at,
      duplicate_review_note, created_at, updated_at
    ) values (
      @id, @publicTrackingToken, @status, null, null, @category, @description, @addressText,
      @latitude, @longitude, @locationSource, @geocodingStatus, @geocodedAddress,
      @geocodingProvider, @geocodedAt, @municipalityName, @municipalityCode,
      @municipalityLookupStatus, @municipalitySource, @municipalityMatchedAt,
      @parcelLookupStatus, @parcelFolio, @parcelAddress, @parcelOwner, @rightOfWayHint,
      @parcelMatchedAt, @residentName, @residentEmail, @residentPhone, @preferredLanguage,
      @contactConsent, @newsletterOptIn, @newsletterOptInAt, null, null, null,
      null, null, null, null, @createdAt, @updatedAt
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
      status: initialStatus,
      category: input.category,
      description: input.description,
      addressText: input.addressText,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationSource: input.locationSource ?? "none",
      geocodingStatus: input.geocodingStatus ?? "not_attempted",
      geocodedAddress: input.geocodedAddress ?? null,
      geocodingProvider: input.geocodingProvider ?? null,
      geocodedAt: input.geocodedAt ?? null,
      municipalityName: input.municipalityName ?? null,
      municipalityCode: input.municipalityCode ?? null,
      municipalityLookupStatus: input.municipalityLookupStatus ?? "not_attempted",
      municipalitySource: input.municipalitySource ?? null,
      municipalityMatchedAt: input.municipalityMatchedAt ?? null,
      parcelLookupStatus: input.parcelLookupStatus ?? "not_attempted",
      parcelFolio: input.parcelFolio ?? null,
      parcelAddress: input.parcelAddress ?? null,
      parcelOwner: input.parcelOwner ?? null,
      rightOfWayHint: input.rightOfWayHint ?? "unclear",
      parcelMatchedAt: input.parcelMatchedAt ?? null,
      residentName: input.residentName || null,
      residentEmail: input.residentEmail,
      residentPhone: input.residentPhone || null,
      preferredLanguage: input.preferredLanguage || "English",
      contactConsent: input.contactConsent ? 1 : 0,
      newsletterOptIn: input.newsletterOptIn ? 1 : 0,
      newsletterOptInAt: input.newsletterOptIn ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    });

    insertStatusEvent.run({
      id: makeId(),
      reportId: id,
      status: initialStatus,
      publicNote: initialPublicNote,
      createdAt,
    });

    insertNotificationEventTx(database, {
      reportId: id,
      eventType: "confirmation",
      templateKey: "confirmation",
      recipient: input.residentEmail,
      subject: "District 7 received your report",
      body: `${initialPublicNote} Tracking token: ${token}`,
      deliveryStatus: "local_stub",
      createdAt,
    });
  })();

  return getIssueReportById(id);
}

function getRateLimitSecret() {
  return (
    process.env.RATE_LIMIT_SECRET?.trim() ||
    process.env.STAFF_SESSION_SECRET?.trim() ||
    process.env.STAFF_PASSWORD?.trim() ||
    "district7-local"
  );
}

function hashRateLimitValue(value: string) {
  return crypto
    .createHmac("sha256", getRateLimitSecret())
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function enforceReportSubmissionRateLimit(input: {
  ipAddress: string | null;
  residentEmail: string;
  windowMinutes: number;
  maxPerIp: number;
  maxPerEmail: number;
}) {
  const database = getDb();
  const createdAt = nowIso();
  const cutoff = new Date(Date.now() - input.windowMinutes * 60 * 1000).toISOString();

  return database.transaction(() => {
    database
      .prepare("delete from submission_rate_limits where datetime(created_at) < datetime(?)")
      .run(cutoff);

    if (input.ipAddress) {
      const ipKey = hashRateLimitValue(input.ipAddress);
      const ipCount = (
        database
          .prepare(
            `select count(*) as count
             from submission_rate_limits
             where key_type = 'ip' and key_value = ?
               and datetime(created_at) >= datetime(?)`,
          )
          .get(ipKey, cutoff) as { count: number }
      ).count;

      if (ipCount >= input.maxPerIp) {
        return {
          allowed: false,
          message:
            "Too many reports came from this network in a short window. Please wait a bit and try again.",
        };
      }
    }

    const emailKey = hashRateLimitValue(input.residentEmail);
    const emailCount = (
      database
        .prepare(
          `select count(*) as count
           from submission_rate_limits
           where key_type = 'email' and key_value = ?
             and datetime(created_at) >= datetime(?)`,
        )
        .get(emailKey, cutoff) as { count: number }
    ).count;

    if (emailCount >= input.maxPerEmail) {
      return {
        allowed: false,
        message:
          "That email address has already submitted several reports recently. Please wait before sending another one.",
      };
    }

    const insertAttempt = database.prepare(
      "insert into submission_rate_limits (id, key_type, key_value, created_at) values (?, ?, ?, ?)",
    );

    if (input.ipAddress) {
      insertAttempt.run(makeId(), "ip", hashRateLimitValue(input.ipAddress), createdAt);
    }

    insertAttempt.run(makeId(), "email", emailKey, createdAt);

    return { allowed: true as const, message: null };
  })();
}

export function listIssueReports() {
  const rows = getDb()
    .prepare(
      "select * from issue_reports order by datetime(created_at) desc limit 100",
    )
    .all() as IssueReportRow[];

  return rows.map(mapReport);
}

export function listAllIssueReports() {
  const rows = getDb()
    .prepare("select * from issue_reports order by datetime(created_at) desc")
    .all() as IssueReportRow[];

  return rows.map(mapReport);
}

export function listNewsletterContacts() {
  const rows = getDb()
    .prepare(
      `select
         resident_email,
         max(resident_name) as resident_name,
         max(resident_phone) as resident_phone,
         max(preferred_language) as preferred_language,
         min(newsletter_opt_in_at) as first_opted_in_at,
         max(newsletter_opt_in_at) as last_opted_in_at,
         count(*) as report_count
       from issue_reports
       where newsletter_opt_in = 1
         and resident_email is not null
         and trim(resident_email) <> ''
       group by lower(resident_email)
       order by datetime(max(newsletter_opt_in_at)) desc`,
    )
    .all() as {
      resident_email: string;
      resident_name: string | null;
      resident_phone: string | null;
      preferred_language: string;
      first_opted_in_at: string;
      last_opted_in_at: string;
      report_count: number;
    }[];

  const latestReportByEmail = new Map(
    listIssueReports()
      .filter((report) => report.newsletterOptIn)
      .reduce((map, report) => {
        const key = report.residentEmail.toLowerCase();
        if (!map.has(key)) {
          map.set(key, report.id);
        }
        return map;
      }, new Map<string, string>()),
  );

  return rows.map(
    (row): NewsletterContact => ({
      residentEmail: row.resident_email,
      residentName: row.resident_name,
      residentPhone: row.resident_phone,
      preferredLanguage: row.preferred_language,
      firstOptedInAt: row.first_opted_in_at,
      lastOptedInAt: row.last_opted_in_at,
      latestReportId:
        latestReportByEmail.get(row.resident_email.toLowerCase()) || "",
      reportCount: row.report_count,
    }),
  );
}

export function getJurisdictionConfig(): JurisdictionConfig {
  const row = getDb()
    .prepare("select * from jurisdiction_settings where id = 1")
    .get() as JurisdictionSettingsRow | undefined;

  if (!row) {
    return {
      districtMatchKeywords: parseKeywordList(
        process.env.DISTRICT_7_MATCH_KEYWORDS ?? "",
      ),
      districtOutsideKeywords: parseKeywordList(
        process.env.DISTRICT_7_OUTSIDE_KEYWORDS ?? "",
      ),
      stateKeywords: [],
      countyKeywords: [],
      utilityKeywords: [],
      privatePropertyKeywords: [],
      schoolKeywords: [],
      transitKeywords: [],
      parksKeywords: [],
      districtBoundaryName: null,
      districtBoundaryGeoJson: null,
      municipalityBoundaryName: null,
      municipalityBoundaryGeoJson: null,
      countyCommissionDistrictsName: null,
      countyCommissionDistrictsGeoJson: null,
      updatedAt: null,
    };
  }

  return {
    districtMatchKeywords: parseKeywordList(row.district_match_keywords),
    districtOutsideKeywords: parseKeywordList(row.district_outside_keywords),
    stateKeywords: parseKeywordList(row.state_keywords),
    countyKeywords: parseKeywordList(row.county_keywords),
    utilityKeywords: parseKeywordList(row.utility_keywords),
    privatePropertyKeywords: parseKeywordList(row.private_property_keywords),
    schoolKeywords: parseKeywordList(row.school_keywords),
    transitKeywords: parseKeywordList(row.transit_keywords),
    parksKeywords: parseKeywordList(row.parks_keywords),
    districtBoundaryName: row.district_boundary_name,
    districtBoundaryGeoJson: row.district_boundary_geojson,
    municipalityBoundaryName: row.municipality_boundary_name,
    municipalityBoundaryGeoJson: row.municipality_boundary_geojson,
    countyCommissionDistrictsName: row.county_commission_districts_name,
    countyCommissionDistrictsGeoJson: row.county_commission_districts_geojson,
    updatedAt: row.updated_at,
  };
}

export function saveJurisdictionConfig(input: {
  districtMatchKeywords: string;
  districtOutsideKeywords: string;
  stateKeywords: string;
  countyKeywords: string;
  utilityKeywords: string;
  privatePropertyKeywords: string;
  schoolKeywords: string;
  transitKeywords: string;
  parksKeywords: string;
  districtBoundaryName?: string;
  districtBoundaryGeoJson?: string;
  municipalityBoundaryName?: string;
  municipalityBoundaryGeoJson?: string;
  countyCommissionDistrictsName?: string;
  countyCommissionDistrictsGeoJson?: string;
}) {
  const updatedAt = nowIso();

  getDb()
    .prepare(
      `insert into jurisdiction_settings (
        id, district_match_keywords, district_outside_keywords, state_keywords,
        county_keywords, utility_keywords, private_property_keywords,
        school_keywords, transit_keywords, parks_keywords,
        district_boundary_name, district_boundary_geojson,
        municipality_boundary_name, municipality_boundary_geojson,
        county_commission_districts_name, county_commission_districts_geojson, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        district_match_keywords = excluded.district_match_keywords,
        district_outside_keywords = excluded.district_outside_keywords,
        state_keywords = excluded.state_keywords,
        county_keywords = excluded.county_keywords,
        utility_keywords = excluded.utility_keywords,
        private_property_keywords = excluded.private_property_keywords,
        school_keywords = excluded.school_keywords,
        transit_keywords = excluded.transit_keywords,
        parks_keywords = excluded.parks_keywords,
        district_boundary_name = excluded.district_boundary_name,
        district_boundary_geojson = excluded.district_boundary_geojson,
        municipality_boundary_name = excluded.municipality_boundary_name,
        municipality_boundary_geojson = excluded.municipality_boundary_geojson,
        county_commission_districts_name = excluded.county_commission_districts_name,
        county_commission_districts_geojson = excluded.county_commission_districts_geojson,
        updated_at = excluded.updated_at`,
    )
    .run(
      1,
      input.districtMatchKeywords.trim(),
      input.districtOutsideKeywords.trim(),
      input.stateKeywords.trim(),
      input.countyKeywords.trim(),
      input.utilityKeywords.trim(),
      input.privatePropertyKeywords.trim(),
      input.schoolKeywords.trim(),
      input.transitKeywords.trim(),
      input.parksKeywords.trim(),
      input.districtBoundaryName?.trim() || null,
      input.districtBoundaryGeoJson?.trim() || null,
      input.municipalityBoundaryName?.trim() || null,
      input.municipalityBoundaryGeoJson?.trim() || null,
      input.countyCommissionDistrictsName?.trim() || null,
      input.countyCommissionDistrictsGeoJson?.trim() || null,
      updatedAt,
    );

  return getJurisdictionConfig();
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

export function listStaffMembers() {
  const rows = getDb()
    .prepare("select * from staff_members order by lower(name) asc")
    .all() as StaffMemberRow[];

  return rows.map(mapStaffMember);
}

export function getStaffMemberById(id: string) {
  const row = getDb()
    .prepare("select * from staff_members where id = ?")
    .get(id) as StaffMemberRow | undefined;

  return row ? mapStaffMember(row) : null;
}

export function upsertStaffMember(input: {
  id?: string;
  name: string;
  email?: string;
  title?: string;
  focusAreas?: string;
  isActive?: boolean;
}) {
  const database = getDb();
  const now = nowIso();
  const title = input.title?.trim() || null;
  const focusAreas = input.focusAreas?.trim() || null;
  const roleLabel = [title, focusAreas].filter(Boolean).join(" | ") || null;

  if (input.id) {
    database
      .prepare(
        `update staff_members
         set name = ?, email = ?, title = ?, focus_areas = ?, role_label = ?, is_active = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        input.name.trim(),
        input.email?.trim() || null,
        title,
        focusAreas,
        roleLabel,
        input.isActive === false ? 0 : 1,
        now,
        input.id,
      );

    return getStaffMemberById(input.id);
  }

  const id = makeId();
  database
    .prepare(
      `insert into staff_members (
        id, name, email, title, focus_areas, role_label, is_active, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      input.email?.trim() || null,
      title,
      focusAreas,
      roleLabel,
      input.isActive === false ? 0 : 1,
      now,
      now,
    );

  return getStaffMemberById(id);
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
    (a, b) => {
      const categoryDiff =
        (orderMap.get(normalizeIssueCategory(a.category)) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(normalizeIssueCategory(b.category)) ?? Number.MAX_SAFE_INTEGER);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      if (!a.municipalityName && b.municipalityName) return -1;
      if (a.municipalityName && !b.municipalityName) return 1;

      return (a.municipalityName || "").localeCompare(b.municipalityName || "");
    },
  );
  return mapped;
}

export function getManagedRoutingRule(category: string, municipalityName?: string | null) {
  const rules = listManagedRoutingRules();
  const exactCategory = category.trim();
  const normalizedCategory = normalizeIssueCategory(category);
  const normalizedMunicipality = municipalityName?.trim().toLowerCase() || null;

  if (normalizedMunicipality) {
    const exactMunicipalityMatch = rules.find(
      (rule) =>
        rule.category === exactCategory &&
        rule.municipalityName?.trim().toLowerCase() === normalizedMunicipality,
    );

    if (exactMunicipalityMatch) {
      return exactMunicipalityMatch;
    }

    const normalizedMunicipalityMatch = rules.find(
      (rule) =>
        normalizeIssueCategory(rule.category) === normalizedCategory &&
        rule.municipalityName?.trim().toLowerCase() === normalizedMunicipality,
    );

    if (normalizedMunicipalityMatch) {
      return normalizedMunicipalityMatch;
    }
  }

  return (
    rules.find(
      (rule) => rule.category === exactCategory && !rule.municipalityName,
    ) ??
    rules.find(
      (rule) =>
        normalizeIssueCategory(rule.category) === normalizedCategory &&
        !rule.municipalityName,
    ) ??
    rules.find(
      (rule) => rule.category === "Other / unsure" && !rule.municipalityName,
    ) ??
    null
  );
}

export function upsertRoutingRule(input: {
  category: string;
  municipalityName?: string;
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
  const municipalityName = input.municipalityName?.trim() || null;
  const existing = database
    .prepare(
      "select id from routing_rules where category = ? and ifnull(municipality_name, '') = ifnull(?, '')",
    )
    .get(input.category, municipalityName) as { id: string } | undefined;

  if (existing) {
    database
      .prepare(
        `update routing_rules
         set municipality_name = ?, agency_id = ?, owner_label = ?, staff_guidance = ?,
             resident_explanation = ?, escalation_notes = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        municipalityName,
        input.agencyId || null,
        ownerLabel,
        input.staffGuidance.trim(),
        input.residentExplanation.trim(),
        input.escalationNotes.trim(),
        now,
        existing.id,
      );
  } else {
    database
      .prepare(
        `insert into routing_rules (
          id, category, municipality_name, agency_id, owner_label, staff_guidance,
          resident_explanation, escalation_notes, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.category,
        municipalityName,
        input.agencyId || null,
        ownerLabel,
        input.staffGuidance.trim(),
        input.residentExplanation.trim(),
        input.escalationNotes.trim(),
        now,
        now,
      );
  }

  return getManagedRoutingRule(input.category, municipalityName);
}

export function updateIssueLocationIntelligence(input: {
  reportId: string;
  latitude?: number | null;
  longitude?: number | null;
  locationSource?: "device" | "census_geocoder" | "none";
  geocodingStatus?: "captured" | "matched" | "failed" | "not_attempted";
  geocodedAddress?: string | null;
  geocodingProvider?: string | null;
  geocodedAt?: string | null;
  municipalityName?: string | null;
  municipalityCode?: string | null;
  municipalityLookupStatus?: "matched" | "outside_municipality" | "failed" | "not_attempted";
  municipalitySource?: string | null;
  municipalityMatchedAt?: string | null;
  parcelLookupStatus?: "matched" | "probable_right_of_way" | "failed" | "not_attempted";
  parcelFolio?: string | null;
  parcelAddress?: string | null;
  parcelOwner?: string | null;
  rightOfWayHint?: "on_parcel" | "probable_public_right_of_way" | "unclear";
  parcelMatchedAt?: string | null;
}) {
  getDb()
    .prepare(
      `update issue_reports
       set latitude = ?, longitude = ?, location_source = ?, geocoding_status = ?,
           geocoded_address = ?, geocoding_provider = ?, geocoded_at = ?,
           municipality_name = ?, municipality_code = ?, municipality_lookup_status = ?,
           municipality_source = ?, municipality_matched_at = ?,
           parcel_lookup_status = ?, parcel_folio = ?, parcel_address = ?, parcel_owner = ?,
           right_of_way_hint = ?, parcel_matched_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(
      input.latitude ?? null,
      input.longitude ?? null,
      input.locationSource ?? "none",
      input.geocodingStatus ?? "not_attempted",
      input.geocodedAddress ?? null,
      input.geocodingProvider ?? null,
      input.geocodedAt ?? null,
      input.municipalityName ?? null,
      input.municipalityCode ?? null,
      input.municipalityLookupStatus ?? "not_attempted",
      input.municipalitySource ?? null,
      input.municipalityMatchedAt ?? null,
      input.parcelLookupStatus ?? "not_attempted",
      input.parcelFolio ?? null,
      input.parcelAddress ?? null,
      input.parcelOwner ?? null,
      input.rightOfWayHint ?? "unclear",
      input.parcelMatchedAt ?? null,
      nowIso(),
      input.reportId,
    );

  return getIssueReportById(input.reportId);
}

export function updateIssueDetails(input: {
  reportId: string;
  category: string;
  description: string;
  addressText: string;
  residentName?: string | null;
  residentEmail: string;
  residentPhone?: string | null;
  preferredLanguage?: string | null;
  contactConsent: boolean;
  newsletterOptIn: boolean;
}) {
  const report = getIssueReportById(input.reportId);
  if (!report) return null;

  const now = nowIso();
  const newsletterOptInAt = input.newsletterOptIn
    ? report.newsletterOptInAt || now
    : null;

  getDb()
    .prepare(
      `update issue_reports
       set category = ?, description = ?, address_text = ?,
           resident_name = ?, resident_email = ?, resident_phone = ?,
           preferred_language = ?, contact_consent = ?, newsletter_opt_in = ?,
           newsletter_opt_in_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(
      input.category,
      input.description,
      input.addressText,
      input.residentName?.trim() || null,
      input.residentEmail,
      input.residentPhone?.trim() || null,
      input.preferredLanguage?.trim() || "English",
      input.contactConsent ? 1 : 0,
      input.newsletterOptIn ? 1 : 0,
      newsletterOptInAt,
      now,
      input.reportId,
    );

  return getIssueReportById(input.reportId);
}

export function updateIssueCreatedAt(input: {
  reportId: string;
  createdAt: string;
}) {
  getDb()
    .prepare(
      `update issue_reports
       set created_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(input.createdAt, nowIso(), input.reportId);

  return getIssueReportById(input.reportId);
}

export function assignIssueReport(input: {
  reportId: string;
  staffMemberId?: string | null;
}) {
  const staffMemberId = input.staffMemberId?.trim() || null;
  const now = nowIso();
  getDb()
    .prepare(
      `update issue_reports
       set assigned_staff_id = ?, assigned_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(staffMemberId, staffMemberId ? now : null, now, input.reportId);

  return getIssueReportById(input.reportId);
}

export function getIssueReportById(id: string) {
  const row = getDb()
    .prepare("select * from issue_reports where id = ?")
    .get(id) as IssueReportRow | undefined;

  return row ? mapReport(row) : null;
}

export function listLinkedDuplicateReports(masterReportId: string) {
  const rows = getDb()
    .prepare(
      `select *
       from issue_reports
       where duplicate_of_report_id = ?
       order by datetime(updated_at) desc, datetime(created_at) desc`,
    )
    .all(masterReportId) as IssueReportRow[];

  return rows.map(mapReport);
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

export function listIssueAuditEvents(reportId: string) {
  const rows = getDb()
    .prepare(
      `select *
       from issue_audit_events
       where report_id = ?
       order by datetime(created_at) desc, id desc`,
    )
    .all(reportId) as IssueAuditEventRow[];

  return rows.map(mapIssueAuditEvent);
}

export function listAssignmentAcknowledgments(reportId: string) {
  const rows = getDb()
    .prepare(
      `select *
       from assignment_acknowledgments
       where report_id = ?
       order by datetime(created_at) desc, id desc`,
    )
    .all(reportId) as AssignmentAcknowledgmentRow[];

  return rows.map(mapAssignmentAcknowledgment);
}

export function getCurrentAssignmentAcknowledgment(report: IssueReport) {
  if (!report.assignedStaffId || !report.assignedAt) return null;

  const row = getDb()
    .prepare(
      `select *
       from assignment_acknowledgments
       where report_id = ?
         and staff_member_id = ?
         and datetime(created_at) >= datetime(?)
       order by datetime(created_at) desc, id desc
       limit 1`,
    )
    .get(
      report.id,
      report.assignedStaffId,
      report.assignedAt,
    ) as AssignmentAcknowledgmentRow | undefined;

  return row ? mapAssignmentAcknowledgment(row) : null;
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

export function listNotificationTemplates() {
  const rows = getDb()
    .prepare(
      "select * from notification_templates order by label asc",
    )
    .all() as NotificationTemplateRow[];

  return rows.map(mapNotificationTemplate);
}

export function getNotificationTemplateMap() {
  const savedTemplates = new Map(
    listNotificationTemplates().map((template) => [template.key, template]),
  );

  return new Map(
    NOTIFICATION_TEMPLATE_DEFINITIONS.map((definition) => [
      definition.key,
      savedTemplates.get(definition.key) ?? {
        key: definition.key,
        label: definition.label,
        subjectTemplate: definition.subjectTemplate,
        bodyTemplate: definition.bodyTemplate,
        updatedAt: nowIso(),
      },
    ]),
  );
}

export function listAnalyticsViews() {
  const rows = getDb()
    .prepare("select * from analytics_views order by lower(name) asc")
    .all() as AnalyticsViewRow[];

  return rows.map(mapAnalyticsView);
}

export function upsertAnalyticsView(input: {
  name: string;
  preset: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const existing = getDb()
    .prepare("select id, created_at from analytics_views where lower(name) = lower(?)")
    .get(input.name.trim()) as { id: string; created_at: string } | undefined;
  const updatedAt = nowIso();

  if (existing) {
    getDb()
      .prepare(
        `update analytics_views
         set name = ?, preset = ?, date_from = ?, date_to = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        input.name.trim(),
        input.preset.trim() || "all",
        input.dateFrom?.trim() || null,
        input.dateTo?.trim() || null,
        updatedAt,
        existing.id,
      );

    return listAnalyticsViews().find((view) => view.id === existing.id) ?? null;
  }

  const id = makeId();
  getDb()
    .prepare(
      `insert into analytics_views (
        id, name, preset, date_from, date_to, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      input.preset.trim() || "all",
      input.dateFrom?.trim() || null,
      input.dateTo?.trim() || null,
      updatedAt,
      updatedAt,
    );

  return listAnalyticsViews().find((view) => view.id === id) ?? null;
}

export function updateNotificationReview(input: {
  reportId: string;
  status: "ready" | "needs_edit" | "hold";
  note?: string;
}) {
  getDb()
    .prepare(
      `update issue_reports
       set notification_review_status = ?, notification_review_note = ?,
           notification_reviewed_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(
      input.status,
      input.note?.trim() || null,
      nowIso(),
      nowIso(),
      input.reportId,
    );

  return getIssueReportById(input.reportId);
}

export function upsertNotificationTemplate(input: {
  key: NotificationTemplateKey;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const definition = NOTIFICATION_TEMPLATE_DEFINITIONS.find(
    (template) => template.key === input.key,
  );

  if (!definition) {
    throw new Error("Unknown notification template");
  }

  const updatedAt = nowIso();
  getDb()
    .prepare(
      `insert into notification_templates (
        key, label, subject_template, body_template, updated_at
      ) values (?, ?, ?, ?, ?)
      on conflict(key) do update set
        label = excluded.label,
        subject_template = excluded.subject_template,
        body_template = excluded.body_template,
        updated_at = excluded.updated_at`,
    )
    .run(
      input.key,
      definition.label,
      input.subjectTemplate.trim(),
      input.bodyTemplate.trim(),
      updatedAt,
    );
}

function getNotificationTemplateSnapshot(
  key: NotificationTemplateKey | null | undefined,
) {
  if (!key) return null;
  return getNotificationTemplateMap().get(key) ?? null;
}

function inferStatusTemplateKey(status: IssueStatus): NotificationTemplateKey {
  switch (status) {
    case "needs_more_info":
      return "needs_more_info";
    case "routed":
      return "routed";
    case "awaiting_agency":
      return "awaiting_agency";
    case "follow_up_due":
      return "follow_up_due";
    case "resolved":
      return "resolved";
    case "closed_outside_jurisdiction":
      return "outside_jurisdiction";
    case "closed_duplicate":
      return "duplicate_linked";
    default:
      return "status_update";
  }
}

function insertNotificationEventTx(
  database: Database.Database,
  input: {
    reportId: string;
    eventType: string;
    templateKey?: NotificationTemplateKey | null;
    recipient?: string | null;
    subject: string;
    body: string;
    deliveryStatus?: string;
    createdAt?: string;
  },
) {
  const createdAt = input.createdAt ?? nowIso();
  const template = getNotificationTemplateSnapshot(input.templateKey);

  database
    .prepare(
      `insert into notification_events (
        id, report_id, event_type, template_key, template_updated_at,
        recipient, subject, body, delivery_status, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      makeId(),
      input.reportId,
      input.eventType,
      input.templateKey ?? null,
      template?.updatedAt ?? null,
      input.recipient || null,
      input.subject,
      input.body,
      input.deliveryStatus || "local_stub",
      createdAt,
    );
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

export function getAiSuggestionById(id: string) {
  const row = getDb()
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
       where ai_suggestions.id = ?`,
    )
    .get(id) as AiSuggestionRow | undefined;

  return row ? mapAiSuggestion(row) : null;
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

export function updateAiSuggestionFeedback(input: {
  suggestionId: string;
  feedbackDisposition: "accepted" | "accepted_with_edits" | "rejected";
  feedbackNote?: string;
}) {
  const feedbackCreatedAt = nowIso();

  getDb()
    .prepare(
      `update ai_suggestions
       set feedback_disposition = ?, feedback_note = ?, feedback_created_at = ?
       where id = ?`,
    )
    .run(
      input.feedbackDisposition,
      input.feedbackNote?.trim() || null,
      feedbackCreatedAt,
      input.suggestionId,
    );

  return getAiSuggestionById(input.suggestionId);
}

export function addNotificationEvent(input: {
  reportId: string;
  eventType: string;
  templateKey?: NotificationTemplateKey | null;
  recipient?: string | null;
  subject: string;
  body: string;
  deliveryStatus?: string;
}) {
  insertNotificationEventTx(getDb(), input);
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

export function markIssueAsDuplicate(input: {
  reportId: string;
  masterReportId: string;
  note?: string;
}) {
  const database = getDb();
  const updatedAt = nowIso();
  const report = getIssueReportById(input.reportId);
  const masterReport = getIssueReportById(input.masterReportId);

  if (!report) {
    throw new Error("Report not found");
  }

  if (!masterReport) {
    throw new Error("Primary case not found");
  }

  if (report.id === masterReport.id) {
    throw new Error("A case cannot be linked to itself");
  }

  const publicNote =
    "This report was linked to an existing case so staff can track follow-up in one place.";
  const reviewNote = input.note?.trim() || null;

  database.transaction(() => {
    database
      .prepare(
        `update issue_reports
         set status = ?, duplicate_of_report_id = ?, duplicate_review_decision = ?,
             duplicate_reviewed_at = ?, duplicate_review_note = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        "closed_duplicate",
        masterReport.id,
        "linked_to_master",
        updatedAt,
        reviewNote,
        updatedAt,
        report.id,
      );

    database
      .prepare(
        `insert into issue_status_events (
          id, report_id, status, public_note, created_at
        ) values (?, ?, ?, ?, ?)`,
      )
      .run(makeId(), report.id, "closed_duplicate", publicNote, updatedAt);

    insertNotificationEventTx(database, {
      reportId: report.id,
      eventType: "duplicate_linked",
      templateKey: "duplicate_linked",
      recipient: report.residentEmail,
      subject: "District 7 linked your report to an existing case",
      body: `${publicNote} Primary case: ${masterReport.category} at ${masterReport.addressText}.`,
      deliveryStatus: "local_stub",
      createdAt: updatedAt,
    });
  })();
}

export function markIssueAsDistinct(input: {
  reportId: string;
  note?: string;
}) {
  const database = getDb();
  const updatedAt = nowIso();
  const report = getIssueReportById(input.reportId);

  if (!report) {
    throw new Error("Report not found");
  }

  const nextStatus = report.status === "closed_duplicate" ? "needs_review" : report.status;
  const publicNote =
    report.status === "closed_duplicate"
      ? "Staff reviewed this report and kept it as a separate case."
      : null;
  const reviewNote = input.note?.trim() || null;

  database.transaction(() => {
    database
      .prepare(
        `update issue_reports
         set status = ?, duplicate_of_report_id = null, duplicate_review_decision = ?,
             duplicate_reviewed_at = ?, duplicate_review_note = ?, updated_at = ?
         where id = ?`,
      )
      .run(
        nextStatus,
        "kept_separate",
        updatedAt,
        reviewNote,
        updatedAt,
        report.id,
      );

    if (publicNote) {
      database
        .prepare(
          `insert into issue_status_events (
            id, report_id, status, public_note, created_at
          ) values (?, ?, ?, ?, ?)`,
        )
        .run(makeId(), report.id, nextStatus, publicNote, updatedAt);

      insertNotificationEventTx(database, {
        reportId: report.id,
        eventType: "duplicate_reopened",
        templateKey: "status_update",
        recipient: report.residentEmail,
        subject: "District 7 kept your report as a separate case",
        body: publicNote,
        deliveryStatus: "local_stub",
        createdAt: updatedAt,
      });
    }
  })();
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

    insertNotificationEventTx(database, {
      reportId: input.reportId,
      eventType: "status_update",
      templateKey: inferStatusTemplateKey(input.status),
      subject: `Report status updated to ${input.status}`,
      body: input.publicNote?.trim() || `Report status updated to ${input.status}.`,
      deliveryStatus: "local_stub",
      createdAt: updatedAt,
    });
  })();
}

export function addStaffNote(input: { reportId: string; body: string }) {
  getDb()
    .prepare(
      "insert into staff_notes (id, report_id, body, created_at) values (?, ?, ?, ?)",
    )
    .run(makeId(), input.reportId, input.body, nowIso());
}

export function acknowledgeAssignment(input: {
  reportId: string;
  staffMemberId: string;
}) {
  const report = getIssueReportById(input.reportId);
  if (!report || report.assignedStaffId !== input.staffMemberId) {
    return null;
  }

  const existing = getCurrentAssignmentAcknowledgment(report);
  if (existing) return existing;

  const id = makeId();
  const createdAt = nowIso();
  getDb()
    .prepare(
      `insert into assignment_acknowledgments (
        id, report_id, staff_member_id, created_at
      ) values (?, ?, ?, ?)`,
    )
    .run(id, input.reportId, input.staffMemberId, createdAt);

  return getCurrentAssignmentAcknowledgment(report);
}

export function addIssueAuditEvents(input: {
  reportId: string;
  actorLabel?: string;
  eventType?: string;
  changes: Array<{
    fieldName: string;
    fieldLabel: string;
    oldValue?: string | null;
    newValue?: string | null;
  }>;
}) {
  if (input.changes.length === 0) return;

  const database = getDb();
  const createdAt = nowIso();
  const statement = database.prepare(
    `insert into issue_audit_events (
      id, report_id, event_type, field_name, field_label,
      old_value, new_value, actor_label, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  database.transaction(() => {
    for (const change of input.changes) {
      statement.run(
        makeId(),
        input.reportId,
        input.eventType || "case_details_updated",
        change.fieldName,
        change.fieldLabel,
        change.oldValue ?? null,
        change.newValue ?? null,
        input.actorLabel?.trim() || "Staff",
        createdAt,
      );
    }
  })();
}

export function addReferral(input: {
  reportId: string;
  agencyId?: string;
  agencyName: string;
  referralMethod: string;
  outcomeStatus?: string;
  externalReference?: string;
  followUpDate?: string;
  notes?: string;
  outcomeNote?: string;
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
          outcome_status, external_reference, follow_up_date, notes,
          outcome_note, updated_at, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        makeId(),
        input.reportId,
        input.agencyId || null,
        input.agencyName,
        input.referralMethod,
        input.outcomeStatus?.trim() || "sent",
        input.externalReference?.trim() || null,
        input.followUpDate?.trim() || null,
        input.notes?.trim() || null,
        input.outcomeNote?.trim() || null,
        createdAt,
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

    insertNotificationEventTx(database, {
      reportId: input.reportId,
      eventType: "referral",
      templateKey: "routed",
      subject: `Report referred to ${input.agencyName}`,
      body: publicNote,
      deliveryStatus: "local_stub",
      createdAt,
    });
  })();
}

export function updateReferralOutcome(input: {
  referralId: string;
  outcomeStatus: string;
  followUpDate?: string;
  outcomeNote?: string;
  notes?: string;
}) {
  const updatedAt = nowIso();

  getDb()
    .prepare(
      `update referrals
       set outcome_status = ?, follow_up_date = ?, outcome_note = ?, notes = ?, updated_at = ?
       where id = ?`,
    )
    .run(
      input.outcomeStatus.trim(),
      input.followUpDate?.trim() || null,
      input.outcomeNote?.trim() || null,
      input.notes?.trim() || null,
      updatedAt,
      input.referralId,
    );
}
