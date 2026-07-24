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
        occurredOn: "2026-07-02",
        dateText: "Thursday, July 2",
        title: "Ice Cream Social",
        role: "",
        partners: "Federation Gardens",
        relevantInfo: "Seniors",
        commissionerAttending: "",
        rawStatus: "",
      },
    ],
  };

  const first = history.importHistoricalArchive(manifest);
  const second = history.importHistoricalArchive(manifest);

  assert.equal(first.newCases, 1);
  assert.equal(first.newUpdates, 1);
  assert.equal(second.newCases, 0);
  assert.equal(second.newUpdates, 0);
  assert.equal(issues.listAllIssueReports().length, 0);

  const summary = history.getHistoricalArchiveSummary();
  assert.equal(summary.caseCount, 1);
  assert.equal(summary.updateCount, 1);
  assert.equal(summary.attachmentCount, 1);
  assert.equal(summary.eventCount, 1);

  const search = history.listHistoricalCases({ query: "speed bump" });
  assert.equal(search.total, 1);
  assert.equal(search.cases[0].externalItemId, "12603029194");
  assert.equal(search.cases[0].rawStatus, "Needs follow up");

  const updates = history.listHistoricalCaseUpdates(search.cases[0].id);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].authorName, "Karl-Eugene Boehm");

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
  assert.equal(history.getHistoricalArchiveSummary().storedAttachmentCount, 1);
});
