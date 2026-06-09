import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("POST /children free-tier limit race safety", () => {
  it("serializes count check and insert under per-user advisory xact lock", () => {
    const src = readFileSync(join(__dirname, "children.ts"), "utf8");
    const postBlock = src.slice(src.indexOf('router.post(\n  "/children"'));
    assert.match(postBlock, /pg_advisory_xact_lock/);
    assert.match(postBlock, /child_create:\$\{userId\}/);
    assert.match(postBlock, /insertChildRow\(insertData, tx\)/);
    assert.doesNotMatch(
      postBlock.slice(0, postBlock.indexOf("db.transaction")),
      /FREE_LIMITS\.childrenMax/,
    );
  });
});
