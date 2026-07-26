/**
 * Emotional continuity — Amy remembers only real stored events.
 * Presentation copy helpers; never fabricates milestones or conversations.
 */

import type { CosmicMemory } from "./cosmic-memory";
import type { ReflectionMilestoneId } from "../domain/models/reflection";

const CHAPTER_LABELS: Record<string, string> = {
  personality: "The Gentle Heart",
  strengths: "Lights Already Softly On",
  emotional: "The Inner Weather",
  learning: "How Curiosity Begins",
  communication: "The Voice They Are Growing Into",
  relationships: "Bonds That Soften Them",
  family_dynamics: "Family Dynamics",
  parenting: "How Love Can Meet Them",
  creativity: "Where Imagination Lands",
  reflection: "A Closing Lantern",
};

export type ContinuityFacts = {
  visitCount: number;
  daysSinceLastVisit: number | null;
  lastPlanet: CosmicMemory["lastPlanet"];
  lastChapterLabel: string | null;
  chapterCount: number;
  planetCount: number;
  aiOpened: number;
  portraitSaved: boolean;
  /** Newest reflection milestone not yet celebrated in cosmic memory */
  pendingMilestone: ReflectionMilestoneId | null;
  latestMilestone: ReflectionMilestoneId | null;
  familiarity: "new" | "returning" | "familiar" | "dear";
};

function daysBetween(fromMs: number, toMs: number): number | null {
  if (!fromMs) return null;
  return Math.max(0, Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000)));
}

export function resolveFamiliarity(visitCount: number): ContinuityFacts["familiarity"] {
  if (visitCount <= 1) return "new";
  if (visitCount <= 4) return "returning";
  if (visitCount <= 12) return "familiar";
  return "dear";
}

export function gatherContinuityFacts(input: {
  memory: CosmicMemory;
  /** Prior visit timestamp before this session's touch — optional */
  previousLastVisitAt?: number;
  emittedMilestones?: ReflectionMilestoneId[];
  now?: number;
}): ContinuityFacts {
  const now = input.now ?? Date.now();
  const mem = input.memory;
  // After touchCosmicVisit, lastVisitAt is "now"; use previous if provided, else null days
  const prevAt = input.previousLastVisitAt ?? 0;
  const daysSince =
    prevAt > 0 ? daysBetween(prevAt, now) : mem.visitCount > 1 ? null : null;

  const lastChapterId = mem.chaptersOpened[mem.chaptersOpened.length - 1] ?? null;
  const milestones = input.emittedMilestones ?? [];
  const latestMilestone = milestones[milestones.length - 1] ?? null;
  const pendingMilestone =
    milestones.find((m) => !mem.celebrationsShown.includes(`milestone:${m}`)) ??
    null;

  return {
    visitCount: mem.visitCount,
    daysSinceLastVisit: daysSince,
    lastPlanet: mem.lastPlanet,
    lastChapterLabel: lastChapterId ? CHAPTER_LABELS[lastChapterId] ?? null : null,
    chapterCount: mem.chaptersOpened.length,
    planetCount: mem.planetsVisited.length,
    aiOpened: mem.aiOpened,
    portraitSaved: Boolean(mem.portraitSavedCount && mem.portraitSavedCount > 0),
    pendingMilestone,
    latestMilestone,
    familiarity: resolveFamiliarity(mem.visitCount),
  };
}

export function milestoneCelebrationCopy(
  milestoneId: ReflectionMilestoneId,
  childName: string,
): string {
  const child = childName.trim() || "your child";
  if (milestoneId === "reflection_milestone_1") {
    return `I celebrated ${child}'s first quiet note — a new star joined their sky.`;
  }
  if (milestoneId === "reflection_milestone_5") {
    return `Five quiet notes for ${child} — their constellation is growing.`;
  }
  return `Twelve quiet notes with ${child} — a whole little galaxy of noticing.`;
}

/** Amy portrait opener that references only known facts. */
export function buildContinuityAmyOpener(
  childName: string,
  facts: ContinuityFacts,
  seed: number,
  avoid?: string[],
): string | null {
  const child = childName.trim() || "your child";
  const pool: string[] = [];

  if (facts.familiarity === "new") return null;

  if (facts.pendingMilestone) {
    pool.push(milestoneCelebrationCopy(facts.pendingMilestone, child));
  }
  if (facts.portraitSaved) {
    pool.push(`I kept the portrait we saved for ${child} close — it still glows.`);
  }
  if (facts.lastChapterLabel) {
    pool.push(
      `I've been thinking about ${child} since we opened “${facts.lastChapterLabel}.”`,
    );
  }
  if (facts.lastPlanet === "moon") {
    pool.push(`Since we lingered with the Moon, I've held ${child}'s soft sky in mind.`);
  } else if (facts.lastPlanet === "sun") {
    pool.push(`I've been thinking about ${child}'s daylight since we stood with the Sun.`);
  } else if (facts.lastPlanet === "rising") {
    pool.push(`That Rising doorway we explored for ${child} still feels open.`);
  }
  if (facts.aiOpened > 0) {
    pool.push(`I'm glad you're back — our last conversation about ${child} stayed with me.`);
  }
  if (facts.daysSinceLastVisit != null && facts.daysSinceLastVisit >= 2) {
    pool.push(`Our stars have changed a little since we last met about ${child}.`);
  }
  if (facts.familiarity === "dear") {
    pool.push(`I found something beautiful waiting for us in ${child}'s sky.`);
  }
  if (facts.familiarity === "returning" || facts.familiarity === "familiar") {
    pool.push(`I'm glad you're back into ${child}'s universe.`);
  }

  if (!pool.length) return null;
  const avoided = new Set((avoid ?? []).map((s) => s.trim()));
  for (let n = 0; n < pool.length; n++) {
    const line = pool[(seed + n) % pool.length]!;
    if (!avoided.has(line)) return line;
  }
  return pool[seed % pool.length]!;
}

/** Living-sky familiarity class for brighter discovered stars. */
export function livingSkyFamiliarityClass(facts: ContinuityFacts): string {
  return `amy-sky-familiarity--${facts.familiarity}`;
}

/**
 * Soft return-visit line for discovery nudge / conversation sheet.
 * Only references stored facts — returns null when nothing real to say.
 */
export function buildReturnContinuityLine(
  facts: ContinuityFacts,
  childName: string,
): string | null {
  if (facts.familiarity === "new") return null;
  const child = childName.trim() || "your child";

  if (facts.pendingMilestone) {
    return milestoneCelebrationCopy(facts.pendingMilestone, child);
  }
  if (facts.portraitSaved && facts.lastChapterLabel) {
    return `I kept ${child}'s portrait close — and “${facts.lastChapterLabel}” still glows from last time.`;
  }
  if (facts.portraitSaved) {
    return `The portrait we saved for ${child} is still waiting warmly.`;
  }
  if (facts.lastChapterLabel) {
    return `Last time we opened “${facts.lastChapterLabel}.” Today another lantern is ready when you are.`;
  }
  if (facts.lastPlanet === "moon") {
    return `Last time we lingered with the Moon. The Sun would love a quiet visit when you're ready.`;
  }
  if (facts.lastPlanet === "sun") {
    return `We stood in daylight last time. The Moon still holds a soft story for ${child}.`;
  }
  if (facts.lastPlanet === "rising") {
    return `That Rising doorway we explored for ${child} still feels open.`;
  }
  if (facts.aiOpened > 0) {
    return `I'm glad you're back — our last conversation about ${child} stayed with me.`;
  }
  if (facts.daysSinceLastVisit != null && facts.daysSinceLastVisit >= 1) {
    return `Our stars have changed a little since we last met about ${child}.`;
  }
  if (facts.familiarity === "dear" || facts.familiarity === "familiar") {
    return `Welcome back into ${child}'s universe — something new waits without hurry.`;
  }
  return null;
}
