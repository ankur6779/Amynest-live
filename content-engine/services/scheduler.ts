import {
  buildDayPlans,
  buildUploadTimestamp,
  getDefaultWeekCalendar,
} from "../calendar/index.js";
import type {
  ContentEngineConfig,
  ContentSchedule,
  ScheduledVideo,
  Topic,
  TopicHistoryEntry,
  WeekCalendar,
} from "../types/index.js";
import type { HistoryStore } from "./history-store.js";
import { selectTopic } from "./rotation-engine.js";

export interface ScheduleOptions {
  startDate: string;
  dayCount: number;
  config: ContentEngineConfig;
  topics: readonly Topic[];
  history: HistoryStore;
  calendar?: WeekCalendar;
  /** Persist selected topics into history (default true). */
  commitHistory?: boolean;
}

/**
 * Build a multi-day content schedule.
 * Uses calendar slots + 45-day rotation (when enabled).
 */
export function scheduleContent(options: ScheduleOptions): ContentSchedule {
  const {
    startDate,
    dayCount,
    config,
    topics,
    history,
    calendar = getDefaultWeekCalendar(),
    commitHistory = true,
  } = options;

  const windowDays = config.enabledFeatures.rotation
    ? config.rotationWindowDays
    : 0;

  const plans = buildDayPlans(startDate, dayCount, config, calendar);
  const videos: ScheduledVideo[] = [];
  const picked = new Set<string>();
  const pendingHistory: TopicHistoryEntry[] = [];

  for (const plan of plans) {
    for (const slot of plan.slots) {
      const selected = selectTopic(topics, history, plan.date, {
        windowDays,
        preferredCategories: slot.preferredCategories,
        preferredVideoStyles: slot.preferredVideoStyles,
        excludeTopicIds: picked,
      });

      // Soft fallback: drop style filter, then category filter.
      const topic =
        selected?.topic ??
        selectTopic(topics, history, plan.date, {
          windowDays,
          preferredCategories: slot.preferredCategories,
          excludeTopicIds: picked,
        })?.topic ??
        selectTopic(topics, history, plan.date, {
          windowDays,
          excludeTopicIds: picked,
        })?.topic;

      if (!topic) {
        throw new Error(
          `Unable to select a topic for ${plan.date} slot ${slot.slotId} — expand topic pool or shorten rotation window`,
        );
      }

      picked.add(topic.id);

      const scheduledUploadAt = buildUploadTimestamp(
        plan.date,
        config.uploadTime,
        config.timezone,
        slot.uploadOffsetMinutes ?? 0,
      );

      videos.push({
        date: plan.date,
        dayOfWeek: plan.dayOfWeek,
        slot,
        topic,
        scheduledUploadAt,
      });

      const entry: TopicHistoryEntry = {
        topicId: topic.id,
        usedAt: scheduledUploadAt,
        date: plan.date,
        slotId: slot.slotId,
        category: topic.category,
      };
      pendingHistory.push(entry);

      // Make subsequent same-day picks see this usage for rotation.
      if (commitHistory) {
        history.record(entry);
      }
    }
  }

  if (!commitHistory) {
    // no-op: pendingHistory unused when dry-run
    void pendingHistory;
  }

  return {
    timezone: config.timezone,
    generatedAt: new Date().toISOString(),
    videos,
  };
}
