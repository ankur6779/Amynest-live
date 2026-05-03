import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineItem } from "../notificationContentBuilder";

test("buildRoutineItem produces a deterministic dedup key", () => {
  const out = buildRoutineItem({
    childName: "Maya",
    childId: 1,
    routineId: 7,
    itemIndex: 2,
    itemTime: "8:00 AM",
    activity: "Breakfast",
    date: "2025-01-15",
  });
  assert.equal(out.dedupKey, "routine_item:7:2:2025-01-15");
  assert.equal(out.title, "Breakfast at 8:00 AM");
  assert.match(out.body, /Maya/);
  assert.equal(out.deepLink, "/routine");
});
