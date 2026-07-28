import type {
  RotationOptions,
  Topic,
  TopicHistoryEntry,
  TopicSelectionResult,
} from "../types/index.js";
import { daysBetweenUtc, type HistoryStore } from "./history-store.js";

const DEFAULT_WINDOW_DAYS = 45;

function lastUseByTopic(
  history: TopicHistoryEntry[],
): Map<string, TopicHistoryEntry> {
  const map = new Map<string, TopicHistoryEntry>();
  for (const entry of history) {
    const prev = map.get(entry.topicId);
    if (!prev || entry.date > prev.date || (entry.date === prev.date && entry.usedAt > prev.usedAt)) {
      map.set(entry.topicId, entry);
    }
  }
  return map;
}

function matchesPreferences(
  topic: Topic,
  options: RotationOptions,
): boolean {
  if (
    options.preferredCategories &&
    options.preferredCategories.length > 0 &&
    !options.preferredCategories.includes(topic.category)
  ) {
    return false;
  }
  if (
    options.preferredVideoStyles &&
    options.preferredVideoStyles.length > 0 &&
    !options.preferredVideoStyles.includes(topic.videoStyle)
  ) {
    return false;
  }
  return true;
}

function isBlockedByWindow(
  last: TopicHistoryEntry | undefined,
  asOfDate: string,
  windowDays: number,
): boolean {
  if (!last) return false;
  const days = daysBetweenUtc(last.date, asOfDate);
  return days >= 0 && days < windowDays;
}

function compareCandidates(
  a: Topic,
  b: Topic,
  lastUse: Map<string, TopicHistoryEntry>,
): number {
  const aLast = lastUse.get(a.id);
  const bLast = lastUse.get(b.id);
  const aUnused = !aLast;
  const bUnused = !bLast;
  if (aUnused !== bUnused) return aUnused ? -1 : 1;
  if (aLast && bLast && aLast.date !== bLast.date) {
    return aLast.date < bLast.date ? -1 : 1;
  }
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.id.localeCompare(b.id);
}

/**
 * Eligible topics: not used inside the rotation window, matching slot prefs,
 * and not already picked in the current scheduling pass.
 */
export function getEligibleTopics(
  topics: readonly Topic[],
  history: readonly TopicHistoryEntry[],
  asOfDate: string,
  options: RotationOptions,
): Topic[] {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const lastUse = lastUseByTopic([...history]);
  const exclude = options.excludeTopicIds ?? new Set<string>();

  return topics
    .filter((topic) => !exclude.has(topic.id))
    .filter((topic) => matchesPreferences(topic, options))
    .filter((topic) => !isBlockedByWindow(lastUse.get(topic.id), asOfDate, windowDays))
    .sort((a, b) => compareCandidates(a, b, lastUse));
}

/**
 * Pick the best topic for a slot.
 * Priority order: never-used → oldest eligible → highest priority.
 */
export function selectTopic(
  topics: readonly Topic[],
  store: HistoryStore,
  asOfDate: string,
  options: RotationOptions,
): TopicSelectionResult | null {
  const history = store.getEntries();
  const lastUse = lastUseByTopic(history);
  const eligible = getEligibleTopics(topics, history, asOfDate, options);
  if (eligible.length === 0) return null;

  const topic = eligible[0]!;
  const last = lastUse.get(topic.id);
  if (!last) {
    return { topic, reason: "unused", daysSinceLastUse: null };
  }
  return {
    topic,
    reason: "oldest-eligible",
    daysSinceLastUse: daysBetweenUtc(last.date, asOfDate),
  };
}

/** True when the topic was used within the rotation window ending at asOfDate. */
export function wasUsedWithinWindow(
  topicId: string,
  history: readonly TopicHistoryEntry[],
  asOfDate: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): boolean {
  const last = lastUseByTopic([...history]).get(topicId);
  return isBlockedByWindow(last, asOfDate, windowDays);
}

export function prioritizeUnused(
  topics: readonly Topic[],
  history: readonly TopicHistoryEntry[],
): Topic[] {
  const lastUse = lastUseByTopic([...history]);
  return [...topics].sort((a, b) => compareCandidates(a, b, lastUse));
}
