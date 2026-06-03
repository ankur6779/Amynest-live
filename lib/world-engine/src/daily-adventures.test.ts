import assert from "node:assert/strict";
import { test } from "node:test";
import {
  recordDailyAdventureEvent,
  type DailyAdventureProgress,
} from "./daily-adventures.js";

const LISTEN_PROGRESS: DailyAdventureProgress = {
  dateKey: "2026-06-03",
  tasks: [
    {
      id: "listen",
      kind: "listen_sounds",
      label: "Listen",
      emoji: "👂",
      target: 5,
    },
  ],
  completed: {},
};

const QUIZ_PROGRESS: DailyAdventureProgress = {
  dateKey: "2026-06-03",
  tasks: [
    {
      id: "quiz",
      kind: "quiz_correct",
      label: "Quiz",
      emoji: "❓",
      target: 2,
    },
  ],
  completed: {},
};

test("recordDailyAdventureEvent accumulates sequential listen events from fresh base", () => {
  let progress = LISTEN_PROGRESS;
  for (let i = 0; i < 5; i++) {
    const result = recordDailyAdventureEvent(progress, "listen_sounds");
    progress = result.progress;
  }
  assert.equal(progress.completed.listen, 5);
});

test("recordDailyAdventureEvent does not drop increments when base is reloaded each time", () => {
  let stored = QUIZ_PROGRESS;
  for (let i = 0; i < 3; i++) {
    const result = recordDailyAdventureEvent(stored, "quiz_correct");
    stored = result.progress;
  }
  assert.equal(stored.completed.quiz, 2);
});
