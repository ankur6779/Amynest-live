import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCorePhonicsInventory,
  mergePhonicsInventory,
  makeInventoryItem,
  auditPhonicsInventoryAgainstManifest,
  resetPhonicsAudioInventoryProvidersForTests,
} from "./phonics-audio-inventory.js";

describe("phonics-audio-inventory", () => {
  it("builds core inventory from audio catalog", () => {
    const items = buildCorePhonicsInventory();
    assert.ok(items.length >= 100);
    assert.ok(items.some((i) => i.type === "letter"));
    assert.ok(items.some((i) => i.type === "cvc"));
  });

  it("merges extended items without duplicate catalog keys", () => {
    resetPhonicsAudioInventoryProvidersForTests();
    const core = buildCorePhonicsInventory();
    const ext = [
      makeInventoryItem({
        text: "Unique audit sentence only.",
        category: "story_sentence",
        sourceFile: "test.ts",
      }),
    ];
    const merged = mergePhonicsInventory(core, ext);
    assert.equal(merged.length, core.length + 1);
    const keys = new Set(merged.map((i) => i.catalogKey));
    assert.equal(keys.size, merged.length);
  });

  it("audit detects missing manifest entries", () => {
    const items = [
      makeInventoryItem({
        text: "cat",
        category: "cvc",
        sourceFile: "test.ts",
        id: "cat",
      }),
    ];
    const report = auditPhonicsInventoryAgainstManifest(items, {});
    assert.equal(report.audioMissing, 1);
    assert.equal(report.coveragePct, 0);
    assert.equal(report.runtimeTtsRequired, 1);
  });

  it("audit passes when manifest has all urls", () => {
    const items = [
      makeInventoryItem({
        text: "cat",
        category: "cvc",
        sourceFile: "test.ts",
        id: "cat",
      }),
    ];
    const key = items[0]!.catalogKey;
    const report = auditPhonicsInventoryAgainstManifest(items, {
      [key]: {
        url: "https://storage.googleapis.com/bucket/phonics/cvc/cat.mp3",
        gcsPath: "phonics/cvc/cat.mp3",
      },
    });
    assert.equal(report.audioMissing, 0);
    assert.equal(report.coveragePct, 100);
  });
});
