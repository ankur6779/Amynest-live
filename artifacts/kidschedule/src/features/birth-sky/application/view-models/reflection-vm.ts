/**
 * Reflection segment ViewModels (Pack 5 §7.2).
 */

import {
  fillPromptChild,
  promptForWeek,
  REFLECTION_PROMPTS,
  TRADITION_REFLECT_PROMPT,
  type ReflectionPromptDef,
} from "../../constants/reflection-prompts";
import type {
  ReflectionEntry,
  ReflectionMilestoneId,
  ReflectionTimelineItem,
} from "../../domain/models/reflection";

export type ReflectionPromptVM = {
  id: string;
  text: string;
  topicId?: ReflectionPromptDef["topicId"];
};

export type ReflectionEntryVM = {
  reflectionId: string;
  promptId: string;
  body: string;
  createdAtLabel: string;
  snapshotVersion: string;
};

export type ReflectionTimelinePeekVM = {
  itemId: string;
  occurredAtLabel: string;
  reflectionId: string;
  preview: string;
};

export type ReflectionSegmentVM = {
  status: "ready" | "loading" | "empty";
  prompt: ReflectionPromptVM;
  entries: ReflectionEntryVM[];
  timelinePeek: ReflectionTimelinePeekVM[];
  entryCount: number;
  emittedMilestones: ReflectionMilestoneId[];
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function resolveActivePrompt(
  childName: string,
  prefills: { promptId?: string } | null,
): ReflectionPromptVM {
  let def: ReflectionPromptDef = promptForWeek();
  if (prefills?.promptId === TRADITION_REFLECT_PROMPT.id) {
    def = TRADITION_REFLECT_PROMPT;
  } else if (prefills?.promptId) {
    def = REFLECTION_PROMPTS.find((p) => p.id === prefills.promptId) ?? def;
  }
  return {
    id: def.id,
    text: fillPromptChild(def.text, childName),
    topicId: def.topicId,
  };
}

export function buildReflectionSegmentVM(input: {
  childName: string;
  entries: ReflectionEntry[];
  timelineItems: ReflectionTimelineItem[];
  emittedMilestones: ReflectionMilestoneId[];
  prefills?: { promptId?: string } | null;
  loading?: boolean;
}): ReflectionSegmentVM {
  if (input.loading) {
    return {
      status: "loading",
      prompt: resolveActivePrompt(input.childName, input.prefills ?? null),
      entries: [],
      timelinePeek: [],
      entryCount: 0,
      emittedMilestones: input.emittedMilestones,
    };
  }

  const entries = [...input.entries].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const entryVms: ReflectionEntryVM[] = entries.map((e) => ({
    reflectionId: e.reflectionId,
    promptId: e.promptId,
    body: e.body,
    createdAtLabel: formatWhen(e.createdAt),
    snapshotVersion: e.snapshotVersion,
  }));

  const byId = new Map(entries.map((e) => [e.reflectionId, e]));
  const peek = [...input.timelineItems]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 3)
    .map((t) => {
      const entry = byId.get(t.reflectionId);
      const preview = entry?.body?.trim()
        ? entry.body.trim().slice(0, 80) + (entry.body.length > 80 ? "…" : "")
        : "A quiet note";
      return {
        itemId: t.itemId,
        occurredAtLabel: formatWhen(t.occurredAt),
        reflectionId: t.reflectionId,
        preview,
      };
    });

  return {
    status: entries.length === 0 ? "empty" : "ready",
    prompt: resolveActivePrompt(input.childName, input.prefills ?? null),
    entries: entryVms,
    timelinePeek: peek,
    entryCount: entries.length,
    emittedMilestones: input.emittedMilestones,
  };
}

export function milestoneToastCopy(
  milestoneId: ReflectionMilestoneId,
  childName: string,
): string {
  const name = childName.trim() || "your child";
  if (milestoneId === "reflection_milestone_1") {
    return `Saved — a quiet note for ${name}`;
  }
  if (milestoneId === "reflection_milestone_5") {
    return "Five quiet notes";
  }
  return "Twelve quiet notes";
}
