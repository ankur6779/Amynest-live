/**
 * Gentle discovery recommendations + continuity — no pressure, no notifications.
 */

import type { CosmicMemory } from "./cosmic-memory";

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
};

export type DiscoveryNudge = {
  line: string;
  action: "chapter" | "planet" | "amy" | "wander";
  target?: string;
};

export function buildDiscoveryNudge(
  memory: CosmicMemory,
  childName: string,
  opts?: { daySky?: boolean },
): DiscoveryNudge {
  const child = childName.trim() || "your child";
  const planets = memory.planetsVisited;
  if (!planets.includes("moon")) {
    return {
      line: `Today, wander gently toward the Moon in ${child}'s birth chart.`,
      action: "planet",
      target: "moon",
    };
  }
  if (!planets.includes("sun")) {
    return {
      line: `You haven't stood in ${child}'s Sun light yet — a warm chapter waits.`,
      action: "planet",
      target: "sun",
    };
  }
  if (!opts?.daySky && !planets.includes("rising")) {
    return {
      line: "Rising still holds a soft doorway — explore when you're curious.",
      action: "planet",
      target: "rising",
    };
  }

  const priority = [
    "relationships",
    "family_dynamics",
    "communication",
    "learning",
    "emotional",
    "personality",
  ];
  const missing = priority.find((id) => !memory.chaptersOpened.includes(id));
  if (missing) {
    const label = CHAPTER_LABELS[missing] ?? "the next chapter";
    return {
      line: `Your next beautiful chapter is ${label}.`,
      action: "chapter",
      target: missing,
    };
  }

  if (memory.aiOpened === 0) {
    return {
      line: "When you're ready, Amy would love a quiet conversation about their sky.",
      action: "amy",
    };
  }

  return {
    line: `Keep wandering ${child}'s universe — every revisit reveals a softer detail.`,
    action: "wander",
  };
}

export function buildContinuityLine(memory: CosmicMemory, childName: string): string | null {
  const child = childName.trim() || "your child";
  if (memory.visitCount <= 1) return null;

  const lastChapter = memory.chaptersOpened[memory.chaptersOpened.length - 1];
  if (lastChapter && CHAPTER_LABELS[lastChapter]) {
    const label = CHAPTER_LABELS[lastChapter];
    if (label.toLowerCase().includes("curios") || lastChapter === "learning") {
      return `Last time we explored curiosity with ${child}. Today I'd love to show you something about communication.`;
    }
    if (lastChapter === "emotional") {
      return `Last time we sat with ${child}'s inner weather. Today a chapter on belonging waits nearby.`;
    }
    return `Last time we opened “${label}.” Today another lantern is ready when you are.`;
  }

  if (memory.lastPlanet === "moon") {
    return `Last time we lingered with the Moon. The Sun would love a quiet visit when you're ready.`;
  }
  if (memory.lastPlanet === "sun") {
    return `We stood in daylight last time. The Moon still holds a soft story for ${child}.`;
  }

  return `Welcome back into ${child}'s universe — something new waits without hurry.`;
}
