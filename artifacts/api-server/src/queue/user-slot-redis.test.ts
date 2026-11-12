import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

describe("user slot redis atomicity", () => {
  it("uses Lua eval for acquire and release (no separate INCR+EXPIRE)", () => {
    const src = readFileSync(join(__dir, "job-results.ts"), "utf8");
    assert.match(src, /ACQUIRE_USER_SLOT_LUA/);
    assert.match(src, /RELEASE_USER_SLOT_LUA/);
    assert.match(src, /redis\.eval\([\s\S]*ACQUIRE_USER_SLOT_LUA/);
    assert.match(src, /redis\.eval\([\s\S]*RELEASE_USER_SLOT_LUA/);
    const acquireBlock = src.slice(
      src.indexOf("export async function tryAcquireUserSlot"),
      src.indexOf("export async function releaseUserSlot"),
    );
    assert.doesNotMatch(acquireBlock, /redis\.incr/);
    assert.doesNotMatch(acquireBlock, /redis\.expire/);
  });

  it("acquire script rolls back when over the per-user cap", () => {
    const src = readFileSync(join(__dir, "job-results.ts"), "utf8");
    const luaStart = src.indexOf("ACQUIRE_USER_SLOT_LUA");
    const lua = src.slice(luaStart, src.indexOf("`;", luaStart));
    assert.match(lua, /redis\.call\('DECR'/);
    assert.match(lua, /return 0/);
  });

  it("release script deletes the key when count reaches zero", () => {
    const src = readFileSync(join(__dir, "job-results.ts"), "utf8");
    const luaStart = src.indexOf("RELEASE_USER_SLOT_LUA");
    const lua = src.slice(luaStart, src.indexOf("`;", luaStart));
    assert.match(lua, /redis\.call\('DEL'/);
  });
});
