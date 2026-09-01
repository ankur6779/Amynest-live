/**
 * Offline schedule + queue unit tests (zero network / zero KIE).
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createInitialQueueState,
  loadQueue,
  peekNextGolden,
  saveQueue,
} from "./golden-queue.js";
import {
  buildIdempotencyKey,
  evaluateAtIstWallClock,
  listUpcomingOccurrences,
} from "./schedule.js";
import { runFactoryDryValidation } from "./runner.js";

describe("Content Factory schedule (IST every 3 days)", () => {
  it("fires Sep 2 2026 17:00 IST", () => {
    const d = evaluateAtIstWallClock("2026-09-02", "17:00");
    assert.equal(d.shouldRun, true);
    assert.match(d.occurrenceLocal ?? "", /2026-09-02 17:00/);
  });

  it("does not fire Sep 3 2026 17:00 IST", () => {
    const d = evaluateAtIstWallClock("2026-09-03", "17:00");
    assert.equal(d.shouldRun, false);
  });

  it("fires Sep 5 2026 17:00 IST", () => {
    const d = evaluateAtIstWallClock("2026-09-05", "17:00");
    assert.equal(d.shouldRun, true);
  });

  it("does not fire before DTSTART", () => {
    const d = evaluateAtIstWallClock("2026-09-01", "17:00");
    assert.equal(d.shouldRun, false);
  });

  it("lists upcoming including Sep 2 when before start", () => {
    const from = new Date("2026-08-31T10:00:00Z");
    const list = listUpcomingOccurrences(3, undefined, from);
    assert.ok(list[0]?.includes("2026-09-02"));
    assert.ok(list[1]?.includes("2026-09-05"));
    assert.ok(list[2]?.includes("2026-09-08"));
  });
});

describe("Content Factory golden queue", () => {
  it("starts at golden-014 after historical 001-013", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-factory-q-"));
    try {
      const path = join(dir, "q.json");
      saveQueue(path, createInitialQueueState());
      const q = loadQueue(path);
      const next = peekNextGolden(q);
      assert.equal(next.goldenScriptId, "golden-014");
      assert.equal(
        buildIdempotencyKey(next.goldenScriptId, "2026-09-02"),
        "amynest-golden-014-2026-09-02",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Content Factory dry-run", () => {
  it("PASS offline with 0 KIE video credits", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-factory-dry-"));
    try {
      const report = runFactoryDryValidation({
        dryRun: true,
        dataDir: dir,
        now: new Date("2026-08-31T12:00:00Z"),
      });
      assert.equal(report.kieVideoCalls, 0);
      assert.equal(report.kieVideoCredits, 0);
      assert.equal(report.nextGolden, "golden-014");
      assert.equal(report.overall, "PASS", JSON.stringify(report.checks.filter((c) => !c.ok)));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
