import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVisualSequence,
  deriveSnapshots,
  specIsRenderable,
  specObjectCount,
} from "./visual-engine.js";

test("near_double builds the canonical action shape and lands on the answer", () => {
  const seq = buildVisualSequence({ kind: "near_double", small: 6 });
  assert.equal(seq.operation, "near_double");
  assert.equal(seq.result, 13);
  assert.equal(seq.equation, "6 + 7 = 13");
  assert.deepEqual(
    seq.steps.map((s) => s.action),
    ["show", "duplicate", "add", "merge", "celebrate"],
  );
});

test("addition merges both addends into the total", () => {
  const seq = buildVisualSequence({ kind: "addition", a: 5, b: 3 });
  const snaps = deriveSnapshots(seq);
  const last = snaps[snaps.length - 1];
  assert.equal(last.total, 8);
  assert.equal(last.objects.length, 8);
  assert.deepEqual([...new Set(last.objects.map((o) => o.container))], ["result"]);
  assert.equal(last.celebrate, true);
});

test("subtraction removes objects so the remaining count is correct", () => {
  const seq = buildVisualSequence({ kind: "subtraction", a: 15, b: 4 });
  const snaps = deriveSnapshots(seq);
  assert.equal(snaps[0].objects.length, 15);
  const last = snaps[snaps.length - 1];
  assert.equal(last.objects.length, 11);
  assert.equal(last.total, 11);
});

test("multiplication lays out rows and totals rows × per", () => {
  const seq = buildVisualSequence({ kind: "multiplication", rows: 3, per: 4 });
  const last = deriveSnapshots(seq).at(-1)!;
  assert.equal(last.total, 12);
  assert.equal(last.objects.length, 12);
  assert.deepEqual([...new Set(last.objects.map((o) => o.container))].sort(), [
    "row-0",
    "row-1",
    "row-2",
  ]);
});

test("division distributes evenly into baskets", () => {
  const seq = buildVisualSequence({ kind: "division", total: 12, groups: 3 });
  const last = deriveSnapshots(seq).at(-1)!;
  assert.equal(last.total, 4);
  const baskets = last.containers.filter((c) => c.role === "basket");
  assert.equal(baskets.length, 3);
  for (const b of baskets) {
    assert.equal(last.objects.filter((o) => o.container === b.id).length, 4);
  }
});

test("double duplicates the start set", () => {
  const last = deriveSnapshots(buildVisualSequence({ kind: "double", n: 7 })).at(-1)!;
  assert.equal(last.total, 14);
});

test("snapshot count matches step count and carries captions", () => {
  const seq = buildVisualSequence({ kind: "near_double", small: 6 });
  const snaps = deriveSnapshots(seq);
  assert.equal(snaps.length, seq.steps.length);
  assert.ok(snaps.every((s) => typeof s.caption === "string"));
});

test("renderability guard respects the object cap", () => {
  assert.equal(specObjectCount({ kind: "multiplication", rows: 4, per: 6 }), 24);
  assert.equal(specIsRenderable({ kind: "multiplication", rows: 4, per: 6 }), true);
  assert.equal(specIsRenderable({ kind: "multiplication", rows: 9, per: 9 }), false);
});

test("near_double carries cognition metadata + neighbour insight", () => {
  const seq = buildVisualSequence({ kind: "near_double", small: 6 });
  assert.equal(seq.meta?.strategy, "double_then_add_one");
  assert.equal(seq.meta?.insight, "neighbor_number");
  assert.equal(seq.meta?.insightLine, "7 is just 1 more than 6.");
  assert.ok(seq.meta?.praise);
  const snaps = deriveSnapshots(seq);
  // The "+1 more" emphasis must appear on the add step.
  assert.ok(snaps.some((s) => s.emphasisNote === "+1 more" && s.emphasisRelation === "neighbor"));
  // Every step exposes tokenized equation parts for semantic morphing.
  assert.ok(snaps.every((s) => Array.isArray(s.equationParts) && s.equationParts.length > 0));
  // Final equation collapses to the single result token.
  assert.deepEqual(snaps.at(-1)!.equationParts, [{ text: "13", role: "result" }]);
});

test("multiplication exposes repeated-addition tokens + skip counting", () => {
  const seq = buildVisualSequence({ kind: "multiplication", rows: 3, per: 4 });
  const snaps = deriveSnapshots(seq);
  // Repeated addition grows: 4 → 4+4 → 4+4+4.
  const thirdRow = snaps[2].equationParts!.filter((p) => p.role !== "op");
  assert.equal(thirdRow.length, 3);
  assert.ok(snaps.some((s) => s.narration?.includes("Skip count: 4, 8, 12")));
});

test("thinking narration is provided per step for Replay-Thinking mode", () => {
  const snaps = deriveSnapshots(buildVisualSequence({ kind: "near_double", small: 6 }));
  assert.ok(snaps.every((s) => typeof s.thinkingNarration === "string" && s.thinkingNarration.length > 0));
});
