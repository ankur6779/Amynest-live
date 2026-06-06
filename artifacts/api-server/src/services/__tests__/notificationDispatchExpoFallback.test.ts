/**
 * Regression guard: Expo transport failures must not abort FCM delivery.
 * Introduced after claim-before-send hardening (f6bc7431) returned early on
 * Expo errors, skipping web/Android/iOS tokens for mixed-token users.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dispatchPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../notificationDispatchService.ts",
);

test("Expo transport errors must not short-circuit FCM delivery paths", () => {
  const source = fs.readFileSync(dispatchPath, "utf8");
  assert.equal(
    source.includes('reason: "expo_error"'),
    false,
    "Expo transport failure must fall through to web/Android/iOS FCM sends",
  );
  assert.match(
    source,
    /Expo dispatch failed — continuing to other platforms/,
    "Expo catch block must log continuation to other platforms",
  );
});
