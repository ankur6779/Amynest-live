/**
 * Static source assertions — Talk-with-Amy must not stamp the free first-use
 * clock before child ownership is confirmed (child_not_found must not burn days).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../routes");
const src = readFileSync(join(root, "speech-converse.ts"), "utf8");

describe("Talk converse first-use stamp ordering", () => {
  it("stamps only after child_not_found ownership check", () => {
    const handlerIdx = src.indexOf('router.post("/speech/converse"');
    assert.ok(handlerIdx >= 0);
    const handler = src.slice(handlerIdx, handlerIdx + 4000);
    const childCheckIdx = handler.indexOf('error: "child_not_found"');
    const stampIdx = handler.indexOf("stampFirstUse: true");
    assert.ok(childCheckIdx >= 0, "child_not_found check must exist");
    assert.ok(stampIdx >= 0, "stampFirstUse must exist on POST converse");
    assert.ok(
      childCheckIdx < stampIdx,
      "first-use stamp must run only after child_not_found ownership check",
    );
    const preCheckBlock = handler.slice(0, childCheckIdx);
    assert.doesNotMatch(preCheckBlock, /stampFirstUse:\s*true/);
  });

  it("still stamps exactly once on POST and peeks on memory GET", () => {
    assert.equal((src.match(/stampFirstUse: true/g) ?? []).length, 1);
    assert.match(src, /await resolveConversationBudget\(userId\);/);
  });
});
