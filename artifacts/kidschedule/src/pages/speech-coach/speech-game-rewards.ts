import type { SpeechGameId } from "@workspace/speech-coach";
import type { TranscriptFeedback } from "@workspace/speech-coach";

export interface SpeechGameRewardsState {
  coins: number;
  badges: string[];
  plays: Partial<Record<SpeechGameId, number>>;
  bestScores: Partial<Record<SpeechGameId, number>>;
}

const STORAGE_PREFIX = "speech_game_rewards_";

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}${childId}`;
}

export function emptySpeechGameRewards(): SpeechGameRewardsState {
  return { coins: 0, badges: [], plays: {}, bestScores: {} };
}

export function loadSpeechGameRewards(childId: number): SpeechGameRewardsState {
  if (typeof window === "undefined") return emptySpeechGameRewards();
  try {
    const raw = localStorage.getItem(storageKey(childId));
    if (!raw) return emptySpeechGameRewards();
    const parsed = JSON.parse(raw) as SpeechGameRewardsState;
    return {
      coins: Number.isFinite(parsed.coins) ? Math.max(0, parsed.coins) : 0,
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      plays:
        parsed.plays && typeof parsed.plays === "object" ? parsed.plays : {},
      bestScores:
        parsed.bestScores && typeof parsed.bestScores === "object"
          ? parsed.bestScores
          : {},
    };
  } catch {
    return emptySpeechGameRewards();
  }
}

export function saveSpeechGameRewards(
  childId: number,
  state: SpeechGameRewardsState,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function coinsForFeedback(
  feedback: TranscriptFeedback,
  rewardStars: number,
): number {
  const mult = Math.max(1, rewardStars);
  if (feedback === "great") return 10 * mult;
  if (feedback === "close") return 5 * mult;
  return 2 * mult;
}

export function applyGameSessionRewards(input: {
  childId: number;
  gameId: SpeechGameId;
  badgeId: string;
  rewardStars: number;
  results: readonly { feedback: TranscriptFeedback; score: number }[];
}): {
  state: SpeechGameRewardsState;
  coinsEarned: number;
  sessionScore: number;
  badgeUnlocked: boolean;
  isNewBest: boolean;
} {
  const prev = loadSpeechGameRewards(input.childId);
  let coinsEarned = 0;
  let sessionScore = 0;
  for (const r of input.results) {
    coinsEarned += coinsForFeedback(r.feedback, input.rewardStars);
    sessionScore += r.score;
  }
  const avgScore =
    input.results.length > 0
      ? Math.round(sessionScore / input.results.length)
      : 0;
  const prevBest = prev.bestScores[input.gameId] ?? 0;
  const isNewBest = avgScore > prevBest;
  const hadBadge = prev.badges.includes(input.badgeId);
  const badgeUnlocked =
    input.results.length > 0 &&
    input.results.some((r) => r.feedback === "great") &&
    !hadBadge;

  const next: SpeechGameRewardsState = {
    coins: prev.coins + coinsEarned,
    badges: badgeUnlocked
      ? [...prev.badges, input.badgeId]
      : [...prev.badges],
    plays: {
      ...prev.plays,
      [input.gameId]: (prev.plays[input.gameId] ?? 0) + 1,
    },
    bestScores: {
      ...prev.bestScores,
      [input.gameId]: isNewBest ? avgScore : prevBest,
    },
  };
  saveSpeechGameRewards(input.childId, next);
  return {
    state: next,
    coinsEarned,
    sessionScore: avgScore,
    badgeUnlocked,
    isNewBest,
  };
}
