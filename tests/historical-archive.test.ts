import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("imports Monday history idempotently without adding live issue reports", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-history-test-"));
  process.env.DATA_DIR = dataDir;

  const history = await import("../src/lib/historical-archive-repository");
  const issues = await import("../src/lib/issues-repository");
  const manifest = {
    schemaVersion: 1,
    generatedAt: "2026-07-24T18:00:00.000Z",
    source: {
      system: "monday.com",
      accountId: "8388816",
      boardId: "1400121716",
      boardName: "Constituent Calls",
      canonicalArchiveName: "account_8388816_data_1784912955.zip",
      supplementalArchiveName: "sdadasdas.zip",
    },
    cases: [
      {
        externalItemId: "12603029194",
        sourceGroup: "2026 July",
        name: "Lorenzo Cruz",
        assignedPeople: "diego",
        answeredBy: "Karl-Eugene Boehm",
        occurredOn: "2026-07-22",
        rawStatus: "Needs follow up",
        summary: "Traffic study and speed bump request",
        address: "SW 99 Terrace",
        phone: "305.724.7858",
        email: "resident@example.com",
        actionTaken: "Emailed staff",
        serviceNumber: "",
        fileLinks: [],
        subitems: [],
      },
    ],
    updates: [
      {
        externalPostId: "5000000001",
        parentExternalPostId: null,
        caseExternalItemId: "12603029194",
        caseName: "Lorenzo Cruz",
        contentType: "Update",
        authorName: "Karl-Eugene Boehm",
        createdAt: "2026-07-23T14:00:00.000Z",
        createdAtRaw: "23/July/2026  10:00:00 AM",
        body: "Followed up with transportation.",
        likesCount: 0,
        assetIds: ["617292056"],
      },
    ],
    attachmentRefs: [
      {
        caseExternalItemId: "12603029194",
        externalAssetId: "617292056",
        externalPostId: "5000000001",
        source: "update",
        originalLink: null,
      },
    ],
    events: [
      {
        sourceKey: "a".repeat(64),
        externalItemId: "9001",
        sourceGroup: "D7 Events",
        occurredOn: "2026-07-02",
        dateText: "Thursday, July 2",
        title: "Ice Cream Social",
        owners: "Carol Gustafson",
        collaborators: "Stephanie Womble",
        role: "",
        partners: "Federation Gardens",
        relevantInfo: "Seniors",
        commissionerAttending: "",
        rawStatus: "In progress",
        priority: "Medium",
        timelineStart: "2026-07-02",
        timelineEnd: "2026-07-02",
        durationDays: 1,
        fileLinks: ["https://example.com/8001/file.pdf"],
        subitems: [
          {
            externalItemId: "9002",
            name: "Confirm seniors",
            owner: "Carol Gustafson",
            rawStatus: "Done",
            dueOn: "2026-06-30",
          },
        ],
      },
    ],
    eventUpdates: [
      {
        externalPostId: "7001",
        parentExternalPostId: null,
        eventExternalItemId: "9001",
        itemName: "Ice Cream Social",
        contentType: "Update",
        authorName: "Carol Gustafson",
        createdAt: "2026-06-30T15:00:00.000Z",
        createdAtRaw: "30/June/2026  11:00:00 AM",
        body: "Federation Gardens confirmed.",
        likesCount: 0,
        assetIds: [],
      },
    ],
    eventAttachmentRefs: [
      {
        eventExternalItemId: "9001",
        externalAssetId: "8001",
        externalPostId: null,
        source: "event-board",
        originalLink: "https://example.com/8001/file.pdf",
      },
    ],
  };

  const first = history.importHistoricalArchive(manifest);
  const second = history.importHistoricalArchive(manifest);

  assert.equal(first.newCases, 1);
  assert.equal(first.newUpdates, 1);
  assert.equal(first.newEvents, 1);
  assert.equal(first.newEventUpdates, 1);
  assert.equal(second.newCases, 0);
  assert.equal(second.newUpdates, 0);
  assert.equal(second.newEvents, 0);
  assert.equal(second.newEventUpdates, 0);
  assert.equal(issues.listAllIssueReports().length, 0);

  const summary = history.getHistoricalArchiveSummary();
  assert.equal(summary.caseCount, 1);
  assert.equal(summary.updateCount, 1);
  assert.equal(summary.attachmentCount, 2);
  assert.equal(summary.eventCount, 1);
  assert.equal(summary.eventUpdateCount, 1);
  assert.equal(summary.eventAttachmentCount, 1);

  const search = history.listHistoricalCases({ query: "speed bump" });
  assert.equal(search.total, 1);
  assert.equal(search.cases[0].externalItemId, "12603029194");
  assert.equal(search.cases[0].rawStatus, "Needs follow up");

  const updates = history.listHistoricalCaseUpdates(search.cases[0].id);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].authorName, "Karl-Eugene Boehm");

  const event = history.listHistoricalEvents()[0];
  assert.equal(event.owners, "Carol Gustafson");
  assert.equal(event.subitems.length, 1);
  assert.equal(history.getHistoricalEventById(event.id)?.priority, "Medium");
  assert.equal(history.listHistoricalEventUpdates(event.id).length, 1);
  assert.equal(history.listHistoricalEventAttachments(event.id).length, 1);

  assert.equal(
    history.markHistoricalAttachmentStored({
      externalAssetId: "617292056",
      fileName: "photo.jpg",
      storagePath: path.join(dataDir, "photo.jpg"),
      mimeType: "image/jpeg",
      sizeBytes: 42,
    }),
    1,
  );
  assert.equal(
    history.markHistoricalAttachmentStored({
      externalAssetId: "8001",
      fileName: "event.pdf",
      storagePath: path.join(dataDir, "event.pdf"),
      mimeType: "application/pdf",
      sizeBytes: 84,
    }),
    1,
  );
  assert.equal(history.getHistoricalArchiveSummary().storedAttachmentCount, 2);
});
