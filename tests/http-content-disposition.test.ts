import assert from "node:assert/strict";
import test from "node:test";
import { inlineContentDisposition } from "../src/lib/http-content-disposition";

test("attachment disposition strips header and path control characters", () => {
  assert.equal(
    inlineContentDisposition('..\\folder/unsafe"\r\nX-Test: injected.jpg'),
    'inline; filename=".._folder_unsafe___X-Test: injected.jpg"',
  );
});

test("attachment disposition supplies a safe fallback name", () => {
  assert.equal(inlineContentDisposition("\r\n"), 'inline; filename="__"');
  assert.equal(inlineContentDisposition(""), 'inline; filename="attachment"');
});
