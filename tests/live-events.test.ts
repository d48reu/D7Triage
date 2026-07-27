import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("creates and maintains a live event workspace", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-live-events-test-"));
  process.env.DATA_DIR = dataDir;

  const issuesRepository = await import("../src/lib/issues-repository");
  const eventsRepository = await import("../src/lib/live-events-repository");
  const staff = issuesRepository.listStaffMembers();
  const carol = staff.find((member) => member.name === "Carol Gustafson");
  const karl = staff.find((member) => member.name === "Karl Eugene Boehm");

  assert.ok(carol);
  assert.ok(karl);

  const event = eventsRepository.createLiveEvent({
    title: "District 7 Resource Fair",
    description: "Coordinate partners and resident outreach.",
    location: "Continental Park",
    startDate: "2026-09-12",
    endDate: "2026-09-12",
    status: "In progress",
    priority: "High",
    ownerStaffId: carol.id,
    collaboratorStaffIds: [karl.id],
    partnerNames: "Parks, Tax Collector",
    districtRole: "Hosted by District 7",
    commissionerAttending: "Not decided",
    pointOfContactName: "Community Partner",
    pointOfContactEmail: "partner@example.com",
    pointOfContactPhone: "305-555-0100",
  });

  assert.equal(event.ownerName, "Carol Gustafson");
  assert.deepEqual(event.collaborators, [
    { id: karl.id, name: "Karl Eugene Boehm" },
  ]);
  assert.equal(eventsRepository.getLiveEventSummary().eventCount, 1);
  assert.equal(eventsRepository.getLiveEventSummary().inProgressCount, 1);

  eventsRepository.addLiveEventUpdate({
    eventId: event.id,
    body: "Venue confirmed. Outreach list is next.",
    authorStaffId: carol.id,
  });
  const subtask = eventsRepository.addLiveEventSubtask({
    eventId: event.id,
    title: "Confirm outreach list",
    status: "Not started",
    assignedStaffId: karl.id,
    dueDate: "2026-08-20",
  });
  assert.ok(subtask);

  const updatedSubtask = eventsRepository.updateLiveEventSubtask({
    eventId: event.id,
    subtaskId: subtask.id,
    status: "Done",
    assignedStaffId: karl.id,
    dueDate: "2026-08-20",
  });
  assert.equal(updatedSubtask?.status, "Done");

  eventsRepository.addLiveEventAttachment({
    eventId: event.id,
    fileName: "resource-fair.pdf",
    storagePath: path.join(dataDir, "resource-fair.pdf"),
    mimeType: "application/pdf",
    sizeBytes: 2048,
  });

  const refreshed = eventsRepository.getLiveEventById(event.id);
  assert.ok(refreshed);
  assert.equal(refreshed.updateCount, 1);
  assert.equal(refreshed.subtaskCount, 1);
  assert.equal(refreshed.completedSubtaskCount, 1);
  assert.equal(refreshed.attachmentCount, 1);
  assert.equal(eventsRepository.listLiveEventUpdates(event.id).length, 1);
  assert.equal(eventsRepository.listLiveEventSubtasks(event.id).length, 1);
  assert.equal(eventsRepository.listLiveEventAttachments(event.id).length, 1);

  const updated = eventsRepository.updateLiveEvent(event.id, {
    title: event.title,
    description: "Updated planning record.",
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    status: "Done",
    priority: event.priority,
    ownerStaffId: carol.id,
    collaboratorStaffIds: [],
    partnerNames: event.partnerNames,
    districtRole: event.districtRole,
    commissionerAttending: "Yes",
    pointOfContactName: event.pointOfContactName,
    pointOfContactEmail: event.pointOfContactEmail,
    pointOfContactPhone: event.pointOfContactPhone,
  });

  assert.equal(updated?.status, "Done");
  assert.equal(updated?.collaborators.length, 0);
  assert.equal(eventsRepository.getLiveEventSummary().completedCount, 1);
  assert.equal(
    eventsRepository.listLiveEvents({ query: "Resource Fair" }).length,
    1,
  );
  assert.equal(
    eventsRepository.listLiveEvents({ status: "In progress" }).length,
    0,
  );
});
