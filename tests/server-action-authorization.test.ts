import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ACTION_FILES = [
  "analytics.ts",
  "events.ts",
  "issues.ts",
  "notifications.ts",
  "routing.ts",
];

test("every staff mutation enforces an active signed-in staff identity", () => {
  for (const fileName of ACTION_FILES) {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "server-actions", fileName),
      "utf8",
    );
    const actionSegments = source
      .split(/(?=export async function )/g)
      .filter((segment) => segment.startsWith("export async function "));

    assert.ok(actionSegments.length > 0, `${fileName} should export staff actions`);
    for (const segment of actionSegments) {
      const actionName = segment.match(/^export async function ([^(]+)/)?.[1];
      assert.match(
        segment,
        /await (?:getStaffActionActor|requireStaffActionActor)\(/,
        `${fileName}:${actionName ?? "unknown action"} must enforce staff identity`,
      );
    }
  }
});

test("case audit writes use the signed-in actor instead of a generic label", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src", "server-actions", "issues.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /actorLabel:\s*["']Staff(?: intake board)?["']/);
  assert.match(source, /actorLabel:\s*actor\.actorLabel/g);
});
