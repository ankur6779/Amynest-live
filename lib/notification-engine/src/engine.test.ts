import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearPoolCacheForTests,
  getPoolSize,
  MIN_POOL_SIZES,
  warmContentPools,
} from "./index.js";
import { checkAntiRepetition } from "./memory/anti-repetition.js";
import type { HistoryEntry } from "./types.js";
import { contentHash } from "./personalization/context.js";

test("content pools meet minimum size targets", () => {
  clearPoolCacheForTests();
  warmContentPools();
  for (const [category, min] of Object.entries(MIN_POOL_SIZES)) {
    const size = getPoolSize(category as keyof typeof MIN_POOL_SIZES);
    assert.ok(
      size >= min,
      `${category} pool has ${size} items, expected >= ${min}`,
    );
  }
});

test("anti-repetition blocks same recommendation within 14 days", () => {
  const now = new Date();
  const history: HistoryEntry[] = [
    {
      category: "nutrition",
      title: "Snack",
      body: "Try makhana",
      contentHash: contentHash("Snack", "Try makhana"),
      topicKey: "snacks_crunchy",
      recommendationKey: "food_makhana_abc",
      theme: "food_makhana",
      sentAt: new Date(now.getTime() - 3 * 86400000),
      openedAt: null,
      dismissedAt: null,
    },
  ];
  const violation = checkAntiRepetition(
    {
      title: "New title",
      body: "Different body",
      recommendationKey: "food_makhana_abc",
      topicKey: "snacks_crunchy",
      theme: "food_makhana",
      category: "nutrition",
    },
    history,
    "2026-05-29",
    now,
  );
  assert.equal(violation?.rule, "recommendation");
});

test("anti-repetition blocks duplicate theme same day", () => {
  const now = new Date();
  const history: HistoryEntry[] = [
    {
      category: "parenting_tips",
      title: "Tip",
      body: "Body A",
      contentHash: "abc",
      topicKey: "autonomy",
      recommendationKey: "p1",
      theme: "choices",
      sentAt: now,
      openedAt: null,
      dismissedAt: null,
    },
  ];
  const violation = checkAntiRepetition(
    {
      title: "Tip 2",
      body: "Body B",
      recommendationKey: "p2",
      topicKey: "language",
      theme: "choices",
      category: "parenting_tips",
    },
    history,
    "2026-05-29",
    now,
  );
  assert.equal(violation?.rule, "daily_theme");
});
