/**
 * Regression: limit exhaustion must not throw SpeechCoachV2SessionError *inside*
 * the DB transaction after charge/terminate writes — that rolls back the cap.
 *
 * We assert the source contract: after session row updates in validateAndTouchSession,
 * limit outcomes return `{ ok: false, ... }` and the throw happens after `db.transaction`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "speechCoachV2ActiveSessionService.ts"), "utf8");

test("validateAndTouchSession commits limit outcomes then throws outside the transaction", () => {
  const fnStart = source.indexOf("export async function validateAndTouchSession");
  assert.ok(fnStart >= 0, "validateAndTouchSession must exist");
  const nextExport = source.indexOf("\nexport async function", fnStart + 1);
  const body = source.slice(fnStart, nextExport > 0 ? nextExport : undefined);

  assert.match(
    body,
    /const outcome = await db\.transaction/,
    "limit path must capture transaction outcome",
  );
  assert.match(
    body,
    /if \(!outcome\.ok\) \{\s*throw new SpeechCoachV2SessionError/,
    "SessionError for limits must throw after the transaction commits",
  );

  // Inside the first-use / paid branches, limitReached must return ok:false — not throw.
  const firstUseLimit = body.indexOf("if (limitReached)");
  assert.ok(firstUseLimit >= 0);
  const sliceAfterFirstLimit = body.slice(firstUseLimit, firstUseLimit + 280);
  assert.match(sliceAfterFirstLimit, /return \{\s*ok: false/);
  assert.doesNotMatch(
    sliceAfterFirstLimit,
    /throw new SpeechCoachV2SessionError/,
    "must not throw SessionError inside txn on first limitReached",
  );
});
