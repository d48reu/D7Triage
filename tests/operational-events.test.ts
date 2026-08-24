import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("operational events retain diagnostics without form contents", async () => {
  process.env.DATA_DIR = mkdtempSync(
    path.join(os.tmpdir(), "d7-operational-events-"),
  );
  const operations = await import("../src/lib/operational-events");
  const event = operations.recordOperationalEvent({
    eventType: "intake save",
    severity: "error",
    action: "autosave case",
    outcome: "failed",
    errorCode: "server action transport",
    route:
      "/staff/reports/5e621f85-8c29-45d5-98d1-c5be513fe339?resident=Private+Name",
    browserFamily: "Edge 140",
    viewportWidth: 1366,
    viewportHeight: 768,
    release: "test-release",
  });

  assert.equal(event.eventType, "intake_save");
  assert.equal(event.action, "autosave_case");
  assert.equal(event.route, "/staff/reports/:id");
  assert.equal(event.browserFamily, "Edge_140");
  assert.equal(event.viewportWidth, 1366);
  assert.equal(event.viewportHeight, 768);

  const stored = operations.listOperationalEvents(10);
  assert.equal(stored.length, 1);
  assert.equal(JSON.stringify(stored).includes("Private"), false);
  assert.equal(operations.getOperationalEventSummary(7).failed, 1);
});
