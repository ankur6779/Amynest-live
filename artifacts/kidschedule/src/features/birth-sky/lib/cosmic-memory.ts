/**
 * Local cosmic memory — continuity without backend changes.
 */

export type CosmicMemory = {
  visitCount: number;
  lastVisitAt: number;
  chaptersOpened: string[];
  lastPlanet: "sun" | "moon" | "rising" | null;
  planetsVisited: Array<"sun" | "moon" | "rising">;
  aiOpened: number;
  celebrationsShown: string[];
  greetingIndex: number;
  /** Signature Edition — emotional completion shown once. */
  completionShown?: boolean;
  /** Times parent saved the Cosmic Portrait (client-only). */
  portraitSavedCount?: number;
  lastPortraitSavedAt?: number;
};

const KEY = "amynest:amy-astro:cosmic-memory:v1:";

const EMPTY: CosmicMemory = {
  visitCount: 0,
  lastVisitAt: 0,
  chaptersOpened: [],
  lastPlanet: null,
  planetsVisited: [],
  aiOpened: 0,
  celebrationsShown: [],
  greetingIndex: 0,
};

function read(profileId: string): CosmicMemory {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY + profileId);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function write(profileId: string, next: CosmicMemory): CosmicMemory {
  try {
    localStorage.setItem(KEY + profileId, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function loadCosmicMemory(profileId: string): CosmicMemory {
  return read(profileId);
}

export function touchCosmicVisit(profileId: string): CosmicMemory {
  const prev = read(profileId);
  return write(profileId, {
    ...prev,
    visitCount: prev.visitCount + 1,
    lastVisitAt: Date.now(),
    greetingIndex: prev.greetingIndex + 1,
  });
}

export function rememberChapter(profileId: string, chapterId: string): CosmicMemory {
  const prev = read(profileId);
  const chaptersOpened = prev.chaptersOpened.includes(chapterId)
    ? prev.chaptersOpened
    : [...prev.chaptersOpened, chapterId];
  return write(profileId, { ...prev, chaptersOpened });
}

export function rememberPlanet(
  profileId: string,
  planet: "sun" | "moon" | "rising",
): CosmicMemory {
  const prev = read(profileId);
  const planetsVisited = prev.planetsVisited.includes(planet)
    ? prev.planetsVisited
    : [...prev.planetsVisited, planet];
  return write(profileId, { ...prev, lastPlanet: planet, planetsVisited });
}

export function rememberAiOpened(profileId: string): CosmicMemory {
  const prev = read(profileId);
  return write(profileId, { ...prev, aiOpened: prev.aiOpened + 1 });
}

export function rememberCelebration(profileId: string, id: string): CosmicMemory {
  const prev = read(profileId);
  if (prev.celebrationsShown.includes(id)) return prev;
  return write(profileId, {
    ...prev,
    celebrationsShown: [...prev.celebrationsShown, id],
  });
}

/** Persist that the parent saved the Cosmic Portrait (share/clipboard). */
export function rememberPortraitSaved(profileId: string): CosmicMemory {
  const prev = read(profileId);
  return write(profileId, {
    ...prev,
    portraitSavedCount: (prev.portraitSavedCount ?? 0) + 1,
    lastPortraitSavedAt: Date.now(),
  });
}

/**
 * Touch a visit while returning the previous lastVisitAt for continuity math.
 * Does not fabricate events — only increments stored visit counters.
 */
export function touchCosmicVisitWithPrior(profileId: string): {
  memory: CosmicMemory;
  previousLastVisitAt: number;
} {
  const prev = read(profileId);
  const previousLastVisitAt = prev.lastVisitAt;
  const memory = write(profileId, {
    ...prev,
    visitCount: prev.visitCount + 1,
    lastVisitAt: Date.now(),
    greetingIndex: prev.greetingIndex + 1,
  });
  return { memory, previousLastVisitAt };
}

/** Enough exploration to offer the quiet completion moment. */
export function shouldOfferEmotionalCompletion(memory: CosmicMemory): boolean {
  if (memory.completionShown) return false;
  const chapters = memory.chaptersOpened.length;
  const planets = memory.planetsVisited.length;
  return chapters >= 3 && planets >= 2;
}

export function markEmotionalCompletion(profileId: string): CosmicMemory {
  const prev = read(profileId);
  return write(profileId, { ...prev, completionShown: true });
}

/** Discovery progress — chapters + planets + AI touch (no XP). */
export function computeCosmicProgress(memory: CosmicMemory, totalChapters: number): {
  percent: number;
  nextLabel: string;
} {
  const chapterScore = Math.min(memory.chaptersOpened.length, totalChapters);
  const planetScore = memory.planetsVisited.length;
  const aiScore = memory.aiOpened > 0 ? 1 : 0;
  const max = totalChapters + 3 + 1;
  const earned = chapterScore + planetScore + aiScore;
  const percent = Math.round((earned / max) * 100);

  const ALL_CHAPTERS = [
    { id: "personality", label: "The Gentle Heart" },
    { id: "emotional", label: "The Inner Weather" },
    { id: "learning", label: "How Curiosity Begins" },
    { id: "relationships", label: "Bonds That Soften Them" },
    { id: "family_dynamics", label: "The Room Around Them" },
    { id: "reflection", label: "A Closing Lantern" },
  ];
  const missingChapter = ALL_CHAPTERS.find((c) => !memory.chaptersOpened.includes(c.id));
  if (planetScore < 3) {
    const missing = (["sun", "moon", "rising"] as const).find(
      (p) => !memory.planetsVisited.includes(p),
    );
    if (missing) {
      return {
        percent,
        nextLabel:
          missing === "sun"
            ? "Sun journey"
            : missing === "moon"
              ? "Moon journey"
              : "Rising doorway",
      };
    }
  }
  if (missingChapter) return { percent, nextLabel: missingChapter.label };
  if (aiScore === 0) return { percent, nextLabel: "Amy conversation" };
  return { percent: Math.min(100, percent), nextLabel: "Planet harmony · keep wandering" };
}

export function buildMemoryLines(
  memory: CosmicMemory,
  childName: string,
): string[] {
  const lines: string[] = [];
  if (memory.lastPlanet === "moon") {
    lines.push(`Last time we lingered with the Moon in ${childName}'s sky.`);
  } else if (memory.lastPlanet === "sun") {
    lines.push(`Last time we stood in ${childName}'s daylight with the Sun.`);
  } else if (memory.lastPlanet === "rising") {
    lines.push(`Last time we explored the Rising doorway.`);
  }
  if (memory.chaptersOpened.length > 0) {
    lines.push(
      `You've already opened ${memory.chaptersOpened.length} chapter${memory.chaptersOpened.length === 1 ? "" : "s"} of their story.`,
    );
  }
  const unread = ["relationships", "family_dynamics", "emotional"].find(
    (id) => !memory.chaptersOpened.includes(id),
  );
  if (unread === "relationships") {
    lines.push("You haven't explored relationships yet — a soft chapter waits.");
  } else if (unread === "family_dynamics") {
    lines.push("Family Dynamics still holds an unopened lantern.");
  } else if (unread === "emotional") {
    lines.push("The Inner Weather chapter hasn't been visited yet.");
  }
  return lines.slice(0, 2);
}
