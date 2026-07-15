import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("prefers exact managed routing rules over legacy category aliases", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "d7-routing-test-"));
  process.env.DATA_DIR = dataDir;

  const repository = await import("../src/lib/issues-repository");
  repository.listManagedRoutingRules();
  const database = new Database(path.join(dataDir, "issues.db"));
  const now = new Date().toISOString();

  database.exec("delete from routing_rules");
  database
    .prepare(
      `insert into routing_rules (
        id, category, municipality_name, agency_id, owner_label, staff_guidance,
        resident_explanation, escalation_notes, created_at, updated_at
      ) values (?, ?, null, null, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "legacy-trees",
      "Trees",
      "Urban forestry / public works / property owner",
      "Legacy tree guidance.",
      "Legacy tree explanation.",
      "Legacy tree escalation.",
      now,
      now,
    );
  database
    .prepare(
      `insert into routing_rules (
        id, category, municipality_name, agency_id, owner_label, staff_guidance,
        resident_explanation, escalation_notes, created_at, updated_at
      ) values (?, ?, null, null, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "exact-other",
      "Other / unsure",
      "District 7 constituent services triage",
      "Review manually.",
      "Staff will review the report.",
      "Look for life-safety language.",
      now,
      now,
    );
  database.close();

  const rule = repository.getManagedRoutingRule("Other / unsure");

  assert.equal(rule?.category, "Other / unsure");
  assert.equal(rule?.ownerLabel, "District 7 constituent services triage");
});
