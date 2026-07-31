import assert from "node:assert/strict";
import { test } from "node:test";
import { WorldEngine } from "./world-engine.js";
import { buildPlatformHearFindQuestion } from "./hear-find.js";
import { isValidWorldsLibraryObjectPath, worldsLibraryPlaybackCandidates, extractWorldsLibraryObjectPath } from "./gcs-layout.js";
import { getDiscoveryWorldDefinition } from "./registry.js";

test("WorldEngine resolves neighbors and categories", () => {
  const items = [
    { id: "a", name: "A", emoji: "🐮", category: "farm" },
    { id: "b", name: "B", emoji: "🐴", category: "farm" },
  ];
  const engine = new WorldEngine({
    worldId: "animal_world",
    catalog: { version: 1, worldId: "animal_world", items },
    modes: [{ id: "explore", label: "Explore" }],
  });
  assert.equal(engine.getNeighborIds("b").prev, "a");
});

test("vehicle GCS path validates for worlds-library", () => {
  const path = "worlds/vehicles/road/car/engine-01.mp3";
  assert.equal(isValidWorldsLibraryObjectPath("vehicle_world", path), true);
  assert.equal(isValidWorldsLibraryObjectPath("animal_world", path), false);
});

test("worlds library playback candidates prefer proxy then local mirror", () => {
  const proxy = "/api/worlds-library/worlds/vehicles/road/car/engine-01.mp3";
  const candidates = worldsLibraryPlaybackCandidates(proxy);
  assert.ok(candidates.includes(proxy));
  assert.ok(candidates.includes("/discovery-worlds-audio/worlds/vehicles/road/car/engine-01.mp3"));
});

test("extractWorldsLibraryObjectPath parses proxy and mirror URLs", () => {
  assert.equal(
    extractWorldsLibraryObjectPath("/api/worlds-library/worlds/nature/weather/rain/rain-01.mp3"),
    "worlds/nature/weather/rain/rain-01.mp3",
  );
  assert.equal(
    extractWorldsLibraryObjectPath("/discovery-worlds-audio/worlds/home/kitchen/blender/blend-01.mp3"),
    "worlds/home/kitchen/blender/blend-01.mp3",
  );
});

test("registry lists animal world as live reference", () => {
  const animal = getDiscoveryWorldDefinition("animal_world");
  assert.ok(animal?.referenceImplementation);
  assert.equal(animal?.routePath, "/animal-world");
});

test("platform hear-find builds question from manifest items", () => {
  const items = [
    {
      id: "cow",
      name: "Cow",
      category: "farm",
      emoji: "🐮",
      imageGcsPath: "x",
      quizSoundId: "moo",
      quizPrompt: "Moo",
      narration: { intro: "", introGcsPath: "a", soundCue: "", soundCueGcsPath: "b" },
      sounds: [{ id: "moo", label: "Moo", gcsPath: "c", durationSec: 1, waveform: [0.5] }],
    },
    {
      id: "dog",
      name: "Dog",
      category: "pets",
      emoji: "🐶",
      imageGcsPath: "x",
      quizSoundId: "bark",
      quizPrompt: "Woof",
      narration: { intro: "", introGcsPath: "a", soundCue: "", soundCueGcsPath: "b" },
      sounds: [{ id: "bark", label: "Bark", gcsPath: "d", durationSec: 1, waveform: [0.5] }],
    },
    {
      id: "cat",
      name: "Cat",
      category: "pets",
      emoji: "🐱",
      imageGcsPath: "x",
      quizSoundId: "meow",
      quizPrompt: "Meow",
      narration: { intro: "", introGcsPath: "a", soundCue: "", soundCueGcsPath: "b" },
      sounds: [{ id: "meow", label: "Meow", gcsPath: "e", durationSec: 1, waveform: [0.5] }],
    },
  ];
  const q = buildPlatformHearFindQuestion(items, { optionCount: 3 });
  assert.ok(q);
  assert.ok(q!.options.length >= 3);
});

test("computePlayStreak increments on consecutive days and resets otherwise", async () => {
  const { computePlayStreak, yesterdayDateKey } = await import("./streak.js");
  const today = "2026-07-31";
  const same = computePlayStreak({ streakDays: 3, lastPlayedDate: today }, today);
  assert.equal(same.changed, false);
  assert.equal(same.streakDays, 3);

  const cont = computePlayStreak(
    { streakDays: 3, lastPlayedDate: yesterdayDateKey(today) },
    today,
  );
  assert.equal(cont.changed, true);
  assert.equal(cont.streakDays, 4);

  const reset = computePlayStreak({ streakDays: 3, lastPlayedDate: "2026-07-20" }, today);
  assert.equal(reset.streakDays, 1);
});

test("buildHubDailyAdventure uses all worlds with content and 3-5 tasks", async () => {
  const { buildHubDailyAdventure, recordHubDailyAdventureEvent, dailyAdventureCompletionPct } =
    await import("./daily-adventures.js");

  const item = (id: string) => ({
    id,
    name: id,
    category: "cat",
    emoji: "⭐",
    imageGcsPath: "x",
    quizSoundId: "s1",
    quizPrompt: "p",
    narration: { intro: "", introGcsPath: "a", soundCue: "", soundCueGcsPath: "b" },
    sounds: [{ id: "s1", label: "S", gcsPath: "c", durationSec: 1, waveform: [0.5] }],
  });

  const worlds = [
    {
      worldId: "vehicle_world" as const,
      title: "Vehicle World",
      emoji: "🚗",
      items: [item("v1"), item("v2"), item("v3")],
    },
    {
      worldId: "nature_world" as const,
      title: "Nature Sounds",
      emoji: "🌧️",
      items: [item("n1"), item("n2"), item("n3")],
    },
    {
      worldId: "home_sounds_world" as const,
      title: "Home Sounds",
      emoji: "🏠",
      items: [],
    },
  ];

  const adventure = buildHubDailyAdventure(42, worlds, "2026-07-31");
  assert.ok(adventure.tasks.length >= 3 && adventure.tasks.length <= 5);
  assert.ok(adventure.tasks.every((t) => t.worldId !== "home_sounds_world"));
  assert.equal(dailyAdventureCompletionPct(adventure), 0);

  const first = adventure.tasks[0]!;
  const after = recordHubDailyAdventureEvent(adventure, first.worldId, first.kind, first.target);
  assert.ok((after.progress.completed[first.id] ?? 0) >= first.target);
  assert.ok(dailyAdventureCompletionPct(after.progress) > 0);
});
