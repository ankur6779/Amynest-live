import type { WorldId } from "./types.js";
import type { WorldManifestItem } from "./manifest-types.js";
import { todayDateKey } from "./streak.js";

export type DailyAdventureTaskKind =
  | "listen_sounds"
  | "quiz_correct"
  | "hear_find_correct"
  | "discovery_slides"
  | "open_items";

export type DailyAdventureTask = {
  id: string;
  kind: DailyAdventureTaskKind;
  label: string;
  emoji: string;
  target: number;
  /** Optional category filter for listen/open tasks */
  categoryId?: string;
};

export type DailyAdventureProgress = {
  dateKey: string;
  tasks: DailyAdventureTask[];
  completed: Record<string, number>;
};

export type DailyAdventureCompletion = {
  progress: DailyAdventureProgress;
  justCompletedTaskId: string | null;
  allComplete: boolean;
};

export type HubWorldCatalog = {
  worldId: WorldId;
  title: string;
  emoji: string;
  items: WorldManifestItem[];
};

export type HubDailyAdventureTask = DailyAdventureTask & {
  worldId: WorldId;
  worldTitle: string;
  worldEmoji: string;
};

export type HubDailyAdventureProgress = {
  dateKey: string;
  tasks: HubDailyAdventureTask[];
  completed: Record<string, number>;
};

export type HubDailyAdventureCompletion = {
  progress: HubDailyAdventureProgress;
  justCompletedTaskId: string | null;
  allComplete: boolean;
};

const TASK_POOL: Array<Omit<DailyAdventureTask, "id">> = [
  { kind: "listen_sounds", label: "Listen to sounds", emoji: "👂", target: 5 },
  { kind: "quiz_correct", label: "Quiz answers", emoji: "❓", target: 2 },
  { kind: "hear_find_correct", label: "Hear & Find wins", emoji: "🎯", target: 3 },
  { kind: "discovery_slides", label: "Discovery slides", emoji: "✨", target: 4 },
  { kind: "open_items", label: "Explore items", emoji: "🧭", target: 3 },
];

/** Deterministic daily seed — same child sees same tasks per day per world. */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function taskEligibleForWorld(
  kind: DailyAdventureTaskKind,
  items: WorldManifestItem[],
): boolean {
  if (items.length === 0) return false;
  if (kind === "quiz_correct" || kind === "hear_find_correct") return items.length >= 3;
  return true;
}

export function buildDailyAdventure(
  worldId: WorldId,
  childId: number,
  items: WorldManifestItem[],
  day = todayDateKey(),
): DailyAdventureProgress {
  const seed = hashSeed(`${worldId}:${childId}:${day}`);
  const tasks: DailyAdventureTask[] = [];
  const categories = [...new Set(items.map((i) => i.category))];

  for (let i = 0; i < 3; i++) {
    const template = TASK_POOL[(seed + i * 7) % TASK_POOL.length]!;
    const cat = categories.length > 0 ? categories[(seed + i) % categories.length] : undefined;
    const label =
      template.kind === "listen_sounds" && cat
        ? `Listen to ${template.target} sounds`
        : `${template.label} (${template.target})`;
    tasks.push({
      ...template,
      id: `${day}:${template.kind}:${i}`,
      label,
      categoryId: template.kind === "listen_sounds" || template.kind === "open_items" ? cat : undefined,
    });
  }

  return { dateKey: day, tasks, completed: {} };
}

export function loadDailyAdventureProgress(
  stored: DailyAdventureProgress | null,
  worldId: WorldId,
  childId: number,
  items: WorldManifestItem[],
): DailyAdventureProgress {
  const today = todayDateKey();
  if (!stored || stored.dateKey !== today) {
    return buildDailyAdventure(worldId, childId, items, today);
  }
  return stored;
}

export function recordDailyAdventureEvent(
  progress: DailyAdventureProgress,
  kind: DailyAdventureTaskKind,
  amount = 1,
): DailyAdventureCompletion {
  let justCompletedTaskId: string | null = null;
  const completed = { ...progress.completed };

  for (const task of progress.tasks) {
    if (task.kind !== kind) continue;
    const prev = completed[task.id] ?? 0;
    const next = Math.min(task.target, prev + amount);
    completed[task.id] = next;
    if (prev < task.target && next >= task.target) {
      justCompletedTaskId = task.id;
    }
  }

  const allComplete = progress.tasks.every((t) => (completed[t.id] ?? 0) >= t.target);
  return {
    progress: { ...progress, completed },
    justCompletedTaskId,
    allComplete,
  };
}

export function dailyAdventureCompletionPct(progress: DailyAdventureProgress | HubDailyAdventureProgress): number {
  if (progress.tasks.length === 0) return 0;
  const done = progress.tasks.filter((t) => (progress.completed[t.id] ?? 0) >= t.target).length;
  return Math.round((done / progress.tasks.length) * 100);
}

/**
 * Cross-world hub adventure: 3–5 tasks drawn from worlds that have catalog content.
 * Deterministic per child + day. Progress is tracked separately via hub storage.
 */
export function buildHubDailyAdventure(
  childId: number,
  worlds: HubWorldCatalog[],
  day = todayDateKey(),
): HubDailyAdventureProgress {
  const available = worlds.filter((w) => w.items.length > 0);
  if (available.length === 0) {
    return { dateKey: day, tasks: [], completed: {} };
  }

  const seed = hashSeed(`hub:${childId}:${day}`);
  const taskCount = Math.min(5, Math.max(3, Math.min(available.length + 1, 5)));
  const tasks: HubDailyAdventureTask[] = [];

  for (let i = 0; i < taskCount; i++) {
    const world = available[(seed + i * 3) % available.length]!;
    let template = TASK_POOL[(seed + i * 7) % TASK_POOL.length]!;
    // Prefer an eligible kind for this world's catalog size.
    for (let attempt = 0; attempt < TASK_POOL.length; attempt++) {
      const candidate = TASK_POOL[(seed + i * 7 + attempt) % TASK_POOL.length]!;
      if (taskEligibleForWorld(candidate.kind, world.items)) {
        template = candidate;
        break;
      }
    }
    if (!taskEligibleForWorld(template.kind, world.items)) continue;

    const categories = [...new Set(world.items.map((item) => item.category))];
    const cat = categories.length > 0 ? categories[(seed + i) % categories.length] : undefined;
    const label =
      template.kind === "listen_sounds"
        ? `Listen to ${template.target} sounds in ${world.title}`
        : `${template.label} in ${world.title}`;

    tasks.push({
      ...template,
      id: `${day}:${world.worldId}:${template.kind}:${i}`,
      label,
      categoryId:
        template.kind === "listen_sounds" || template.kind === "open_items" ? cat : undefined,
      worldId: world.worldId,
      worldTitle: world.title,
      worldEmoji: world.emoji,
    });
  }

  return { dateKey: day, tasks, completed: {} };
}

export function loadHubDailyAdventureProgress(
  stored: HubDailyAdventureProgress | null,
  childId: number,
  worlds: HubWorldCatalog[],
  day = todayDateKey(),
): HubDailyAdventureProgress {
  if (!stored || stored.dateKey !== day) {
    return buildHubDailyAdventure(childId, worlds, day);
  }
  // Keep stored task set for the day (stable); only date mismatch regenerates.
  return stored;
}

export function recordHubDailyAdventureEvent(
  progress: HubDailyAdventureProgress,
  worldId: WorldId,
  kind: DailyAdventureTaskKind,
  amount = 1,
): HubDailyAdventureCompletion {
  let justCompletedTaskId: string | null = null;
  const completed = { ...progress.completed };

  for (const task of progress.tasks) {
    if (task.worldId !== worldId || task.kind !== kind) continue;
    const prev = completed[task.id] ?? 0;
    const next = Math.min(task.target, prev + amount);
    completed[task.id] = next;
    if (prev < task.target && next >= task.target) {
      justCompletedTaskId = task.id;
    }
  }

  const allComplete =
    progress.tasks.length > 0 &&
    progress.tasks.every((t) => (completed[t.id] ?? 0) >= t.target);

  return {
    progress: { ...progress, completed },
    justCompletedTaskId,
    allComplete,
  };
}

export function hubDailyAdventureCompletedCount(progress: HubDailyAdventureProgress): {
  done: number;
  total: number;
} {
  const total = progress.tasks.length;
  const done = progress.tasks.filter((t) => (progress.completed[t.id] ?? 0) >= t.target).length;
  return { done, total };
}
