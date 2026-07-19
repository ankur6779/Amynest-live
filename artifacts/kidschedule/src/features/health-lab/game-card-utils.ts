import type { GameSessionResult, HealthGameId } from "./types";
import type { GameTrainSkill } from "./constants";

export function formatGamePersonalBest(
  gameId: HealthGameId,
  score: number | undefined,
  history: GameSessionResult[],
  kind: "duration" | "score" | "percent",
): { icon: string; label: string; value: string; empty?: boolean } {
  if (score == null || score <= 0) {
    return { icon: "🏆", label: "Best", value: "Beat your best!", empty: true };
  }

  const bestSession = history
    .filter((s) => s.gameId === gameId)
    .reduce<GameSessionResult | null>((best, s) => (!best || s.score > best.score ? s : best), null);

  if (kind === "duration") {
    const sec = Math.max(1, Math.round((bestSession?.durationMs ?? 0) / 1000));
    return { icon: "🏆", label: "Best", value: `${sec} sec` };
  }

  if (kind === "percent") {
    return { icon: "⭐", label: "Best", value: `${Math.round(score)}%` };
  }

  if (gameId === "reaction-time") {
    return { icon: "⚡", label: "Best", value: String(Math.round(score)) };
  }

  if (gameId === "calmness-meter") {
    return { icon: "⭐", label: "Wellness", value: String(Math.round(score)) };
  }

  return { icon: "🏆", label: "Best", value: String(Math.round(score)) };
}

export function formatTrainSkills(trains: readonly GameTrainSkill[]): string {
  return trains.map((t) => `${t.emoji} ${t.label}`).join(" · ");
}
