import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultWeekCalendar } from "../calendar/index.js";
import { loadDefaultConfig } from "../config/index.js";
import { getAllTopics } from "../topics/index.js";
import type { Topic } from "../types/index.js";
import { InMemoryHistoryStore } from "./history-store.js";
import { scheduleContent } from "./scheduler.js";
import { wasUsedWithinWindow } from "./rotation-engine.js";

describe("scheduler", () => {
  it("schedules multiple videos per day from the week calendar", () => {
    const config = loadDefaultConfig();
    const history = new InMemoryHistoryStore();
    // 2026-07-27 is a Monday
    const schedule = scheduleContent({
      startDate: "2026-07-27",
      dayCount: 1,
      config,
      topics: getAllTopics(),
      history,
      calendar: getDefaultWeekCalendar(),
    });

    assert.equal(schedule.videos.length, 3);
    assert.equal(schedule.videos[0]?.dayOfWeek, "monday");
    assert.equal(schedule.videos[0]?.slot.label, "Amy Astro");
    assert.equal(schedule.videos[1]?.slot.label, "Parenting");
    assert.equal(schedule.videos[2]?.slot.label, "App Feature");
    assert.equal(schedule.videos[0]?.topic.category, "Amy Astro");
  });

  it("never repeats a topic inside the generated schedule window", () => {
    const config = loadDefaultConfig();
    const history = new InMemoryHistoryStore();
    const schedule = scheduleContent({
      startDate: "2026-07-27",
      dayCount: 14,
      config,
      topics: getAllTopics(),
      history,
    });

    const ids = schedule.videos.map((v) => v.topic.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.ok(schedule.videos.length >= 14);
  });

  it("honors 45-day rotation against existing history", () => {
    const config = loadDefaultConfig();
    const topics = getAllTopics();
    const blocked = topics.find((t) => t.category === "Amy Astro");
    assert.ok(blocked);

    const history = new InMemoryHistoryStore([
      {
        topicId: blocked.id,
        date: "2026-07-01",
        usedAt: "2026-07-01T03:30:00.000Z",
        category: blocked.category,
      },
    ]);

    const schedule = scheduleContent({
      startDate: "2026-07-27",
      dayCount: 1,
      config,
      topics,
      history,
    });

    assert.ok(
      schedule.videos.every((v) => v.topic.id !== blocked.id),
      "recently used Amy Astro topic should not be rescheduled",
    );
    assert.equal(
      wasUsedWithinWindow(blocked.id, history.getEntries(), "2026-07-27", 45),
      true,
    );
  });

  it("writes history entries when commitHistory is true", () => {
    const config = loadDefaultConfig();
    const history = new InMemoryHistoryStore();
    const before = history.getEntries().length;
    scheduleContent({
      startDate: "2026-07-27",
      dayCount: 1,
      config,
      topics: getAllTopics() as Topic[],
      history,
      commitHistory: true,
    });
    assert.equal(history.getEntries().length, before + 3);
  });
});
