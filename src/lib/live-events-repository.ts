import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getIssuesDatabase } from "@/lib/issues-repository";
import type {
  CommissionerAttendance,
  LiveEvent,
  LiveEventAttachment,
  LiveEventCollaborator,
  LiveEventPriority,
  LiveEventStatus,
  LiveEventSubtask,
  LiveEventSubtaskStatus,
  LiveEventSummary,
  LiveEventUpdate,
  SaveLiveEventInput,
} from "@/lib/live-event-types";

export {
  COMMISSIONER_ATTENDANCE_OPTIONS,
  LIVE_EVENT_PRIORITIES,
  LIVE_EVENT_STATUSES,
  LIVE_EVENT_SUBTASK_STATUSES,
} from "@/lib/live-event-types";
export type {
  CommissionerAttendance,
  LiveEvent,
  LiveEventAttachment,
  LiveEventCollaborator,
  LiveEventPriority,
  LiveEventStatus,
  LiveEventSubtask,
  LiveEventSubtaskStatus,
  LiveEventSummary,
  LiveEventUpdate,
  SaveLiveEventInput,
} from "@/lib/live-event-types";

type LiveEventRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  status: LiveEventStatus;
  priority: LiveEventPriority;
  owner_staff_id: string;
  owner_name: string;
  partner_names: string;
  district_role: string;
  commissioner_attending: CommissionerAttendance;
  point_of_contact_name: string;
  point_of_contact_email: string;
  point_of_contact_phone: string;
  subtask_count: number;
  completed_subtask_count: number;
  update_count: number;
  attachment_count: number;
  created_at: string;
  updated_at: string;
};

type LiveEventUpdateRow = {
  id: string;
  event_id: string;
  body: string;
  author_staff_id: string | null;
  author_name: string;
  created_at: string;
};

type LiveEventSubtaskRow = {
  id: string;
  event_id: string;
  title: string;
  status: LiveEventSubtaskStatus;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type LiveEventAttachmentRow = {
  id: string;
  event_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

let schemaReady = false;

function getDb() {
  const database = getIssuesDatabase();
  ensureLiveEventSchema(database);
  return database;
}

function ensureLiveEventSchema(database: Database.Database) {
  if (schemaReady) return;

  database.exec(`
    create table if not exists live_events (
      id text primary key,
      title text not null,
      description text not null default '',
      location text not null default '',
      start_date text,
      end_date text,
      status text not null default 'Not started',
      priority text not null default 'Medium',
      owner_staff_id text not null references staff_members(id) on delete restrict,
      partner_names text not null default '',
      district_role text not null default '',
      commissioner_attending text not null default 'Not decided',
      point_of_contact_name text not null default '',
      point_of_contact_email text not null default '',
      point_of_contact_phone text not null default '',
      created_at text not null,
      updated_at text not null
    );

    create table if not exists live_event_collaborators (
      event_id text not null references live_events(id) on delete cascade,
      staff_member_id text not null references staff_members(id) on delete cascade,
      created_at text not null,
      primary key (event_id, staff_member_id)
    );

    create table if not exists live_event_updates (
      id text primary key,
      event_id text not null references live_events(id) on delete cascade,
      body text not null,
      author_staff_id text references staff_members(id) on delete set null,
      author_name text not null,
      created_at text not null
    );

    create table if not exists live_event_subtasks (
      id text primary key,
      event_id text not null references live_events(id) on delete cascade,
      title text not null,
      status text not null default 'Not started',
      assigned_staff_id text references staff_members(id) on delete set null,
      due_date text,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists live_event_attachments (
      id text primary key,
      event_id text not null references live_events(id) on delete cascade,
      file_name text not null,
      storage_path text not null,
      mime_type text,
      size_bytes integer,
      created_at text not null
    );

    create index if not exists idx_live_events_start_date
      on live_events(start_date, updated_at);
    create index if not exists idx_live_events_status
      on live_events(status);
    create index if not exists idx_live_event_updates_event
      on live_event_updates(event_id, created_at);
    create index if not exists idx_live_event_subtasks_event
      on live_event_subtasks(event_id, due_date);
    create index if not exists idx_live_event_attachments_event
      on live_event_attachments(event_id, created_at);
  `);

  schemaReady = true;
}

const eventSelect = `
  select
    event.*,
    owner.name as owner_name,
    (
      select count(*)
      from live_event_subtasks subtask
      where subtask.event_id = event.id
    ) as subtask_count,
    (
      select count(*)
      from live_event_subtasks subtask
      where subtask.event_id = event.id and subtask.status = 'Done'
    ) as completed_subtask_count,
    (
      select count(*)
      from live_event_updates event_update
      where event_update.event_id = event.id
    ) as update_count,
    (
      select count(*)
      from live_event_attachments attachment
      where attachment.event_id = event.id
    ) as attachment_count
  from live_events event
  inner join staff_members owner on owner.id = event.owner_staff_id
`;

export function listLiveEvents(input?: {
  query?: string;
  status?: string;
}) {
  const query = input?.query?.trim() ?? "";
  const status = input?.status?.trim() ?? "";
  const clauses: string[] = [];
  const params: string[] = [];

  if (query) {
    const term = `%${query}%`;
    clauses.push(`(
      event.title like ? collate nocase
      or event.description like ? collate nocase
      or event.location like ? collate nocase
      or event.partner_names like ? collate nocase
      or event.point_of_contact_name like ? collate nocase
      or owner.name like ? collate nocase
    )`);
    params.push(term, term, term, term, term, term);
  }

  if (status) {
    clauses.push("event.status = ?");
    params.push(status);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const rows = getDb()
    .prepare(
      `${eventSelect}
       ${where}
       order by
         case event.status
           when 'In progress' then 0
           when 'Not started' then 1
           when 'Done' then 2
           else 3
         end,
         case when event.start_date is null or event.start_date = '' then 1 else 0 end,
         event.start_date asc,
         datetime(event.updated_at) desc`,
    )
    .all(...params) as LiveEventRow[];

  return rows.map(mapEvent);
}

export function listAllLiveEvents() {
  return listLiveEvents();
}

export function getLiveEventById(id: string) {
  const row = getDb()
    .prepare(`${eventSelect} where event.id = ?`)
    .get(id) as LiveEventRow | undefined;

  return row ? mapEvent(row) : null;
}

export function getLiveEventSummary(): LiveEventSummary {
  const row = getDb()
    .prepare(
      `select
        count(*) as event_count,
        sum(case
          when status not in ('Done', 'Cancelled')
            and (start_date is null or date(start_date) >= date('now'))
          then 1 else 0 end
        ) as upcoming_count,
        sum(case when status = 'In progress' then 1 else 0 end) as in_progress_count,
        sum(case when status = 'Done' then 1 else 0 end) as completed_count
       from live_events`,
    )
    .get() as {
    event_count: number;
    upcoming_count: number | null;
    in_progress_count: number | null;
    completed_count: number | null;
  };

  return {
    eventCount: row.event_count,
    upcomingCount: row.upcoming_count ?? 0,
    inProgressCount: row.in_progress_count ?? 0,
    completedCount: row.completed_count ?? 0,
  };
}

export function createLiveEvent(input: SaveLiveEventInput) {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  database.transaction(() => {
    database
      .prepare(
        `insert into live_events (
          id, title, description, location, start_date, end_date, status,
          priority, owner_staff_id, partner_names, district_role,
          commissioner_attending, point_of_contact_name,
          point_of_contact_email, point_of_contact_phone, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.description,
        input.location,
        input.startDate,
        input.endDate,
        input.status,
        input.priority,
        input.ownerStaffId,
        input.partnerNames,
        input.districtRole,
        input.commissionerAttending,
        input.pointOfContactName,
        input.pointOfContactEmail,
        input.pointOfContactPhone,
        now,
        now,
      );

    replaceCollaborators(database, id, input.collaboratorStaffIds, now);
  })();

  const event = getLiveEventById(id);
  if (!event) {
    throw new Error("Event was not stored.");
  }

  return event;
}

export function updateLiveEvent(id: string, input: SaveLiveEventInput) {
  const database = getDb();
  const existing = getLiveEventById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  database.transaction(() => {
    database
      .prepare(
        `update live_events
         set
           title = ?,
           description = ?,
           location = ?,
           start_date = ?,
           end_date = ?,
           status = ?,
           priority = ?,
           owner_staff_id = ?,
           partner_names = ?,
           district_role = ?,
           commissioner_attending = ?,
           point_of_contact_name = ?,
           point_of_contact_email = ?,
           point_of_contact_phone = ?,
           updated_at = ?
         where id = ?`,
      )
      .run(
        input.title,
        input.description,
        input.location,
        input.startDate,
        input.endDate,
        input.status,
        input.priority,
        input.ownerStaffId,
        input.partnerNames,
        input.districtRole,
        input.commissionerAttending,
        input.pointOfContactName,
        input.pointOfContactEmail,
        input.pointOfContactPhone,
        now,
        id,
      );

    replaceCollaborators(database, id, input.collaboratorStaffIds, now);
  })();

  return getLiveEventById(id);
}

function replaceCollaborators(
  database: Database.Database,
  eventId: string,
  staffMemberIds: string[],
  createdAt: string,
) {
  database
    .prepare("delete from live_event_collaborators where event_id = ?")
    .run(eventId);

  const insert = database.prepare(
    `insert into live_event_collaborators (
      event_id, staff_member_id, created_at
    ) values (?, ?, ?)`,
  );

  for (const staffMemberId of Array.from(new Set(staffMemberIds))) {
    insert.run(eventId, staffMemberId, createdAt);
  }
}

function listCollaborators(eventId: string) {
  return getDb()
    .prepare(
      `select staff.id, staff.name
       from live_event_collaborators collaborator
       inner join staff_members staff on staff.id = collaborator.staff_member_id
       where collaborator.event_id = ?
       order by staff.name collate nocase`,
    )
    .all(eventId) as LiveEventCollaborator[];
}

export function addLiveEventUpdate(input: {
  eventId: string;
  body: string;
  authorStaffId: string;
}) {
  const database = getDb();
  const event = getLiveEventById(input.eventId);
  if (!event) return null;

  const author = database
    .prepare("select id, name from staff_members where id = ? and is_active = 1")
    .get(input.authorStaffId) as { id: string; name: string } | undefined;
  if (!author) {
    throw new Error("Update author was not found.");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.transaction(() => {
    database
      .prepare(
        `insert into live_event_updates (
          id, event_id, body, author_staff_id, author_name, created_at
        ) values (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.eventId,
        input.body,
        author.id,
        author.name,
        createdAt,
      );
    touchEvent(database, input.eventId, createdAt);
  })();

  return getLiveEventUpdateById(id);
}

function getLiveEventUpdateById(id: string) {
  const row = getDb()
    .prepare("select * from live_event_updates where id = ?")
    .get(id) as LiveEventUpdateRow | undefined;

  return row ? mapUpdate(row) : null;
}

export function listLiveEventUpdates(eventId: string) {
  const rows = getDb()
    .prepare(
      `select *
       from live_event_updates
       where event_id = ?
       order by datetime(created_at) desc, id desc`,
    )
    .all(eventId) as LiveEventUpdateRow[];

  return rows.map(mapUpdate);
}

export function addLiveEventSubtask(input: {
  eventId: string;
  title: string;
  status: LiveEventSubtaskStatus;
  assignedStaffId: string | null;
  dueDate: string | null;
}) {
  const database = getDb();
  const event = getLiveEventById(input.eventId);
  if (!event) return null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database.transaction(() => {
    database
      .prepare(
        `insert into live_event_subtasks (
          id, event_id, title, status, assigned_staff_id, due_date,
          created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.eventId,
        input.title,
        input.status,
        input.assignedStaffId,
        input.dueDate,
        now,
        now,
      );
    touchEvent(database, input.eventId, now);
  })();

  return getLiveEventSubtaskById(id);
}

export function updateLiveEventSubtask(input: {
  eventId: string;
  subtaskId: string;
  status: LiveEventSubtaskStatus;
  assignedStaffId: string | null;
  dueDate: string | null;
}) {
  const database = getDb();
  const existing = database
    .prepare(
      "select id from live_event_subtasks where id = ? and event_id = ?",
    )
    .get(input.subtaskId, input.eventId) as { id: string } | undefined;
  if (!existing) return null;

  const now = new Date().toISOString();
  database.transaction(() => {
    database
      .prepare(
        `update live_event_subtasks
         set status = ?, assigned_staff_id = ?, due_date = ?, updated_at = ?
         where id = ? and event_id = ?`,
      )
      .run(
        input.status,
        input.assignedStaffId,
        input.dueDate,
        now,
        input.subtaskId,
        input.eventId,
      );
    touchEvent(database, input.eventId, now);
  })();

  return getLiveEventSubtaskById(input.subtaskId);
}

function getLiveEventSubtaskById(id: string) {
  const row = getDb()
    .prepare(
      `select subtask.*, staff.name as assigned_staff_name
       from live_event_subtasks subtask
       left join staff_members staff on staff.id = subtask.assigned_staff_id
       where subtask.id = ?`,
    )
    .get(id) as LiveEventSubtaskRow | undefined;

  return row ? mapSubtask(row) : null;
}

export function listLiveEventSubtasks(eventId: string) {
  const rows = getDb()
    .prepare(
      `select subtask.*, staff.name as assigned_staff_name
       from live_event_subtasks subtask
       left join staff_members staff on staff.id = subtask.assigned_staff_id
       where subtask.event_id = ?
       order by
         case subtask.status
           when 'In progress' then 0
           when 'Not started' then 1
           else 2
         end,
         case when subtask.due_date is null then 1 else 0 end,
         subtask.due_date asc,
         datetime(subtask.created_at) asc`,
    )
    .all(eventId) as LiveEventSubtaskRow[];

  return rows.map(mapSubtask);
}

export function addLiveEventAttachment(input: {
  eventId: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  const database = getDb();
  const event = getLiveEventById(input.eventId);
  if (!event) return null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.transaction(() => {
    database
      .prepare(
        `insert into live_event_attachments (
          id, event_id, file_name, storage_path, mime_type, size_bytes, created_at
        ) values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.eventId,
        input.fileName,
        input.storagePath,
        input.mimeType || null,
        input.sizeBytes ?? null,
        createdAt,
      );
    touchEvent(database, input.eventId, createdAt);
  })();

  return getLiveEventAttachmentById(id);
}

export function getLiveEventAttachmentById(id: string) {
  const row = getDb()
    .prepare("select * from live_event_attachments where id = ?")
    .get(id) as LiveEventAttachmentRow | undefined;

  return row ? mapAttachment(row) : null;
}

export function listLiveEventAttachments(eventId: string) {
  const rows = getDb()
    .prepare(
      `select *
       from live_event_attachments
       where event_id = ?
       order by datetime(created_at) desc, id desc`,
    )
    .all(eventId) as LiveEventAttachmentRow[];

  return rows.map(mapAttachment);
}

function touchEvent(
  database: Database.Database,
  eventId: string,
  updatedAt: string,
) {
  database
    .prepare("update live_events set updated_at = ? where id = ?")
    .run(updatedAt, eventId);
}

function mapEvent(row: LiveEventRow): LiveEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    priority: row.priority,
    ownerStaffId: row.owner_staff_id,
    ownerName: row.owner_name,
    collaborators: listCollaborators(row.id),
    partnerNames: row.partner_names,
    districtRole: row.district_role,
    commissionerAttending: row.commissioner_attending,
    pointOfContactName: row.point_of_contact_name,
    pointOfContactEmail: row.point_of_contact_email,
    pointOfContactPhone: row.point_of_contact_phone,
    subtaskCount: row.subtask_count,
    completedSubtaskCount: row.completed_subtask_count,
    updateCount: row.update_count,
    attachmentCount: row.attachment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUpdate(row: LiveEventUpdateRow): LiveEventUpdate {
  return {
    id: row.id,
    eventId: row.event_id,
    body: row.body,
    authorStaffId: row.author_staff_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

function mapSubtask(row: LiveEventSubtaskRow): LiveEventSubtask {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    status: row.status,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: row.assigned_staff_name,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttachment(row: LiveEventAttachmentRow): LiveEventAttachment {
  return {
    id: row.id,
    eventId: row.event_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}
