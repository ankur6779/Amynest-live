/**
 * Visual-only world memory for Smart Math Tricks.
 * Does NOT touch learning progression, mastery, streaks, or rewards.
 */

export type WorldMemory = {
  version: 1;
  blooms: number;
  treesGrown: number;
  crystalBrightness: number; // 0..1
  bridgesRepaired: number;
  rocketsLaunched: number;
  starsIgnited: number;
  flowersOpen: number;
  lastVisitDay: string;
  visitCount: number;
};

export type WorldGrowthKind = "star" | "correct" | "visit" | "lesson_open";

const LS = "amynest_smt_world_memory_v1";
const CURRENT_VERSION = 1 as const;

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyMemory(): WorldMemory {
  return {
    version: CURRENT_VERSION,
    blooms: 0,
    treesGrown: 0,
    crystalBrightness: 0.25,
    bridgesRepaired: 0,
    rocketsLaunched: 0,
    starsIgnited: 0,
    flowersOpen: 0,
    lastVisitDay: "",
    visitCount: 0,
  };
}

function storageKey(childName: string): string {
  return `${LS}_${childName.trim() || "guest"}`;
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && typeof localStorage.getItem === "function";
  } catch {
    return false;
  }
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeMemory(raw: unknown): WorldMemory {
  const base = emptyMemory();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<WorldMemory>;
  return {
    version: CURRENT_VERSION,
    blooms: finiteNumber(p.blooms, base.blooms, 0, 36),
    treesGrown: finiteNumber(p.treesGrown, base.treesGrown, 0, 20),
    crystalBrightness: finiteNumber(p.crystalBrightness, base.crystalBrightness, 0, 1),
    bridgesRepaired: finiteNumber(p.bridgesRepaired, base.bridgesRepaired, 0, 12),
    rocketsLaunched: finiteNumber(p.rocketsLaunched, base.rocketsLaunched, 0, 16),
    starsIgnited: finiteNumber(p.starsIgnited, base.starsIgnited, 0, 48),
    flowersOpen: finiteNumber(p.flowersOpen, base.flowersOpen, 0, 24),
    lastVisitDay: typeof p.lastVisitDay === "string" ? p.lastVisitDay.slice(0, 32) : "",
    visitCount: finiteNumber(p.visitCount, base.visitCount, 0, 1_000_000),
  };
}

export function loadWorldMemory(childName: string): WorldMemory {
  if (!canUseLocalStorage()) return emptyMemory();
  try {
    const raw = localStorage.getItem(storageKey(childName));
    if (!raw) return emptyMemory();
    return sanitizeMemory(JSON.parse(raw));
  } catch {
    return emptyMemory();
  }
}

export function saveWorldMemory(childName: string, memory: WorldMemory): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(storageKey(childName), JSON.stringify(sanitizeMemory(memory)));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Apply a visual growth event — capped so the world stays tasteful. */
export function growWorldMemory(
  prev: WorldMemory,
  kind: WorldGrowthKind,
): WorldMemory {
  const next = sanitizeMemory(prev);
  switch (kind) {
    case "star":
      next.starsIgnited = Math.min(48, next.starsIgnited + 1);
      next.crystalBrightness = Math.min(1, next.crystalBrightness + 0.04);
      next.flowersOpen = Math.min(24, next.flowersOpen + 1);
      break;
    case "correct":
      next.blooms = Math.min(36, next.blooms + 1);
      next.bridgesRepaired = Math.min(12, next.bridgesRepaired + (next.blooms % 3 === 0 ? 1 : 0));
      next.rocketsLaunched = Math.min(16, next.rocketsLaunched + (next.blooms % 4 === 0 ? 1 : 0));
      next.treesGrown = Math.min(20, next.treesGrown + (next.blooms % 5 === 0 ? 1 : 0));
      next.crystalBrightness = Math.min(1, next.crystalBrightness + 0.02);
      break;
    case "lesson_open":
      next.flowersOpen = Math.min(24, next.flowersOpen + 1);
      break;
    case "visit": {
      const today = dayKey();
      if (next.lastVisitDay !== today) {
        next.lastVisitDay = today;
        next.visitCount += 1;
        next.blooms = Math.min(36, next.blooms + 1);
        next.crystalBrightness = Math.min(1, next.crystalBrightness + 0.01);
      }
      break;
    }
  }
  return next;
}

export function recordWorldGrowth(childName: string, kind: WorldGrowthKind): WorldMemory {
  const next = growWorldMemory(loadWorldMemory(childName), kind);
  saveWorldMemory(childName, next);
  return next;
}
