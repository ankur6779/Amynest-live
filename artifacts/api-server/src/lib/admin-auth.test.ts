import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAdminUser } from "./admin-auth.js";

describe("admin-auth", () => {
  it("returns false without user id", () => {
    assert.equal(isAdminUser(null), false);
    assert.equal(isAdminUser(undefined), false);
  });

  it("matches ADMIN_USER_IDS", () => {
    const prev = process.env.ADMIN_USER_IDS;
    process.env.ADMIN_USER_IDS = "uid-a, uid-b";
    assert.equal(isAdminUser("uid-a"), true);
    assert.equal(isAdminUser("uid-c"), false);
    process.env.ADMIN_USER_IDS = prev;
  });
});
