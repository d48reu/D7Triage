import crypto from "node:crypto";
import { inferIssueCategoryFromText } from "@/lib/issue-types";
import { getIssuesDatabase } from "@/lib/issues-repository";

export type HistoricalCase = {
  id: string;
  externalItemId: string;
  sourceBoardId: string;
  sourceGroup: string;
  residentName: string;
  assignedPeople: string;
  answeredBy: string;
  occurredOn: string | null;
  rawStatus: string;
  inferredCategory: string;
  summary: string;
  addressText: string;
  phone: string;
  email: string;
  actionTaken: string;
  serviceNumber: string;
  fileLinks: string[];
  subitems: HistoricalSubitem[];
  importedAt: string;
  updatedAt: string;
};

export type HistoricalSubitem = {
  externalItemId: string;
  name: string;
  owner: string;
  rawStatus: string;
  occurredOn: string | null;
};

export type HistoricalCaseUpdate = {
  id: string;
  caseId: string;
  externalPostId: string;
  parentExternalPostId: string | null;
  contentType: string;
  authorName: string;
  createdAt: string | null;
  createdAtRaw: string;
  body: string;
  likesCount: number;
  assetIds: string[];
  importedAt: string;
};

export type HistoricalCaseAttachment = {
  id: string;
  caseId: string;
  externalAssetId: string;
  externalPostId: string | null;
  source: string;
  originalLink: string | null;
  fileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  importedAt: string;
};

export type HistoricalEvent = {
  id: string;
  sourceKey: string;
  externalItemId: string;
  sourceBoardId: string;
  sourceGroup: string;
  occurredOn: string | null;
  dateText: string;
  title: string;
  owners: string;
  collaborators: string;
  role: string;
  partners: string;
  relevantInfo: string;
  commissionerAttending: string;
  rawStatus: string;
  priority: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  durationDays: number | null;
  fileLinks: string[];
  subitems: HistoricalEventSubitem[];
  importedAt: string;
  updatedAt: string;
};

export type HistoricalEventSubitem = {
  externalItemId: string;
  name: string;
  owner: string;
  rawStatus: string;
  dueOn: string | null;
};

export type HistoricalEventUpdate = {
  id: string;
  eventId: string;
  externalPostId: string;
  parentExternalPostId: string | null;
  itemName: string;
  contentType: string;
  authorName: string;
  createdAt: string | null;
  createdAtRaw: string;
  body: string;
  likesCount: number;
  assetIds: string[];
  importedAt: string;
};

export type HistoricalEventAttachment = {
  id: string;
  eventId: string;
  externalAssetId: string;
  externalPostId: string | null;
  source: string;
  originalLink: string | null;
  fileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  importedAt: string;
};

export type HistoricalArchiveSummary = {
  caseCount: number;
  datedCaseCount: number;
  earliestCaseDate: string | null;
  latestCaseDate: string | null;
  updateCount: number;
  casesWithUpdates: number;
  attachmentCount: number;
  storedAttachmentCount: number;
  eventCount: number;
  eventUpdateCount: number;
  eventAttachmentCount: number;
  lastImportedAt: string | null;
};

export type HistoricalArchiveManifest = {
  schemaVersion: number;
  generatedAt: string;
  source: {
    system: string;
    accountId: string;
    boardId: string;
    boardName: string;
    canonicalArchiveName: string;
    supplementalArchiveName?: string;
  };
  cases: HistoricalManifestCase[];
  updates: HistoricalManifestUpdate[];
  attachmentRefs: HistoricalManifestAttachment[];
  events: HistoricalManifestEvent[];
  eventUpdates: HistoricalManifestEventUpdate[];
  eventAttachmentRefs: HistoricalManifestEventAttachment[];
};

type HistoricalManifestCase = {
  externalItemId: string;
  sourceGroup: string;
  name: string;
  assignedPeople: string;
  answeredBy: string;
  occurredOn: string | null;
  rawStatus: string;
  summary: string;
  address: string;
  phone: string;
  email: string;
  actionTaken: string;
  serviceNumber: string;
  fileLinks: string[];
  subitems: HistoricalSubitem[];
};

type HistoricalManifestUpdate = {
  externalPostId: string;
  parentExternalPostId: string | null;
  caseExternalItemId: string;
  caseName: string;
  contentType: string;
  authorName: string;
  createdAt: string | null;
  createdAtRaw: string;
  body: string;
  likesCount: number;
  assetIds: string[];
};

type HistoricalManifestAttachment = {
  caseExternalItemId: string;
  externalAssetId: string;
  externalPostId: string | null;
  source: string;
  originalLink: string | null;
};

type HistoricalManifestEvent = {
  sourceKey: string;
  externalItemId: string;
  sourceGroup: string;
  occurredOn: string | null;
  dateText: string;
  title: string;
  owners: string;
  collaborators: string;
  role: string;
  partners: string;
  relevantInfo: string;
  commissionerAttending: string;
  rawStatus: string;
  priority: string;
  timelineStart: string | null;
  timelineEnd: string | null;
  durationDays: number | null;
  fileLinks: string[];
  subitems: HistoricalEventSubitem[];
};

type HistoricalManifestEventUpdate = {
  externalPostId: string;
  parentExternalPostId: string | null;
  eventExternalItemId: string;
  itemName: string;
  contentType: string;
  authorName: string;
  createdAt: string | null;
  createdAtRaw: string;
  body: string;
  likesCount: number;
  assetIds: string[];
};

type HistoricalManifestEventAttachment = {
  eventExternalItemId: string;
  externalAssetId: string;
  externalPostId: string | null;
  source: string;
  originalLink: string | null;
};

type HistoricalCaseRow = {
  id: string;
  external_item_id: string;
  source_board_id: string;
  source_group: string;
  resident_name: string;
  assigned_people: string;
  answered_by: string;
  occurred_on: string | null;
  raw_status: string;
  inferred_category: string;
  summary: string;
  address_text: string;
  phone: string;
  email: string;
  action_taken: string;
  service_number: string;
  file_links_json: string;
  subitems_json: string;
  imported_at: string;
  updated_at: string;
};

type HistoricalUpdateRow = {
  id: string;
  case_id: string;
  external_post_id: string;
  parent_external_post_id: string | null;
  content_type: string;
  author_name: string;
  created_at: string | null;
  created_at_raw: string;
  body: string;
  likes_count: number;
  asset_ids_json: string;
  imported_at: string;
};

type HistoricalAttachmentRow = {
  id: string;
  case_id: string;
  external_asset_id: string;
  external_post_id: string | null;
  source: string;
  original_link: string | null;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  imported_at: string;
};

type HistoricalEventRow = {
  id: string;
  source_key: string;
  external_item_id: string;
  source_board_id: string;
  source_group: string;
  occurred_on: string | null;
  date_text: string;
  title: string;
  owners: string;
  collaborators: string;
  role: string;
  partners: string;
  relevant_info: string;
  commissioner_attending: string;
  raw_status: string;
  priority: string;
  timeline_start: string | null;
  timeline_end: string | null;
  duration_days: number | null;
  file_links_json: string;
  subitems_json: string;
  imported_at: string;
  updated_at: string;
};

type HistoricalEventUpdateRow = {
  id: string;
  event_id: string;
  external_post_id: string;
  parent_external_post_id: string | null;
  item_name: string;
  content_type: string;
  author_name: string;
  created_at: string | null;
  created_at_raw: string;
  body: string;
  likes_count: number;
  asset_ids_json: string;
  imported_at: string;
};

type HistoricalEventAttachmentRow = {
  id: string;
  event_id: string;
  external_asset_id: string;
  external_post_id: string | null;
  source: string;
  original_link: string | null;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  imported_at: string;
};

let archiveSchemaReady = false;

function getArchiveDb() {
  const database = getIssuesDatabase();
  if (archiveSchemaReady) return database;

  database.exec(`
    create table if not exists historical_import_batches (
      id text primary key,
      source_system text not null,
      source_account_id text not null,
      source_board_id text not null,
      source_archive_name text not null,
      manifest_generated_at text,
      case_count integer not null,
      update_count integer not null,
      attachment_count integer not null,
      event_count integer not null,
      imported_at text not null,
      updated_at text not null
    );

    create table if not exists historical_cases (
      id text primary key,
      external_item_id text not null unique,
      source_board_id text not null,
      source_group text not null,
      resident_name text not null,
      assigned_people text not null,
      answered_by text not null,
      occurred_on text,
      raw_status text not null,
      inferred_category text not null,
      summary text not null,
      address_text text not null,
      phone text not null,
      email text not null,
      action_taken text not null,
      service_number text not null,
      file_links_json text not null,
      subitems_json text not null,
      raw_json text not null,
      imported_at text not null,
      updated_at text not null
    );

    create table if not exists historical_case_updates (
      id text primary key,
      case_id text not null references historical_cases(id) on delete cascade,
      external_post_id text not null unique,
      parent_external_post_id text,
      content_type text not null,
      author_name text not null,
      created_at text,
      created_at_raw text not null,
      body text not null,
      likes_count integer not null default 0,
      asset_ids_json text not null,
      raw_json text not null,
      imported_at text not null
    );

    create table if not exists historical_case_attachments (
      id text primary key,
      case_id text not null references historical_cases(id) on delete cascade,
      external_asset_id text not null,
      external_post_id text,
      source text not null,
      original_link text,
      file_name text,
      storage_path text,
      mime_type text,
      size_bytes integer,
      imported_at text not null,
      unique(case_id, external_asset_id)
    );

    create table if not exists historical_events (
      id text primary key,
      source_key text not null unique,
      external_item_id text not null default '',
      source_board_id text not null default '',
      source_group text not null default '',
      occurred_on text,
      date_text text not null,
      title text not null,
      owners text not null default '',
      collaborators text not null default '',
      role text not null,
      partners text not null,
      relevant_info text not null,
      commissioner_attending text not null,
      raw_status text not null,
      priority text not null default '',
      timeline_start text,
      timeline_end text,
      duration_days real,
      file_links_json text not null default '[]',
      subitems_json text not null default '[]',
      raw_json text not null,
      imported_at text not null,
      updated_at text not null
    );

    create table if not exists historical_event_updates (
      id text primary key,
      event_id text not null references historical_events(id) on delete cascade,
      external_post_id text not null unique,
      parent_external_post_id text,
      item_name text not null,
      content_type text not null,
      author_name text not null,
      created_at text,
      created_at_raw text not null,
      body text not null,
      likes_count integer not null default 0,
      asset_ids_json text not null,
      raw_json text not null,
      imported_at text not null
    );

    create table if not exists historical_event_attachments (
      id text primary key,
      event_id text not null references historical_events(id) on delete cascade,
      external_asset_id text not null,
      external_post_id text,
      source text not null,
      original_link text,
      file_name text,
      storage_path text,
      mime_type text,
      size_bytes integer,
      imported_at text not null,
      unique(event_id, external_asset_id)
    );

    create index if not exists idx_historical_cases_occurred_on
      on historical_cases(occurred_on);
    create index if not exists idx_historical_cases_status
      on historical_cases(raw_status);
    create index if not exists idx_historical_cases_name
      on historical_cases(resident_name);
    create index if not exists idx_historical_updates_case
      on historical_case_updates(case_id, created_at);
    create index if not exists idx_historical_attachments_case
      on historical_case_attachments(case_id);
    create index if not exists idx_historical_attachments_asset
      on historical_case_attachments(external_asset_id);
    create index if not exists idx_historical_events_occurred_on
      on historical_events(occurred_on);
    create index if not exists idx_historical_event_updates_event
      on historical_event_updates(event_id, created_at);
    create index if not exists idx_historical_event_attachments_event
      on historical_event_attachments(event_id);
    create index if not exists idx_historical_event_attachments_asset
      on historical_event_attachments(external_asset_id);
  `);

  ensureColumn(
    database,
    "historical_import_batches",
    "event_update_count",
    "integer not null default 0",
  );
  ensureColumn(
    database,
    "historical_import_batches",
    "event_attachment_count",
    "integer not null default 0",
  );
  ensureColumn(
    database,
    "historical_events",
    "external_item_id",
    "text not null default ''",
  );
  ensureColumn(
    database,
    "historical_events",
    "source_board_id",
    "text not null default ''",
  );
  ensureColumn(
    database,
    "historical_events",
    "source_group",
    "text not null default ''",
  );
  ensureColumn(database, "historical_events", "owners", "text not null default ''");
  ensureColumn(
    database,
    "historical_events",
    "collaborators",
    "text not null default ''",
  );
  ensureColumn(database, "historical_events", "priority", "text not null default ''");
  ensureColumn(database, "historical_events", "timeline_start", "text");
  ensureColumn(database, "historical_events", "timeline_end", "text");
  ensureColumn(database, "historical_events", "duration_days", "real");
  ensureColumn(
    database,
    "historical_events",
    "file_links_json",
    "text not null default '[]'",
  );
  ensureColumn(
    database,
    "historical_events",
    "subitems_json",
    "text not null default '[]'",
  );
  database.exec(`
    create index if not exists idx_historical_events_board_item
      on historical_events(source_board_id, external_item_id);
  `);

  archiveSchemaReady = true;
  return database;
}

function ensureColumn(
  database: ReturnType<typeof getIssuesDatabase>,
  table: string,
  column: string,
  definition: string,
) {
  const columns = database.prepare(`pragma table_info(${table})`).all() as {
    name: string;
  }[];
  if (!columns.some((item) => item.name === column)) {
    database.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

export function importHistoricalArchive(input: unknown) {
  const manifest = parseHistoricalArchiveManifest(input);
  const database = getArchiveDb();
  const importedAt = new Date().toISOString();
  const batchId = `monday-${manifest.source.accountId}-${manifest.source.boardId}`;
  const priorCaseIds = new Set(
    (
      database
        .prepare("select external_item_id from historical_cases")
        .all() as { external_item_id: string }[]
    ).map((row) => row.external_item_id),
  );
  const priorPostIds = new Set(
    (
      database
        .prepare("select external_post_id from historical_case_updates")
        .all() as { external_post_id: string }[]
    ).map((row) => row.external_post_id),
  );
  const priorEventKeys = new Set(
    (
      database
        .prepare("select source_key from historical_events")
        .all() as { source_key: string }[]
    ).map((row) => row.source_key),
  );
  const priorEventPostIds = new Set(
    (
      database
        .prepare("select external_post_id from historical_event_updates")
        .all() as { external_post_id: string }[]
    ).map((row) => row.external_post_id),
  );

  const upsertCase = database.prepare(`
    insert into historical_cases (
      id, external_item_id, source_board_id, source_group, resident_name,
      assigned_people, answered_by, occurred_on, raw_status, inferred_category,
      summary, address_text, phone, email, action_taken, service_number,
      file_links_json, subitems_json, raw_json, imported_at, updated_at
    ) values (
      @id, @externalItemId, @sourceBoardId, @sourceGroup, @residentName,
      @assignedPeople, @answeredBy, @occurredOn, @rawStatus, @inferredCategory,
      @summary, @addressText, @phone, @email, @actionTaken, @serviceNumber,
      @fileLinksJson, @subitemsJson, @rawJson, @importedAt, @updatedAt
    )
    on conflict(external_item_id) do update set
      source_board_id = excluded.source_board_id,
      source_group = excluded.source_group,
      resident_name = excluded.resident_name,
      assigned_people = excluded.assigned_people,
      answered_by = excluded.answered_by,
      occurred_on = excluded.occurred_on,
      raw_status = excluded.raw_status,
      inferred_category = excluded.inferred_category,
      summary = excluded.summary,
      address_text = excluded.address_text,
      phone = excluded.phone,
      email = excluded.email,
      action_taken = excluded.action_taken,
      service_number = excluded.service_number,
      file_links_json = excluded.file_links_json,
      subitems_json = excluded.subitems_json,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `);
  const upsertUpdate = database.prepare(`
    insert into historical_case_updates (
      id, case_id, external_post_id, parent_external_post_id, content_type,
      author_name, created_at, created_at_raw, body, likes_count,
      asset_ids_json, raw_json, imported_at
    ) values (
      @id, @caseId, @externalPostId, @parentExternalPostId, @contentType,
      @authorName, @createdAt, @createdAtRaw, @body, @likesCount,
      @assetIdsJson, @rawJson, @importedAt
    )
    on conflict(external_post_id) do update set
      case_id = excluded.case_id,
      parent_external_post_id = excluded.parent_external_post_id,
      content_type = excluded.content_type,
      author_name = excluded.author_name,
      created_at = excluded.created_at,
      created_at_raw = excluded.created_at_raw,
      body = excluded.body,
      likes_count = excluded.likes_count,
      asset_ids_json = excluded.asset_ids_json,
      raw_json = excluded.raw_json
  `);
  const upsertAttachment = database.prepare(`
    insert into historical_case_attachments (
      id, case_id, external_asset_id, external_post_id, source,
      original_link, file_name, storage_path, mime_type, size_bytes, imported_at
    ) values (
      @id, @caseId, @externalAssetId, @externalPostId, @source,
      @originalLink, null, null, null, null, @importedAt
    )
    on conflict(case_id, external_asset_id) do update set
      external_post_id = excluded.external_post_id,
      source = excluded.source,
      original_link = coalesce(excluded.original_link, historical_case_attachments.original_link)
  `);
  const upsertEvent = database.prepare(`
    insert into historical_events (
      id, source_key, external_item_id, source_board_id, source_group,
      occurred_on, date_text, title, owners, collaborators, role, partners,
      relevant_info, commissioner_attending, raw_status, priority,
      timeline_start, timeline_end, duration_days, file_links_json,
      subitems_json, raw_json, imported_at, updated_at
    ) values (
      @id, @sourceKey, @externalItemId, @sourceBoardId, @sourceGroup,
      @occurredOn, @dateText, @title, @owners, @collaborators, @role, @partners,
      @relevantInfo, @commissionerAttending, @rawStatus, @priority,
      @timelineStart, @timelineEnd, @durationDays, @fileLinksJson,
      @subitemsJson, @rawJson, @importedAt, @updatedAt
    )
    on conflict(source_key) do update set
      external_item_id = excluded.external_item_id,
      source_board_id = excluded.source_board_id,
      source_group = excluded.source_group,
      occurred_on = excluded.occurred_on,
      date_text = excluded.date_text,
      title = excluded.title,
      owners = excluded.owners,
      collaborators = excluded.collaborators,
      role = excluded.role,
      partners = excluded.partners,
      relevant_info = excluded.relevant_info,
      commissioner_attending = excluded.commissioner_attending,
      raw_status = excluded.raw_status,
      priority = excluded.priority,
      timeline_start = excluded.timeline_start,
      timeline_end = excluded.timeline_end,
      duration_days = excluded.duration_days,
      file_links_json = excluded.file_links_json,
      subitems_json = excluded.subitems_json,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `);
  const upsertEventUpdate = database.prepare(`
    insert into historical_event_updates (
      id, event_id, external_post_id, parent_external_post_id, item_name,
      content_type, author_name, created_at, created_at_raw, body, likes_count,
      asset_ids_json, raw_json, imported_at
    ) values (
      @id, @eventId, @externalPostId, @parentExternalPostId, @itemName,
      @contentType, @authorName, @createdAt, @createdAtRaw, @body, @likesCount,
      @assetIdsJson, @rawJson, @importedAt
    )
    on conflict(external_post_id) do update set
      event_id = excluded.event_id,
      parent_external_post_id = excluded.parent_external_post_id,
      item_name = excluded.item_name,
      content_type = excluded.content_type,
      author_name = excluded.author_name,
      created_at = excluded.created_at,
      created_at_raw = excluded.created_at_raw,
      body = excluded.body,
      likes_count = excluded.likes_count,
      asset_ids_json = excluded.asset_ids_json,
      raw_json = excluded.raw_json
  `);
  const upsertEventAttachment = database.prepare(`
    insert into historical_event_attachments (
      id, event_id, external_asset_id, external_post_id, source,
      original_link, file_name, storage_path, mime_type, size_bytes, imported_at
    ) values (
      @id, @eventId, @externalAssetId, @externalPostId, @source,
      @originalLink, null, null, null, null, @importedAt
    )
    on conflict(event_id, external_asset_id) do update set
      external_post_id = excluded.external_post_id,
      source = excluded.source,
      original_link = coalesce(
        excluded.original_link,
        historical_event_attachments.original_link
      )
  `);
  const upsertBatch = database.prepare(`
    insert into historical_import_batches (
      id, source_system, source_account_id, source_board_id,
      source_archive_name, manifest_generated_at, case_count, update_count,
      attachment_count, event_count, event_update_count,
      event_attachment_count, imported_at, updated_at
    ) values (
      @id, @sourceSystem, @sourceAccountId, @sourceBoardId,
      @sourceArchiveName, @manifestGeneratedAt, @caseCount, @updateCount,
      @attachmentCount, @eventCount, @eventUpdateCount,
      @eventAttachmentCount, @importedAt, @updatedAt
    )
    on conflict(id) do update set
      source_archive_name = excluded.source_archive_name,
      manifest_generated_at = excluded.manifest_generated_at,
      case_count = excluded.case_count,
      update_count = excluded.update_count,
      attachment_count = excluded.attachment_count,
      event_count = excluded.event_count,
      event_update_count = excluded.event_update_count,
      event_attachment_count = excluded.event_attachment_count,
      updated_at = excluded.updated_at
  `);

  database.transaction(() => {
    for (const historicalCase of manifest.cases) {
      const inferredCategory = inferIssueCategoryFromText({
        category: "Other / unsure",
        description: historicalCase.summary,
        addressText: historicalCase.address,
      });
      upsertCase.run({
        id: historicalCaseId(historicalCase.externalItemId),
        externalItemId: historicalCase.externalItemId,
        sourceBoardId: manifest.source.boardId,
        sourceGroup: historicalCase.sourceGroup,
        residentName: historicalCase.name,
        assignedPeople: historicalCase.assignedPeople,
        answeredBy: historicalCase.answeredBy,
        occurredOn: historicalCase.occurredOn,
        rawStatus: historicalCase.rawStatus,
        inferredCategory,
        summary: historicalCase.summary,
        addressText: historicalCase.address,
        phone: historicalCase.phone,
        email: historicalCase.email,
        actionTaken: historicalCase.actionTaken,
        serviceNumber: historicalCase.serviceNumber,
        fileLinksJson: JSON.stringify(historicalCase.fileLinks),
        subitemsJson: JSON.stringify(historicalCase.subitems),
        rawJson: JSON.stringify(historicalCase),
        importedAt,
        updatedAt: importedAt,
      });
    }

    for (const update of manifest.updates) {
      upsertUpdate.run({
        id: `monday-update-${update.externalPostId}`,
        caseId: historicalCaseId(update.caseExternalItemId),
        externalPostId: update.externalPostId,
        parentExternalPostId: update.parentExternalPostId,
        contentType: update.contentType,
        authorName: update.authorName,
        createdAt: update.createdAt,
        createdAtRaw: update.createdAtRaw,
        body: update.body,
        likesCount: update.likesCount,
        assetIdsJson: JSON.stringify(update.assetIds),
        rawJson: JSON.stringify(update),
        importedAt,
      });
    }

    for (const attachment of manifest.attachmentRefs) {
      upsertAttachment.run({
        id: historicalAttachmentId(
          attachment.caseExternalItemId,
          attachment.externalAssetId,
        ),
        caseId: historicalCaseId(attachment.caseExternalItemId),
        externalAssetId: attachment.externalAssetId,
        externalPostId: attachment.externalPostId,
        source: attachment.source,
        originalLink: attachment.originalLink,
        importedAt,
      });
    }

    for (const event of manifest.events) {
      upsertEvent.run({
        id: historicalEventId(event.sourceKey),
        sourceKey: event.sourceKey,
        externalItemId: event.externalItemId,
        sourceBoardId: manifest.source.boardId,
        sourceGroup: event.sourceGroup,
        occurredOn: event.occurredOn,
        dateText: event.dateText,
        title: event.title,
        owners: event.owners,
        collaborators: event.collaborators,
        role: event.role,
        partners: event.partners,
        relevantInfo: event.relevantInfo,
        commissionerAttending: event.commissionerAttending,
        rawStatus: event.rawStatus,
        priority: event.priority,
        timelineStart: event.timelineStart,
        timelineEnd: event.timelineEnd,
        durationDays: event.durationDays,
        fileLinksJson: JSON.stringify(event.fileLinks),
        subitemsJson: JSON.stringify(event.subitems),
        rawJson: JSON.stringify(event),
        importedAt,
        updatedAt: importedAt,
      });
    }

    const eventIdByExternalItemId = new Map(
      manifest.events.map((event) => {
        const row = database
          .prepare(
            `select id
             from historical_events
             where source_board_id = ? and external_item_id = ?`,
          )
          .get(manifest.source.boardId, event.externalItemId) as
          | { id: string }
          | undefined;
        if (!row) {
          throw new Error(`Historical event ${event.externalItemId} was not stored.`);
        }
        return [event.externalItemId, row.id] as const;
      }),
    );

    for (const update of manifest.eventUpdates) {
      const eventId = eventIdByExternalItemId.get(update.eventExternalItemId);
      if (!eventId) {
        throw new Error(
          `Event update ${update.externalPostId} does not match an event.`,
        );
      }
      upsertEventUpdate.run({
        id: `monday-event-update-${update.externalPostId}`,
        eventId,
        externalPostId: update.externalPostId,
        parentExternalPostId: update.parentExternalPostId,
        itemName: update.itemName,
        contentType: update.contentType,
        authorName: update.authorName,
        createdAt: update.createdAt,
        createdAtRaw: update.createdAtRaw,
        body: update.body,
        likesCount: update.likesCount,
        assetIdsJson: JSON.stringify(update.assetIds),
        rawJson: JSON.stringify(update),
        importedAt,
      });
    }

    for (const attachment of manifest.eventAttachmentRefs) {
      const eventId = eventIdByExternalItemId.get(
        attachment.eventExternalItemId,
      );
      if (!eventId) {
        throw new Error(
          `Event file ${attachment.externalAssetId} does not match an event.`,
        );
      }
      upsertEventAttachment.run({
        id: historicalEventAttachmentId(
          attachment.eventExternalItemId,
          attachment.externalAssetId,
        ),
        eventId,
        externalAssetId: attachment.externalAssetId,
        externalPostId: attachment.externalPostId,
        source: attachment.source,
        originalLink: attachment.originalLink,
        importedAt,
      });
    }

    upsertBatch.run({
      id: batchId,
      sourceSystem: manifest.source.system,
      sourceAccountId: manifest.source.accountId,
      sourceBoardId: manifest.source.boardId,
      sourceArchiveName: manifest.source.canonicalArchiveName,
      manifestGeneratedAt: manifest.generatedAt || null,
      caseCount: manifest.cases.length,
      updateCount: manifest.updates.length,
      attachmentCount: manifest.attachmentRefs.length,
      eventCount: manifest.events.length,
      eventUpdateCount: manifest.eventUpdates.length,
      eventAttachmentCount: manifest.eventAttachmentRefs.length,
      importedAt,
      updatedAt: importedAt,
    });
  })();

  return {
    batchId,
    importedAt,
    cases: manifest.cases.length,
    newCases: manifest.cases.filter(
      (item) => !priorCaseIds.has(item.externalItemId),
    ).length,
    updates: manifest.updates.length,
    newUpdates: manifest.updates.filter(
      (item) => !priorPostIds.has(item.externalPostId),
    ).length,
    attachmentReferences: manifest.attachmentRefs.length,
    events: manifest.events.length,
    newEvents: manifest.events.filter(
      (item) => !priorEventKeys.has(item.sourceKey),
    ).length,
    eventUpdates: manifest.eventUpdates.length,
    newEventUpdates: manifest.eventUpdates.filter(
      (item) => !priorEventPostIds.has(item.externalPostId),
    ).length,
    eventAttachmentReferences: manifest.eventAttachmentRefs.length,
  };
}

export function listHistoricalCases(input: {
  query?: string;
  status?: string;
  year?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const database = getArchiveDb();
  const clauses: string[] = [];
  const parameters: Array<string | number> = [];
  const query = input.query?.trim() || "";
  const status = input.status?.trim() || "";
  const year = input.year?.trim() || "";
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);

  if (query) {
    clauses.push(`(
      resident_name like ? collate nocase
      or summary like ? collate nocase
      or address_text like ? collate nocase
      or phone like ? collate nocase
      or email like ? collate nocase
      or action_taken like ? collate nocase
      or service_number like ? collate nocase
      or external_item_id like ? collate nocase
    )`);
    const pattern = `%${query}%`;
    parameters.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
    );
  }

  if (status) {
    clauses.push("raw_status = ?");
    parameters.push(status);
  }

  if (/^\d{4}$/.test(year)) {
    clauses.push("substr(occurred_on, 1, 4) = ?");
    parameters.push(year);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const total = (
    database
      .prepare(`select count(*) as count from historical_cases ${where}`)
      .get(...parameters) as { count: number }
  ).count;
  const rows = database
    .prepare(
      `select *
       from historical_cases
       ${where}
       order by
         case when occurred_on is null then 1 else 0 end,
         occurred_on desc,
         external_item_id desc
       limit ? offset ?`,
    )
    .all(...parameters, limit, offset) as HistoricalCaseRow[];

  return {
    cases: rows.map(mapHistoricalCase),
    total,
    limit,
    offset,
  };
}

export function getHistoricalCaseById(id: string) {
  const row = getArchiveDb()
    .prepare("select * from historical_cases where id = ?")
    .get(id) as HistoricalCaseRow | undefined;
  return row ? mapHistoricalCase(row) : null;
}

export function listAllHistoricalCases() {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_cases
       order by
         case when occurred_on is null then 1 else 0 end,
         occurred_on desc,
         external_item_id desc`,
    )
    .all() as HistoricalCaseRow[];
  return rows.map(mapHistoricalCase);
}

export function listHistoricalCaseUpdates(caseId: string) {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_case_updates
       where case_id = ?
       order by
         case when created_at is null then 1 else 0 end,
         datetime(created_at) desc,
         external_post_id desc`,
    )
    .all(caseId) as HistoricalUpdateRow[];
  return rows.map(mapHistoricalUpdate);
}

export function listHistoricalCaseAttachments(caseId: string) {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_case_attachments
       where case_id = ?
       order by external_asset_id`,
    )
    .all(caseId) as HistoricalAttachmentRow[];
  return rows.map(mapHistoricalAttachment);
}

export function listHistoricalEvents() {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_events
       order by
         case when coalesce(timeline_start, occurred_on) is null then 1 else 0 end,
         coalesce(timeline_start, occurred_on) desc,
         title`,
    )
    .all() as HistoricalEventRow[];
  return rows.map(mapHistoricalEvent);
}

export function getHistoricalEventById(id: string) {
  const row = getArchiveDb()
    .prepare("select * from historical_events where id = ?")
    .get(id) as HistoricalEventRow | undefined;
  return row ? mapHistoricalEvent(row) : null;
}

export function listHistoricalEventUpdates(eventId: string) {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_event_updates
       where event_id = ?
       order by
         case when created_at is null then 1 else 0 end,
         datetime(created_at) desc,
         external_post_id desc`,
    )
    .all(eventId) as HistoricalEventUpdateRow[];
  return rows.map(mapHistoricalEventUpdate);
}

export function listHistoricalEventAttachments(eventId: string) {
  const rows = getArchiveDb()
    .prepare(
      `select *
       from historical_event_attachments
       where event_id = ?
       order by external_asset_id`,
    )
    .all(eventId) as HistoricalEventAttachmentRow[];
  return rows.map(mapHistoricalEventAttachment);
}

export function getHistoricalArchiveSummary(): HistoricalArchiveSummary {
  const database = getArchiveDb();
  const caseSummary = database
    .prepare(
      `select
         count(*) as case_count,
         count(occurred_on) as dated_case_count,
         min(occurred_on) as earliest_case_date,
         max(occurred_on) as latest_case_date
       from historical_cases`,
    )
    .get() as {
    case_count: number;
    dated_case_count: number;
    earliest_case_date: string | null;
    latest_case_date: string | null;
  };
  const updateSummary = database
    .prepare(
      `select
         count(*) as update_count,
         count(distinct case_id) as cases_with_updates
       from historical_case_updates`,
    )
    .get() as { update_count: number; cases_with_updates: number };
  const caseAttachmentSummary = database
    .prepare(
      `select
         count(*) as attachment_count,
         sum(case when storage_path is not null then 1 else 0 end) as stored_count
       from historical_case_attachments`,
    )
    .get() as { attachment_count: number; stored_count: number | null };
  const eventCount = (
    database
      .prepare("select count(*) as count from historical_events")
      .get() as { count: number }
  ).count;
  const eventUpdateCount = (
    database
      .prepare("select count(*) as count from historical_event_updates")
      .get() as { count: number }
  ).count;
  const eventAttachmentSummary = database
    .prepare(
      `select
         count(*) as attachment_count,
         sum(case when storage_path is not null then 1 else 0 end) as stored_count
       from historical_event_attachments`,
    )
    .get() as { attachment_count: number; stored_count: number | null };
  const lastImportedAt = (
    database
      .prepare(
        "select max(updated_at) as last_imported_at from historical_import_batches",
      )
      .get() as { last_imported_at: string | null }
  ).last_imported_at;

  return {
    caseCount: caseSummary.case_count,
    datedCaseCount: caseSummary.dated_case_count,
    earliestCaseDate: caseSummary.earliest_case_date,
    latestCaseDate: caseSummary.latest_case_date,
    updateCount: updateSummary.update_count,
    casesWithUpdates: updateSummary.cases_with_updates,
    attachmentCount:
      caseAttachmentSummary.attachment_count +
      eventAttachmentSummary.attachment_count,
    storedAttachmentCount:
      (caseAttachmentSummary.stored_count ?? 0) +
      (eventAttachmentSummary.stored_count ?? 0),
    eventCount,
    eventUpdateCount,
    eventAttachmentCount: eventAttachmentSummary.attachment_count,
    lastImportedAt,
  };
}

export function getHistoricalArchiveFilterOptions() {
  const database = getArchiveDb();
  const statuses = (
    database
      .prepare(
        `select raw_status, count(*) as count
         from historical_cases
         group by raw_status
         order by count(*) desc, raw_status`,
      )
      .all() as { raw_status: string; count: number }[]
  ).map((row) => ({ value: row.raw_status, count: row.count }));
  const years = (
    database
      .prepare(
        `select substr(occurred_on, 1, 4) as year, count(*) as count
         from historical_cases
         where occurred_on is not null
         group by substr(occurred_on, 1, 4)
         order by year desc`,
      )
      .all() as { year: string; count: number }[]
  ).map((row) => ({ value: row.year, count: row.count }));

  return { statuses, years };
}

export function findHistoricalAttachmentsByAssetId(externalAssetId: string) {
  const database = getArchiveDb();
  const caseRows = database
    .prepare(
      "select * from historical_case_attachments where external_asset_id = ?",
    )
    .all(externalAssetId) as HistoricalAttachmentRow[];
  const eventRows = database
    .prepare(
      "select * from historical_event_attachments where external_asset_id = ?",
    )
    .all(externalAssetId) as HistoricalEventAttachmentRow[];
  return [
    ...caseRows.map(mapHistoricalAttachment),
    ...eventRows.map(mapHistoricalEventAttachment),
  ];
}

export function markHistoricalAttachmentStored(input: {
  externalAssetId: string;
  fileName: string;
  storagePath: string;
  mimeType?: string | null;
  sizeBytes: number;
}) {
  const database = getArchiveDb();
  const caseChanges = database
    .prepare(
      `update historical_case_attachments
       set file_name = ?, storage_path = ?, mime_type = ?, size_bytes = ?
       where external_asset_id = ?`,
    )
    .run(
      input.fileName,
      input.storagePath,
      input.mimeType || null,
      input.sizeBytes,
      input.externalAssetId,
    ).changes;
  const eventChanges = database
    .prepare(
      `update historical_event_attachments
       set file_name = ?, storage_path = ?, mime_type = ?, size_bytes = ?
       where external_asset_id = ?`,
    )
    .run(
      input.fileName,
      input.storagePath,
      input.mimeType || null,
      input.sizeBytes,
      input.externalAssetId,
    ).changes;
  return caseChanges + eventChanges;
}

export function getHistoricalAttachmentById(id: string) {
  const database = getArchiveDb();
  const caseRow = database
    .prepare("select * from historical_case_attachments where id = ?")
    .get(id) as HistoricalAttachmentRow | undefined;
  if (caseRow) return mapHistoricalAttachment(caseRow);
  const eventRow = database
    .prepare("select * from historical_event_attachments where id = ?")
    .get(id) as HistoricalEventAttachmentRow | undefined;
  return eventRow ? mapHistoricalEventAttachment(eventRow) : null;
}

export function parseHistoricalArchiveManifest(
  input: unknown,
): HistoricalArchiveManifest {
  if (!isRecord(input)) {
    throw new Error("The history manifest must be a JSON object.");
  }
  if (input.schemaVersion !== 1) {
    throw new Error("Unsupported history manifest version.");
  }
  if (!isRecord(input.source)) {
    throw new Error("The history manifest is missing its source metadata.");
  }
  const verifiedBoardIds = new Set(["1400121716", "9364301909"]);
  if (
    input.source.system !== "monday.com" ||
    !verifiedBoardIds.has(optionalString(input.source.boardId))
  ) {
    throw new Error(
      "This importer only accepts the verified Constituent Calls or D7 Events export.",
    );
  }

  const cases = expectArray(input.cases, "cases", 5_000).map(parseManifestCase);
  const updates = expectArray(input.updates, "updates", 20_000).map(
    parseManifestUpdate,
  );
  const attachmentRefs = expectArray(
    input.attachmentRefs,
    "attachmentRefs",
    5_000,
  ).map(parseManifestAttachment);
  const events = expectArray(input.events, "events", 1_000).map(
    parseManifestEvent,
  );
  const eventUpdates = expectArray(
    input.eventUpdates ?? [],
    "eventUpdates",
    20_000,
  ).map(parseManifestEventUpdate);
  const eventAttachmentRefs = expectArray(
    input.eventAttachmentRefs ?? [],
    "eventAttachmentRefs",
    5_000,
  ).map(parseManifestEventAttachment);
  const caseIds = new Set(cases.map((item) => item.externalItemId));
  const orphanUpdate = updates.find(
    (item) => !caseIds.has(item.caseExternalItemId),
  );
  const orphanAttachment = attachmentRefs.find(
    (item) => !caseIds.has(item.caseExternalItemId),
  );
  if (orphanUpdate || orphanAttachment) {
    throw new Error("The manifest contains history that does not match a case.");
  }
  const eventIds = new Set(events.map((item) => item.externalItemId));
  const orphanEventUpdate = eventUpdates.find(
    (item) => !eventIds.has(item.eventExternalItemId),
  );
  const orphanEventAttachment = eventAttachmentRefs.find(
    (item) => !eventIds.has(item.eventExternalItemId),
  );
  if (orphanEventUpdate || orphanEventAttachment) {
    throw new Error("The manifest contains history that does not match an event.");
  }

  return {
    schemaVersion: 1,
    generatedAt: optionalString(input.generatedAt),
    source: {
      system: requiredString(input.source.system, "source.system"),
      accountId: requiredString(input.source.accountId, "source.accountId"),
      boardId: requiredIdentifier(input.source.boardId, "source.boardId"),
      boardName: requiredString(input.source.boardName, "source.boardName"),
      canonicalArchiveName: requiredString(
        input.source.canonicalArchiveName,
        "source.canonicalArchiveName",
      ),
      supplementalArchiveName: optionalString(
        input.source.supplementalArchiveName,
      ),
    },
    cases,
    updates,
    attachmentRefs,
    events,
    eventUpdates,
    eventAttachmentRefs,
  };
}

function parseManifestCase(value: unknown): HistoricalManifestCase {
  if (!isRecord(value)) throw new Error("Invalid case row in history manifest.");
  return {
    externalItemId: requiredIdentifier(
      value.externalItemId,
      "case.externalItemId",
    ),
    sourceGroup: optionalString(value.sourceGroup),
    name: optionalString(value.name),
    assignedPeople: optionalString(value.assignedPeople),
    answeredBy: optionalString(value.answeredBy),
    occurredOn: optionalDate(value.occurredOn),
    rawStatus: optionalString(value.rawStatus),
    summary: optionalString(value.summary),
    address: optionalString(value.address),
    phone: optionalString(value.phone),
    email: optionalString(value.email),
    actionTaken: optionalString(value.actionTaken),
    serviceNumber: optionalString(value.serviceNumber),
    fileLinks: stringArray(value.fileLinks),
    subitems: expectArray(value.subitems, "case.subitems", 100).map(
      parseManifestSubitem,
    ),
  };
}

function parseManifestSubitem(value: unknown): HistoricalSubitem {
  if (!isRecord(value)) throw new Error("Invalid historical subitem.");
  return {
    externalItemId: requiredIdentifier(
      value.externalItemId,
      "subitem.externalItemId",
    ),
    name: optionalString(value.name),
    owner: optionalString(value.owner),
    rawStatus: optionalString(value.rawStatus),
    occurredOn: optionalDate(value.occurredOn),
  };
}

function parseManifestUpdate(value: unknown): HistoricalManifestUpdate {
  if (!isRecord(value)) {
    throw new Error("Invalid update row in history manifest.");
  }
  return {
    externalPostId: requiredIdentifier(
      value.externalPostId,
      "update.externalPostId",
    ),
    parentExternalPostId: optionalIdentifier(value.parentExternalPostId),
    caseExternalItemId: requiredIdentifier(
      value.caseExternalItemId,
      "update.caseExternalItemId",
    ),
    caseName: optionalString(value.caseName),
    contentType: optionalString(value.contentType) || "Update",
    authorName: optionalString(value.authorName),
    createdAt: optionalIsoDateTime(value.createdAt),
    createdAtRaw: optionalString(value.createdAtRaw),
    body: optionalString(value.body),
    likesCount:
      typeof value.likesCount === "number" && Number.isFinite(value.likesCount)
        ? Math.max(0, Math.floor(value.likesCount))
        : 0,
    assetIds: stringArray(value.assetIds).filter((item) => /^\d+$/.test(item)),
  };
}

function parseManifestAttachment(
  value: unknown,
): HistoricalManifestAttachment {
  if (!isRecord(value)) {
    throw new Error("Invalid attachment row in history manifest.");
  }
  return {
    caseExternalItemId: requiredIdentifier(
      value.caseExternalItemId,
      "attachment.caseExternalItemId",
    ),
    externalAssetId: requiredIdentifier(
      value.externalAssetId,
      "attachment.externalAssetId",
    ),
    externalPostId: optionalIdentifier(value.externalPostId),
    source: optionalString(value.source) || "update",
    originalLink: optionalString(value.originalLink) || null,
  };
}

function parseManifestEvent(value: unknown): HistoricalManifestEvent {
  if (!isRecord(value)) throw new Error("Invalid historical event.");
  const sourceKey = requiredString(value.sourceKey, "event.sourceKey");
  return {
    sourceKey,
    externalItemId:
      optionalIdentifier(value.externalItemId) ??
      crypto.createHash("sha256").update(sourceKey).digest("hex").slice(0, 18),
    sourceGroup: optionalString(value.sourceGroup),
    occurredOn: optionalDate(value.occurredOn),
    dateText: optionalString(value.dateText),
    title: requiredString(value.title, "event.title"),
    owners: optionalString(value.owners),
    collaborators: optionalString(value.collaborators),
    role: optionalString(value.role),
    partners: optionalString(value.partners),
    relevantInfo: optionalString(value.relevantInfo),
    commissionerAttending: optionalString(value.commissionerAttending),
    rawStatus: optionalString(value.rawStatus),
    priority: optionalString(value.priority),
    timelineStart: optionalDate(value.timelineStart),
    timelineEnd: optionalDate(value.timelineEnd),
    durationDays: optionalNumber(value.durationDays),
    fileLinks: stringArray(value.fileLinks),
    subitems: expectArray(value.subitems ?? [], "event.subitems", 500).map(
      parseManifestEventSubitem,
    ),
  };
}

function parseManifestEventSubitem(value: unknown): HistoricalEventSubitem {
  if (!isRecord(value)) throw new Error("Invalid historical event subitem.");
  return {
    externalItemId: requiredIdentifier(
      value.externalItemId,
      "event.subitem.externalItemId",
    ),
    name: optionalString(value.name),
    owner: optionalString(value.owner),
    rawStatus: optionalString(value.rawStatus),
    dueOn: optionalDate(value.dueOn),
  };
}

function parseManifestEventUpdate(
  value: unknown,
): HistoricalManifestEventUpdate {
  if (!isRecord(value)) throw new Error("Invalid historical event update.");
  return {
    externalPostId: requiredIdentifier(
      value.externalPostId,
      "eventUpdate.externalPostId",
    ),
    parentExternalPostId: optionalIdentifier(value.parentExternalPostId),
    eventExternalItemId: requiredIdentifier(
      value.eventExternalItemId,
      "eventUpdate.eventExternalItemId",
    ),
    itemName: optionalString(value.itemName),
    contentType: optionalString(value.contentType) || "Update",
    authorName: optionalString(value.authorName),
    createdAt: optionalIsoDateTime(value.createdAt),
    createdAtRaw: optionalString(value.createdAtRaw),
    body: optionalString(value.body),
    likesCount:
      typeof value.likesCount === "number" && Number.isFinite(value.likesCount)
        ? Math.max(0, Math.floor(value.likesCount))
        : 0,
    assetIds: stringArray(value.assetIds).filter((item) => /^\d+$/.test(item)),
  };
}

function parseManifestEventAttachment(
  value: unknown,
): HistoricalManifestEventAttachment {
  if (!isRecord(value)) throw new Error("Invalid historical event attachment.");
  return {
    eventExternalItemId: requiredIdentifier(
      value.eventExternalItemId,
      "eventAttachment.eventExternalItemId",
    ),
    externalAssetId: requiredIdentifier(
      value.externalAssetId,
      "eventAttachment.externalAssetId",
    ),
    externalPostId: optionalIdentifier(value.externalPostId),
    source: optionalString(value.source) || "event-board",
    originalLink: optionalString(value.originalLink) || null,
  };
}

function mapHistoricalCase(row: HistoricalCaseRow): HistoricalCase {
  return {
    id: row.id,
    externalItemId: row.external_item_id,
    sourceBoardId: row.source_board_id,
    sourceGroup: row.source_group,
    residentName: row.resident_name,
    assignedPeople: row.assigned_people,
    answeredBy: row.answered_by,
    occurredOn: row.occurred_on,
    rawStatus: row.raw_status,
    inferredCategory: row.inferred_category,
    summary: row.summary,
    addressText: row.address_text,
    phone: row.phone,
    email: row.email,
    actionTaken: row.action_taken,
    serviceNumber: row.service_number,
    fileLinks: parseJsonArray(row.file_links_json),
    subitems: parseSubitems(row.subitems_json),
    importedAt: row.imported_at,
    updatedAt: row.updated_at,
  };
}

function mapHistoricalUpdate(row: HistoricalUpdateRow): HistoricalCaseUpdate {
  return {
    id: row.id,
    caseId: row.case_id,
    externalPostId: row.external_post_id,
    parentExternalPostId: row.parent_external_post_id,
    contentType: row.content_type,
    authorName: row.author_name,
    createdAt: row.created_at,
    createdAtRaw: row.created_at_raw,
    body: row.body,
    likesCount: row.likes_count,
    assetIds: parseJsonArray(row.asset_ids_json),
    importedAt: row.imported_at,
  };
}

function mapHistoricalAttachment(
  row: HistoricalAttachmentRow,
): HistoricalCaseAttachment {
  return {
    id: row.id,
    caseId: row.case_id,
    externalAssetId: row.external_asset_id,
    externalPostId: row.external_post_id,
    source: row.source,
    originalLink: row.original_link,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    importedAt: row.imported_at,
  };
}

function mapHistoricalEvent(row: HistoricalEventRow): HistoricalEvent {
  return {
    id: row.id,
    sourceKey: row.source_key,
    externalItemId: row.external_item_id,
    sourceBoardId: row.source_board_id,
    sourceGroup: row.source_group,
    occurredOn: row.occurred_on,
    dateText: row.date_text,
    title: row.title,
    owners: row.owners,
    collaborators: row.collaborators,
    role: row.role,
    partners: row.partners,
    relevantInfo: row.relevant_info,
    commissionerAttending: row.commissioner_attending,
    rawStatus: row.raw_status,
    priority: row.priority,
    timelineStart: row.timeline_start,
    timelineEnd: row.timeline_end,
    durationDays: row.duration_days,
    fileLinks: parseJsonArray(row.file_links_json),
    subitems: parseEventSubitems(row.subitems_json),
    importedAt: row.imported_at,
    updatedAt: row.updated_at,
  };
}

function mapHistoricalEventUpdate(
  row: HistoricalEventUpdateRow,
): HistoricalEventUpdate {
  return {
    id: row.id,
    eventId: row.event_id,
    externalPostId: row.external_post_id,
    parentExternalPostId: row.parent_external_post_id,
    itemName: row.item_name,
    contentType: row.content_type,
    authorName: row.author_name,
    createdAt: row.created_at,
    createdAtRaw: row.created_at_raw,
    body: row.body,
    likesCount: row.likes_count,
    assetIds: parseJsonArray(row.asset_ids_json),
    importedAt: row.imported_at,
  };
}

function mapHistoricalEventAttachment(
  row: HistoricalEventAttachmentRow,
): HistoricalEventAttachment {
  return {
    id: row.id,
    eventId: row.event_id,
    externalAssetId: row.external_asset_id,
    externalPostId: row.external_post_id,
    source: row.source,
    originalLink: row.original_link,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    importedAt: row.imported_at,
  };
}

function historicalCaseId(externalItemId: string) {
  return `monday-case-${externalItemId}`;
}

function historicalAttachmentId(
  caseExternalItemId: string,
  externalAssetId: string,
) {
  return `monday-asset-${caseExternalItemId}-${externalAssetId}`;
}

function historicalEventId(sourceKey: string) {
  const digest = crypto.createHash("sha256").update(sourceKey).digest("hex");
  return `historical-event-${digest.slice(0, 24)}`;
}

function historicalEventAttachmentId(
  eventExternalItemId: string,
  externalAssetId: string,
) {
  return `monday-event-asset-${eventExternalItemId}-${externalAssetId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function expectArray(value: unknown, field: string, maximum: number) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  if (value.length > maximum) throw new Error(`${field} exceeds its safe limit.`);
  return value;
}

function requiredString(value: unknown, field: string) {
  const normalized = optionalString(value);
  if (!normalized) throw new Error(`${field} is required.`);
  if (normalized.length > 50_000) throw new Error(`${field} is too long.`);
  return normalized;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredIdentifier(value: unknown, field: string) {
  const normalized = optionalString(value);
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${field} must be a numeric Monday ID.`);
  }
  return normalized;
}

function optionalIdentifier(value: unknown) {
  const normalized = optionalString(value);
  return /^\d+$/.test(normalized) ? normalized : null;
}

function optionalDate(value: unknown) {
  const normalized = optionalString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function optionalIsoDateTime(value: unknown) {
  const normalized = optionalString(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(value: string) {
  try {
    return stringArray(JSON.parse(value));
  } catch {
    return [];
  }
}

function parseSubitems(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(isRecord).map(parseManifestSubitem)
      : [];
  } catch {
    return [];
  }
}

function parseEventSubitems(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(isRecord).map(parseManifestEventSubitem)
      : [];
  } catch {
    return [];
  }
}

export function historicalArchiveManifestDigest(input: unknown) {
  const manifest = parseHistoricalArchiveManifest(input);
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");
}
