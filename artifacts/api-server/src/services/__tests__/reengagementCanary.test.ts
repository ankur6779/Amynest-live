import assert from "node:assert/strict";
import { test } from "node:test";
import { canaryUserIdAllowed } from "../reengagementNotificationService.js";

test("canary allowlist: empty env allows any uid", () => {
  assert.equal(canaryUserIdAllowed("abc123xyz", ""), true);
  assert.equal(canaryUserIdAllowed("abc123xyz", undefined), true);
});

test("canary allowlist: non-empty env allows only listed uids", () => {
  assert.equal(canaryUserIdAllowed("uid-a", "uid-a,uid-b"), true);
  assert.equal(canaryUserIdAllowed("uid-b", "uid-a, uid-b"), true);
  assert.equal(canaryUserIdAllowed("uid-c", "uid-a,uid-b"), false);
});
