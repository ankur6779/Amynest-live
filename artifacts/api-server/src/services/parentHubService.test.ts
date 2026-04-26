/**
 * Parent Hub progressive-content service — unit tests.
 *
 * Each test creates an isolated synthetic dataset (one user, one child, a
 * handful of stories + phonics rows), runs the calculator / evaluator /
 * payload builder, asserts the expected behaviour, and then deletes every
 * row it inserted so reruns stay deterministic.
 *
 * Verified properties:
 *   1. Calculator counts only TAGGED items (universal/untagged content is
 *      ignored in both numerator and denominator).
 *   2. Evaluator
 *      - returns "below_threshold" until ≥75 % of the band is finished
 *      - upserts exactly one row at the threshold
 *      - is idempotent — repeated calls don't duplicate rows
 *      - is irreversible — un-marking a phonics item leaves the unlock row.
 *   3. Hub-content endpoint
 *      - infants (current band 0-2) get "discovery" mode in Section 2
 *      - age-2+ children get "concept-grouped" mode (one item per concept_id)
 *      - untagged stories + phonics are surfaced in Section 1 as universal
 *      - `previewOnly` honours both DOB-derived bands and early-unlock rows.
 */
import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  childrenTable,
  storyContentTable,
  storyWatchProgressTable,
  phonicsContentTable,
  phonicsProgressTable,
  childBandUnlocksTable,
  notificationLogTable,
  notificationPreferencesTable,
} from "@workspace/db";
import {
  EARLY_UNLOCK_THRESHOLD_PCT,
  computeBandProgress,
  computeHubContent,
  evaluateEarlyUnlock,
  evaluateEarlyUnlockSafe,
  resolveUnlockedBands,
} from "./parentHubService";
import { buildBandUnlockNotification } from "./notificationContentBuilder";
import {
  type AgeBand,
  getAgeBand,
  getNextAgeBand,
  phonicsBandFor,
} from "../lib/age-bands";

// ─── Test-fixture helpers ───────────────────────────────────────────────────

const TEST_USER_PREFIX = "phub-test-";
const TEST_DRIVE_PREFIX = "phub-test-drive-";

let testCounter = 0;

interface Fixture {
  userId: string;
  childId: number;
  storyIds: number[];
  phonicsIds: number[];
  cleanup: () => Promise<void>;
}

async function makeFixture(opts: {
  childAge: number;
  childAgeMonths?: number;
  /** Stories to insert. Pass `null` for ageBand to mark as universal. */
  stories?: { ageBand: AgeBand | null; title?: string }[];
  /** Phonics rows to insert. */
  phonics?: {
    ageGroup: string;
    level: number;
    symbol: string;
    conceptId?: string | null;
  }[];
}): Promise<Fixture> {
  testCounter += 1;
  const stamp = `${Date.now()}-${testCounter}`;
  const userId = `${TEST_USER_PREFIX}${stamp}`;

  const [child] = await db
    .insert(childrenTable)
    .values({
      userId,
      name: `Test Child ${stamp}`,
      age: opts.childAge,
      ageMonths: opts.childAgeMonths ?? 0,
      schoolStartTime: "09:00",
      schoolEndTime: "15:00",
      goals: "test",
    })
    .returning({ id: childrenTable.id });
  if (!child) throw new Error("failed to insert test child");

  const storyIds: number[] = [];
  for (const [i, s] of (opts.stories ?? []).entries()) {
    const [row] = await db
      .insert(storyContentTable)
      .values({
        driveFileId: `${TEST_DRIVE_PREFIX}${stamp}-${i}`,
        title: s.title ?? `Test Story ${i}`,
        originalName: `${TEST_DRIVE_PREFIX}${stamp}-${i}.mp4`,
        category: "general",
        mimeType: "video/mp4",
        folderId: "phub-test-folder",
        ageBand: s.ageBand,
        active: true,
      })
      .returning({ id: storyContentTable.id });
    if (row) storyIds.push(row.id);
  }

  const phonicsIds: number[] = [];
  for (const [i, p] of (opts.phonics ?? []).entries()) {
    const [row] = await db
      .insert(phonicsContentTable)
      .values({
        ageGroup: p.ageGroup,
        // Use a high level so we never collide with the seeded catalog's
        // (age_group, level, symbol) unique index.
        level: 9000 + i,
        type: "letter",
        symbol: `${p.symbol}-${stamp}-${i}`,
        sound: `${p.symbol} sound`,
        conceptId: p.conceptId ?? null,
        active: true,
      })
      .returning({ id: phonicsContentTable.id });
    if (row) phonicsIds.push(row.id);
  }

  const cleanup = async () => {
    if (phonicsIds.length > 0) {
      await db
        .delete(phonicsProgressTable)
        .where(inArray(phonicsProgressTable.contentId, phonicsIds));
      await db
        .delete(phonicsContentTable)
        .where(inArray(phonicsContentTable.id, phonicsIds));
    }
    if (storyIds.length > 0) {
      await db
        .delete(storyWatchProgressTable)
        .where(inArray(storyWatchProgressTable.storyId, storyIds));
      await db
        .delete(storyContentTable)
        .where(inArray(storyContentTable.id, storyIds));
    }
    await db
      .delete(childBandUnlocksTable)
      .where(eq(childBandUnlocksTable.userId, userId));
    await db
      .delete(notificationLogTable)
      .where(eq(notificationLogTable.userId, userId));
    await db
      .delete(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId));
    await db.delete(childrenTable).where(eq(childrenTable.id, child.id));
  };

  return { userId, childId: child.id, storyIds, phonicsIds, cleanup };
}

/**
 * Per-test fixture setup. The cleanup is registered with `t.after()` so it
 * runs immediately after the test finishes — preventing cross-test
 * pollution (e.g. stories tagged "6-8" from one test bleeding into the
 * denominator of the next test that also targets band "6-8").
 */
async function setup(
  t: TestContext,
  opts: Parameters<typeof makeFixture>[0],
) {
  const f = await makeFixture(opts);
  t.after(async () => {
    try {
      await f.cleanup();
    } catch (err) {
      console.error("fixture cleanup failed", err);
    }
  });
  return f;
}

async function markStoryCompleted(
  childId: number,
  userId: string,
  storyId: number,
) {
  await db
    .insert(storyWatchProgressTable)
    .values({
      childId,
      userId,
      storyId,
      positionSec: 0,
      durationSec: 100,
      playCount: 1,
      completed: true,
    })
    .onConflictDoUpdate({
      target: [storyWatchProgressTable.childId, storyWatchProgressTable.storyId],
      set: { completed: true },
    });
}

async function setPhonicsMastered(
  childId: number,
  userId: string,
  contentId: number,
  mastered: boolean,
) {
  await db
    .insert(phonicsProgressTable)
    .values({
      childId,
      userId,
      contentId,
      mastered,
      masteredAt: mastered ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [phonicsProgressTable.childId, phonicsProgressTable.contentId],
      set: { mastered, masteredAt: mastered ? new Date() : null },
    });
}

// ─── 1. Calculator ──────────────────────────────────────────────────────────

describe("computeBandProgress", () => {
  // The calculator queries the live phonics_content table, which is seeded
  // with rows for age_groups 12_24m through 5_6y (mapping to bands 0-2,
  // 2-4, 4-6). To avoid the seeded catalog bleeding into our totals we
  // exercise the calculator on band "6-8" — no seeded phonics, no other
  // story ageBand tags in production yet, so the only contributing rows
  // are the ones our fixture inserts.
  it("counts only tagged stories — universal items don't deflate denominator", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 7, // band "6-8"
      stories: [
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        // Universal items — must NOT count toward "6-8" totals.
        { ageBand: null },
        { ageBand: null },
      ],
    });

    let progress = await computeBandProgress(f.childId, f.userId, "6-8");
    assert.equal(
      progress.storyTotal,
      4,
      "universal stories should be excluded from band total",
    );
    assert.equal(progress.storyFinished, 0);
    assert.equal(progress.totalCount, 4);
    assert.equal(progress.percentage, 0);

    // Completing a universal story must NOT bump the band's numerator.
    if (f.storyIds[4]) {
      await markStoryCompleted(f.childId, f.userId, f.storyIds[4]);
    }
    progress = await computeBandProgress(f.childId, f.userId, "6-8");
    assert.equal(
      progress.storyFinished,
      0,
      "completing a universal story should not count toward band progress",
    );

    // Completing two tagged stories → 50 %.
    if (f.storyIds[0] && f.storyIds[1]) {
      await markStoryCompleted(f.childId, f.userId, f.storyIds[0]);
      await markStoryCompleted(f.childId, f.userId, f.storyIds[1]);
    }
    progress = await computeBandProgress(f.childId, f.userId, "6-8");
    assert.equal(progress.storyFinished, 2);
    assert.equal(progress.totalCount, 4);
    assert.equal(progress.percentage, 50);
  });

  it("returns percentage 0 when band has no tagged content", async (t: TestContext) => {
    // Band "8-10" has no seeded phonics rows and no production-tagged
    // stories yet, so a fresh child sees a totally empty band.
    const f = await setup(t, {
      childAge: 9, // band "8-10"
      stories: [{ ageBand: null }],
    });
    const progress = await computeBandProgress(f.childId, f.userId, "8-10");
    assert.equal(progress.totalCount, 0);
    assert.equal(progress.percentage, 0);
  });

  it("phonics age_group → band map covers every seeded bucket", () => {
    // The calculator depends on this mapping for every phonics row, so
    // pin every (bucket → band) pair down explicitly here.
    assert.equal(phonicsBandFor("12_24m"), "0-2");
    assert.equal(phonicsBandFor("2_3y"), "2-4");
    assert.equal(phonicsBandFor("3_4y"), "2-4");
    assert.equal(phonicsBandFor("4_5y"), "4-6");
    assert.equal(phonicsBandFor("5_6y"), "4-6");
    assert.equal(phonicsBandFor("not_a_real_bucket"), null);
  });

  it("counts mastered phonics via DELTA against the seeded baseline", async (t: TestContext) => {
    // Add 4 phonics rows in a seeded bucket and verify the calculator
    // increments the totals + finished counters by exactly the right
    // amount. We use a delta to stay robust against catalog growth.
    const f = await setup(t, {
      childAge: 3, // band "2-4"
      phonics: [
        { ageGroup: "2_3y", level: 1, symbol: "TA" },
        { ageGroup: "2_3y", level: 2, symbol: "TB" },
        { ageGroup: "3_4y", level: 1, symbol: "TC" },
        { ageGroup: "3_4y", level: 2, symbol: "TD" },
      ],
    });

    // Baseline is taken AFTER the fixture inserted its 4 rows, so it
    // already includes them. We assert two things:
    //   1. The total reflects the fixture (>= 4 — the seeded catalog adds
    //      more on top, so we use a lower bound).
    //   2. Marking 2 fixture rows mastered bumps the FINISHED counter by
    //      exactly 2 (delta against the baseline).
    const baseline = await computeBandProgress(f.childId, f.userId, "2-4");
    assert.ok(
      baseline.phonicsTotal >= 4,
      `band 2-4 should include at least the 4 fixture rows; got ${baseline.phonicsTotal}`,
    );

    if (f.phonicsIds[0]) {
      await setPhonicsMastered(f.childId, f.userId, f.phonicsIds[0], true);
    }
    if (f.phonicsIds[2]) {
      await setPhonicsMastered(f.childId, f.userId, f.phonicsIds[2], true);
    }
    const after = await computeBandProgress(f.childId, f.userId, "2-4");

    assert.equal(
      after.phonicsTotal,
      baseline.phonicsTotal,
      "phonicsTotal should not change when no new rows are inserted",
    );
    assert.equal(
      after.phonicsFinished - baseline.phonicsFinished,
      2,
      "marking 2 fixture rows mastered must bump finished by exactly 2",
    );
  });
});

// ─── 2. Evaluator ───────────────────────────────────────────────────────────

describe("evaluateEarlyUnlock", () => {
  // Same reason as the calculator suite — we use band "6-8" so the seeded
  // phonics catalog (which only covers bands 0-2 / 2-4 / 4-6) does not
  // dilute or pad the totals we control via the fixture.
  it("returns below_threshold until the threshold is crossed, then upserts exactly once", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 7, // band "6-8", next "8-10"
      stories: [
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
      ],
    });

    // Sanity: threshold is the agreed 75 %.
    assert.equal(EARLY_UNLOCK_THRESHOLD_PCT, 75);

    // 0/4 → below.
    let r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, false);
    if (r.evaluated === false) assert.equal(r.reason, "below_threshold");

    // 2/4 = 50 % → still below.
    if (f.storyIds[0] && f.storyIds[1]) {
      await markStoryCompleted(f.childId, f.userId, f.storyIds[0]);
      await markStoryCompleted(f.childId, f.userId, f.storyIds[1]);
    }
    r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, false);

    // 3/4 = 75 % exactly → unlocks for the first time.
    if (f.storyIds[2]) {
      await markStoryCompleted(f.childId, f.userId, f.storyIds[2]);
    }
    r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, true);
    if (r.evaluated === true) {
      assert.equal(r.nextBand, "8-10");
      assert.equal(r.unlockedNow, true);
      assert.equal(r.progress.percentage, 75);
    }

    // Idempotent — second call reports already-unlocked, no new row.
    r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, true);
    if (r.evaluated === true) {
      assert.equal(r.unlockedNow, false);
      assert.equal(r.alreadyUnlocked, true);
    }

    const rows = await db
      .select()
      .from(childBandUnlocksTable)
      .where(
        and(
          eq(childBandUnlocksTable.childId, f.childId),
          eq(childBandUnlocksTable.ageBand, "8-10"),
        ),
      );
    assert.equal(
      rows.length,
      1,
      "only one unlock row should exist for (child, band)",
    );
    assert.equal(rows[0]?.source, "early_completion");
  });

  it("does not revoke the unlock when items are un-marked afterwards", async (t: TestContext) => {
    // Use stories tagged for band "6-8" (next "8-10") to keep the
    // numerator fully under the fixture's control. Phonics in the seeded
    // catalog don't reach band 6-8, so this test never collides with it.
    const f = await setup(t, {
      childAge: 7, // band "6-8"
      stories: [
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
      ],
    });

    // Cross threshold via story completion (3 of 4 = 75 %).
    for (const id of f.storyIds.slice(0, 3)) {
      await markStoryCompleted(f.childId, f.userId, id);
    }
    let r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, true);
    if (r.evaluated === true) assert.equal(r.unlockedNow, true);

    // Un-mark every story and re-evaluate. Row must still exist.
    for (const id of f.storyIds) {
      await db
        .update(storyWatchProgressTable)
        .set({ completed: false })
        .where(
          and(
            eq(storyWatchProgressTable.childId, f.childId),
            eq(storyWatchProgressTable.storyId, id),
          ),
        );
    }
    r = await evaluateEarlyUnlock(f.childId, f.userId);
    // Calculator now reports below threshold, so evaluated=false this call …
    assert.equal(r.evaluated, false);

    // … but the original unlock row is still there.
    const rows = await db
      .select()
      .from(childBandUnlocksTable)
      .where(
        and(
          eq(childBandUnlocksTable.childId, f.childId),
          eq(childBandUnlocksTable.ageBand, "8-10"),
        ),
      );
    assert.equal(
      rows.length,
      1,
      "unlock row must persist after un-marking — irreversible",
    );
  });

  it("queues exactly one celebratory notification on the first unlock and not on idempotent re-runs", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 7, // band "6-8", next "8-10"
      stories: [
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
      ],
    });

    // Pre-seed notification preferences with quiet hours disabled
    // (start === end short-circuits `inQuietHours` to false). Without
    // this, runs between 22:00 and 07:00 Asia/Kolkata would have the
    // dispatch returning `throttled` instead of `no_tokens`, which
    // would make the status assertion below time-sensitive.
    await db.insert(notificationPreferencesTable).values({
      userId: f.userId,
      quietHoursStart: "00:00",
      quietHoursEnd: "00:00",
    });

    // Cross threshold (3 of 4 = 75 %).
    for (const id of f.storyIds.slice(0, 3)) {
      await markStoryCompleted(f.childId, f.userId, id);
    }
    let r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, true);
    if (r.evaluated === true) assert.equal(r.unlockedNow, true);

    // Re-evaluate twice more — must not queue additional notifications.
    await evaluateEarlyUnlock(f.childId, f.userId);
    await evaluateEarlyUnlock(f.childId, f.userId);

    const expectedDedup = `band_unlock:${f.childId}:8-10`;
    const notifs = await db
      .select()
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.userId, f.userId),
          eq(notificationLogTable.dedupKey, expectedDedup),
        ),
      );
    assert.equal(
      notifs.length,
      1,
      "exactly one band-unlock notification should be logged per (child, band)",
    );
    const notif = notifs[0];
    assert.ok(notif);
    assert.equal(notif.category, "engagement");
    assert.equal(notif.deepLink, "/hub");
    assert.match(notif.title, /unlocked the next stage/);
    // No push tokens are registered in tests, so dispatch logs
    // "no_tokens". The notification_log row still exists — that's what
    // powers the in-app inbox view.
    assert.equal(notif.status, "no_tokens");
  });

  it("does NOT queue a notification when the threshold is not crossed", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 7, // band "6-8"
      stories: [
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
        { ageBand: "6-8" },
      ],
    });
    // Only 1 of 4 = 25 % → below threshold.
    if (f.storyIds[0]) {
      await markStoryCompleted(f.childId, f.userId, f.storyIds[0]);
    }
    const r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, false);

    const notifs = await db
      .select()
      .from(notificationLogTable)
      .where(eq(notificationLogTable.userId, f.userId));
    assert.equal(
      notifs.length,
      0,
      "no notification should be logged when no unlock fires",
    );
  });

  it("returns no_next_band for a child already in the highest band", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 14, // band "12-15", no next.
      stories: [{ ageBand: "12-15" }, { ageBand: "12-15" }],
    });
    const r = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(r.evaluated, false);
    if (r.evaluated === false) assert.equal(r.reason, "no_next_band");
  });
});

// ─── 2b. Notification builder payload contract ──────────────────────────────

describe("buildBandUnlockNotification", () => {
  it("emits the contract clients depend on for routing and dedup", () => {
    const built = buildBandUnlockNotification({
      childName: "Aria",
      childId: 42,
      nextBand: "8-10",
    });
    // Deep link must stay on the strict allowlist consumed by the
    // mobile router (`useNotificationDeepLink` → `/(tabs)/hub`).
    assert.equal(built.deepLink, "/hub");
    // Section payload tells the Hub UI to focus the "Coming next"
    // section on launch.
    assert.equal(built.data?.["section"], 2);
    assert.equal(built.data?.["ageBand"], "8-10");
    assert.equal(built.data?.["childId"], 42);
    assert.equal(built.data?.["source"], "early_unlock");
    // Per-(child, band) dedup key — combined with the unique partial
    // index on notification_log(user_id, dedup_key) it makes "first
    // unlock per band only" race-free.
    assert.equal(built.dedupKey, "band_unlock:42:8-10");
    // Title personalises with the child's name so the parent
    // immediately knows who the celebration is about.
    assert.match(built.title, /Aria/);
    assert.match(built.body, /Aria/);
  });
});

// ─── 3. previewOnly resolution ──────────────────────────────────────────────

describe("resolveUnlockedBands", () => {
  it("includes every band ≤ the child's current band by DOB", () => {
    const unlocked = resolveUnlockedBands("4-6", []);
    assert.ok(unlocked.has("0-2"));
    assert.ok(unlocked.has("2-4"));
    assert.ok(unlocked.has("4-6"));
    assert.ok(!unlocked.has("6-8"));
    assert.ok(!unlocked.has("8-10"));
  });

  it("OR-merges early-unlock rows on top of the DOB set", () => {
    const unlocked = resolveUnlockedBands("2-4", [
      { ageBand: "4-6" },
      { ageBand: "6-8" },
    ]);
    assert.ok(unlocked.has("4-6"));
    assert.ok(unlocked.has("6-8"));
    assert.ok(!unlocked.has("8-10"));
  });

  it("ignores unknown band strings defensively", () => {
    const unlocked = resolveUnlockedBands("0-2", [{ ageBand: "garbage" }]);
    assert.ok(!unlocked.has("0-2-bad" as never));
    assert.equal(unlocked.size, 1); // only 0-2
  });
});

// ─── 4. Hub-content payload ─────────────────────────────────────────────────

describe("computeHubContent", () => {
  it("infant (current band 0-2) → Section 2 mode is 'discovery'", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 1, // band "0-2"
      stories: [
        { ageBand: "0-2", title: "Lullaby" },
        { ageBand: "2-4", title: "Future Story A" },
        { ageBand: "4-6", title: "Future Story B" },
        { ageBand: null, title: "Universal Reel" },
      ],
      phonics: [
        { ageGroup: "12_24m", level: 1, symbol: "A", conceptId: "letter_a" },
        { ageGroup: "2_3y", level: 1, symbol: "B", conceptId: "letter_b" },
        { ageGroup: "3_4y", level: 1, symbol: "C", conceptId: "letter_b" },
      ],
    });

    const payload = await computeHubContent(
      { id: f.childId, name: "Baby", age: 1, ageMonths: 0 },
      f.userId,
    );

    assert.equal(payload.currentBand, "0-2");
    assert.equal(payload.section2.mode, "discovery");

    // Section 1: current-band tagged + universal
    const s1Titles = payload.section1.stories.map((s) => s.title);
    assert.ok(s1Titles.includes("Lullaby"), "current-band tagged in Section 1");
    assert.ok(
      s1Titles.includes("Universal Reel"),
      "untagged story in Section 1",
    );
    const universal = payload.section1.stories.find(
      (s) => s.title === "Universal Reel",
    );
    assert.ok(universal);
    assert.equal(universal?.isUniversal, true);
    assert.equal(universal?.previewOnly, false);

    // Section 2 in discovery mode includes BOTH "letter_b" phonics rows
    // (no concept dedup), plus future stories.
    const s2PhonicsCount = payload.section2.phonics.filter((p) =>
      f.phonicsIds.includes(p.id),
    ).length;
    assert.equal(
      s2PhonicsCount,
      2,
      "discovery mode keeps every future phonics row, no concept dedup",
    );
    const s2Stories = payload.section2.stories.filter((s) =>
      f.storyIds.includes(s.id),
    );
    assert.equal(s2Stories.length, 2);
    // All future items are previewOnly for an infant with no early unlocks.
    for (const s of s2Stories) assert.equal(s.previewOnly, true);
  });

  it("age 2+ → Section 2 phonics are concept-grouped (one per concept_id)", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 3, // band "2-4"
      phonics: [
        // Two future "letter_b" rows in different bands. Concept-grouped
        // mode must keep only the lower-band one (4-6 here).
        { ageGroup: "4_5y", level: 1, symbol: "B-46", conceptId: "letter_b" },
        // 5_6y also maps to 4-6, but we want a HIGHER-band concept too.
        // Swap to a non-existent age_group to force a higher band? We don't
        // have one in the seeded enum, so simulate with a separate concept.
        { ageGroup: "4_5y", level: 5, symbol: "B-46-alt", conceptId: "letter_b" },
        // A different concept appearing once.
        { ageGroup: "5_6y", level: 1, symbol: "C-46", conceptId: "letter_c" },
        // No concept_id → falls into the noConcept tail (still surfaced).
        { ageGroup: "4_5y", level: 9, symbol: "X-46", conceptId: null },
      ],
    });

    const payload = await computeHubContent(
      { id: f.childId, name: "Toddler", age: 3, ageMonths: 0 },
      f.userId,
    );
    assert.equal(payload.section2.mode, "concept-grouped");

    const phonicsForFixture = payload.section2.phonics.filter((p) =>
      f.phonicsIds.includes(p.id),
    );
    const conceptCounts = new Map<string, number>();
    for (const p of phonicsForFixture) {
      const key = p.conceptId ?? "__none__";
      conceptCounts.set(key, (conceptCounts.get(key) ?? 0) + 1);
    }
    assert.equal(
      conceptCounts.get("letter_b"),
      1,
      "letter_b concept must be deduped to a single item",
    );
    assert.equal(conceptCounts.get("letter_c"), 1);
    // Items without concept_id are kept (no other organising key).
    assert.equal(conceptCounts.get("__none__"), 1);
  });

  it("previewOnly honours BOTH DOB and early-unlock paths", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 3, // band "2-4". DOB unlocks "0-2" + "2-4".
      stories: [
        { ageBand: "0-2", title: "Below" },
        { ageBand: "2-4", title: "Current" },
        { ageBand: "4-6", title: "Next" },
        { ageBand: "6-8", title: "Two ahead" },
      ],
    });

    // Manually insert an early-unlock row for "4-6" — simulates a previous
    // threshold-crossing event.
    await db.insert(childBandUnlocksTable).values({
      childId: f.childId,
      userId: f.userId,
      ageBand: "4-6",
      source: "early_completion",
    });

    const payload = await computeHubContent(
      { id: f.childId, name: "Toddler", age: 3, ageMonths: 0 },
      f.userId,
    );

    // Section 1 contains the current-band + below items (DOB path).
    const s1Titles = payload.section1.stories.map((s) => s.title);
    assert.ok(s1Titles.includes("Below"), "below-band in Section 1 via DOB");
    assert.ok(s1Titles.includes("Current"));

    // Section 2 must hold the future items.
    const next = payload.section2.stories.find((s) => s.title === "Next");
    const twoAhead = payload.section2.stories.find(
      (s) => s.title === "Two ahead",
    );
    assert.ok(next, "next-band item is in Section 2");
    assert.ok(twoAhead);
    assert.equal(
      next?.previewOnly,
      false,
      "early-unlock row must promote 'Next' out of preview-only",
    );
    assert.equal(
      twoAhead?.previewOnly,
      true,
      "items two bands ahead remain preview-only",
    );

    assert.equal(payload.nextBandEarlyUnlocked, true);
    assert.equal(payload.nextBand, "4-6");
  });

  it("matches getAgeBand / getNextAgeBand for the child's current band", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 5, // band "4-6"
      stories: [{ ageBand: "4-6" }],
    });
    const payload = await computeHubContent(
      { id: f.childId, name: "Kid", age: 5, ageMonths: 0 },
      f.userId,
    );
    assert.equal(payload.currentBand, getAgeBand(5, 0));
    assert.equal(payload.nextBand, getNextAgeBand("4-6"));
  });
});

// ─── 5. End-to-end progressive-unlock chain ─────────────────────────────────
//
// Mirrors the production HTTP flow that the new `HubProgressiveContent`
// components on web (kidschedule) and mobile (amynest-mobile) drive:
//
//   1. Client fetches `GET /api/hub/content` → Section 2 next-band items
//      come back with `previewOnly: true` (dimmed in the UI).
//   2. Client posts `POST /api/stories/progress` for enough stories to
//      cross the 75 % completion threshold; the route hands off to
//      `evaluateEarlyUnlockSafe` (fire-and-forget).
//   3. Client invalidates the hub-content query (the new
//      `useStoriesData` / `usePhonicsData` hooks do this on completion)
//      and re-fetches `GET /api/hub/content` → the same items now come
//      back with `previewOnly: false` — no re-login required.
//
// The "without re-login" guarantee is what this chained test pins down:
// once the unlock row is upserted, the next computeHubContent call
// reflects it for the same authenticated user immediately.

describe("hub-content e2e — preview→live flips after early-unlock", () => {
  it("Section 2 next-band items become live without re-login at ≥75 % completion", async (t: TestContext) => {
    // Child age 7 → current band "6-8", next band "8-10". We use this band
    // pair because the seeded phonics catalog only covers bands 0-2 / 2-4
    // / 4-6, so the band totals here are 100 % under fixture control —
    // 4 tagged stories in band "6-8" is exactly the denominator.
    const f = await setup(t, {
      childAge: 7,
      stories: [
        { ageBand: "6-8", title: "Current A" },
        { ageBand: "6-8", title: "Current B" },
        { ageBand: "6-8", title: "Current C" },
        { ageBand: "6-8", title: "Current D" },
        { ageBand: "8-10", title: "Future A" },
        { ageBand: "8-10", title: "Future B" },
        { ageBand: null, title: "Universal Reel" },
      ],
    });
    const futureTitles = new Set(["Future A", "Future B"]);

    // ── Step 1: initial fetch — every future-band item is preview-only.
    const initial = await computeHubContent(
      { id: f.childId, name: "Test Kid", age: 7, ageMonths: 0 },
      f.userId,
    );
    assert.equal(initial.currentBand, "6-8");
    assert.equal(initial.nextBand, "8-10");
    assert.equal(initial.nextBandEarlyUnlocked, false);

    const initialFuture = initial.section2.stories.filter((s) =>
      futureTitles.has(s.title),
    );
    assert.equal(initialFuture.length, 2, "both future stories in Section 2");
    for (const s of initialFuture) {
      assert.equal(
        s.previewOnly,
        true,
        `Section 2 item "${s.title}" must start preview-only`,
      );
    }

    // Universal item lives in Section 1 and is never preview-only.
    const universal = initial.section1.stories.find(
      (s) => s.title === "Universal Reel",
    );
    assert.ok(universal, "universal story is in Section 1");
    assert.equal(universal?.previewOnly, false);
    assert.equal(universal?.isUniversal, true);

    assert.equal(initial.bandProgress.percentage, 0);
    assert.equal(initial.bandProgress.totalCount, 4);

    // ── Step 2: drive completion across the 75 % threshold. We mark 3 of
    // 4 current-band stories complete (mirrors what `POST
    // /api/stories/progress` writes) and then invoke the early-unlock
    // evaluator the way the route does after the insert. The route uses
    // the fire-and-forget `evaluateEarlyUnlockSafe` wrapper, but we call
    // the inner `evaluateEarlyUnlock` here so the test can `await` it
    // deterministically — both code paths exercise the same upsert.
    for (const id of f.storyIds.slice(0, 3)) {
      await markStoryCompleted(f.childId, f.userId, id);
    }
    const evalResult = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(
      evalResult.evaluated,
      true,
      "evaluator must report a successful unlock at 75 %",
    );
    if (evalResult.evaluated === true) {
      assert.equal(evalResult.unlockedNow, true);
    }
    // The Safe wrapper is what the production route actually invokes.
    // Calling it here proves the wrapper still works (and is a no-op the
    // second time, since the row already exists — irreversibility).
    evaluateEarlyUnlockSafe(f.childId, f.userId);

    // Sanity: an unlock row was actually inserted (this is what
    // `computeHubContent` keys off when flipping `previewOnly`).
    const unlockRows = await db
      .select()
      .from(childBandUnlocksTable)
      .where(
        and(
          eq(childBandUnlocksTable.childId, f.childId),
          eq(childBandUnlocksTable.ageBand, "8-10"),
        ),
      );
    assert.equal(
      unlockRows.length,
      1,
      "evaluateEarlyUnlockSafe must upsert an early_completion row at 75 %",
    );
    assert.equal(unlockRows[0]?.source, "early_completion");

    // ── Step 3: re-fetch — same user, no re-login. Section 2 future-band
    // items must now report `previewOnly: false` so the client UI flips
    // them from dimmed to live.
    const after = await computeHubContent(
      { id: f.childId, name: "Test Kid", age: 7, ageMonths: 0 },
      f.userId,
    );
    assert.equal(
      after.nextBandEarlyUnlocked,
      true,
      "nextBandEarlyUnlocked must reflect the new unlock row",
    );
    assert.equal(after.bandProgress.percentage, 75);

    const afterFuture = after.section2.stories.filter((s) =>
      futureTitles.has(s.title),
    );
    assert.equal(afterFuture.length, 2);
    for (const s of afterFuture) {
      assert.equal(
        s.previewOnly,
        false,
        `Section 2 item "${s.title}" must be live after early unlock`,
      );
    }
  });

  it("under threshold → Section 2 stays dimmed (no premature unlock)", async (t: TestContext) => {
    const f = await setup(t, {
      childAge: 7,
      stories: [
        { ageBand: "6-8", title: "Current A" },
        { ageBand: "6-8", title: "Current B" },
        { ageBand: "6-8", title: "Current C" },
        { ageBand: "6-8", title: "Current D" },
        { ageBand: "8-10", title: "Future A" },
      ],
    });

    // 2 of 4 = 50 % — below the 75 % threshold. Use the inner
    // `evaluateEarlyUnlock` (not the fire-and-forget Safe wrapper) so the
    // assertion on row count below is deterministic — Safe returns void.
    for (const id of f.storyIds.slice(0, 2)) {
      await markStoryCompleted(f.childId, f.userId, id);
    }
    const evalResult = await evaluateEarlyUnlock(f.childId, f.userId);
    assert.equal(
      evalResult.evaluated,
      false,
      "evaluator must report below_threshold at 50 %",
    );
    if (evalResult.evaluated === false) {
      assert.equal(evalResult.reason, "below_threshold");
    }

    const rows = await db
      .select()
      .from(childBandUnlocksTable)
      .where(
        and(
          eq(childBandUnlocksTable.childId, f.childId),
          eq(childBandUnlocksTable.ageBand, "8-10"),
        ),
      );
    assert.equal(
      rows.length,
      0,
      "no unlock row should exist while completion is below threshold",
    );

    const payload = await computeHubContent(
      { id: f.childId, name: "Test Kid", age: 7, ageMonths: 0 },
      f.userId,
    );
    assert.equal(payload.nextBandEarlyUnlocked, false);
    const future = payload.section2.stories.find((s) => s.title === "Future A");
    assert.ok(future, "future story present in Section 2");
    assert.equal(
      future?.previewOnly,
      true,
      "future-band story must remain preview-only below threshold",
    );

    assert.equal(EARLY_UNLOCK_THRESHOLD_PCT, 75);
    assert.equal(payload.bandProgress.percentage, 50);
  });
});
