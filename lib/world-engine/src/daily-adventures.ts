import type { WorldId } from "./types.js";
import type { WorldManifestItem } from "./manifest-types.js";

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

const TASK_POOL: Array<Omit<DailyAdventureTask, "id">> = [
  { kind: "listen_sounds", label: "Listen to sounds", emoji: "👂", target: 5 },
  { kind: "quiz_correct", label: "Quiz answers", emoji: "❓", target: 2 },
  { kind: "hear_find_correct", label: "Hear & Find wins", emoji: "🎯", target: 3 },
  { kind: "discovery_slides", label: "Discovery slides", emoji: "✨", target: 4 },
  { kind: "open_items", label: "Explore items", emoji: "🧭", target: 3 },
];

function dateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic daily seed — same child sees same tasks per day per world. */
function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function buildDailyAdventure(
  worldId: WorldId,
  childId: number,
  items: WorldManifestItem[],
  day = dateKey(),
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
  const today = dateKey();
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

export function dailyAdventureCompletionPct(progress: DailyAdventureProgress): number {
  if (progress.tasks.length === 0) return 0;
  const done = progress.tasks.filter((t) => (progress.completed[t.id] ?? 0) >= t.target).length;
  return Math.round((done / progress.tasks.length) * 100);
}
