import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isPageVisible, scheduleIdle } from "@/lib/game-perf";

export type GamePlayProps = {
  onFinish: (score: number, total: number) => void;
};

type GameLoader = () => Promise<{ default: ComponentType<GamePlayProps> }>;

/** Dynamic import map — one chunk per game for hub first-paint. */
export const GAME_LOADERS: Record<string, GameLoader> = {
  "pattern-match": () =>
    import("@/components/games/PatternMatch").then((m) => ({ default: m.PatternMatchGame })),
  "odd-one-out": () =>
    import("@/components/games/OddOneOut").then((m) => ({ default: m.OddOneOutGame })),
  "card-flip": () =>
    import("@/components/games/CardFlip").then((m) => ({ default: m.CardFlipGame })),
  sequence: () =>
    import("@/components/games/SequenceMemory").then((m) => ({ default: m.SequenceMemoryGame })),
  "color-memory": () =>
    import("@/components/games/ColorMemory").then((m) => ({ default: m.ColorMemoryGame })),
  "speed-math": () =>
    import("@/components/games/SpeedMath").then((m) => ({ default: m.SpeedMathGame })),
  "number-match": () =>
    import("@/components/games/NumberMatch").then((m) => ({ default: m.NumberMatchGame })),
  "find-mistake": () =>
    import("@/components/games/FindMistake").then((m) => ({ default: m.FindMistakeGame })),
  "target-tap": () =>
    import("@/components/games/TargetTap").then((m) => ({ default: m.TargetTapGame })),
  "what-should-you-do": () =>
    import("@/components/games/BehaviorChoice").then((m) => ({ default: m.BehaviorChoiceGame })),
  "maze-escape": () =>
    import("@/components/games/MazeEscape").then((m) => ({ default: m.MazeEscapeGame })),
  "shape-match": () =>
    import("@/components/games/ShapeMatching").then((m) => ({ default: m.ShapeMatchingGame })),
  "color-fill": () =>
    import("@/components/games/ColorFill").then((m) => ({ default: m.ColorFillGame })),
  "hidden-objects": () =>
    import("@/components/games/HiddenObjects").then((m) => ({ default: m.HiddenObjectsGame })),
  "spot-difference": () =>
    import("@/components/games/SpotTheDifference").then((m) => ({ default: m.SpotTheDifferenceGame })),
};

const lazyCache = new Map<string, LazyExoticComponent<ComponentType<GamePlayProps>>>();
const prefetchStarted = new Set<string>();
const prefetchQueue: string[] = [];
let activePrefetch = 0;
const MAX_CONCURRENT_PREFETCH = 2;

function runNextPrefetch(): void {
  if (activePrefetch >= MAX_CONCURRENT_PREFETCH) return;
  if (!isPageVisible()) return;
  const gameId = prefetchQueue.shift();
  if (!gameId) return;
  const loader = GAME_LOADERS[gameId];
  if (!loader) return;
  activePrefetch += 1;
  void loader()
    .catch(() => {
      prefetchStarted.delete(gameId);
    })
    .finally(() => {
      activePrefetch -= 1;
      runNextPrefetch();
    });
}

export function getLazyGame(gameId: string): LazyExoticComponent<ComponentType<GamePlayProps>> | null {
  const loader = GAME_LOADERS[gameId];
  if (!loader) return null;
  let cached = lazyCache.get(gameId);
  if (!cached) {
    cached = lazy(loader);
    lazyCache.set(gameId, cached);
  }
  return cached;
}

/**
 * Warm a game chunk during idle time — capped concurrency, skips when tab hidden.
 * Safe to call from hover / touch-start / hub mount.
 */
export function prefetchGame(gameId: string): void {
  const loader = GAME_LOADERS[gameId];
  if (!loader || prefetchStarted.has(gameId)) return;
  prefetchStarted.add(gameId);
  prefetchQueue.push(gameId);
  scheduleIdle(() => runNextPrefetch(), 900);
}

/** Prefetch first adventure pick once hub is idle (non-blocking). */
export function prefetchAdventureIdle(gameId: string | undefined): () => void {
  if (!gameId) return () => undefined;
  return scheduleIdle(() => prefetchGame(gameId), 600);
}
