import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "job-results.ts"),
  "utf8",
);

test("user slot acquire uses atomic Lua eval (no separate INCR+EXPIRE)", () => {
  assert.match(src, /ACQUIRE_USER_SLOT_LUA/);
  assert.match(src, /redis\.eval\(\s*ACQUIRE_USER_SLOT_LUA/);
  assert.doesNotMatch(
    src.slice(src.indexOf("export async function tryAcquireUserSlot")),
    /redis\.incr\(key\)/,
  );
});

test("user slot release uses atomic Lua eval", () => {
  assert.match(src, /RELEASE_USER_SLOT_LUA/);
  assert.match(src, /redis\.eval\(\s*RELEASE_USER_SLOT_LUA/);
});

test("Lua acquire script caps at MAX_USER_ACTIVE_JOBS", () => {
  assert.match(src, /if n <= tonumber\(ARGV\[2\]\)/);
  assert.match(src, /redis\.call\('DECR', KEYS\[1\]\)/);
});
