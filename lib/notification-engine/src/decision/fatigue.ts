export interface FatigueInputs {
  /** Notifications delivered in the trailing 7 days. */
  sent7d: number;
  /** Notifications opened in the trailing 7 days. */
  opened7d: number;
  /** Notifications dismissed (swiped away) in the trailing 7 days. */
  dismissed7d: number;
  /** Consecutive notifications sent with no open. */
  consecutiveIgnored: number;
  /** OS notification permission currently granted. */
  permissionGranted?: boolean;
}

export type FatigueLevel = "healthy" | "elevated" | "high" | "critical";

export interface FatigueAssessment {
  /** 0 (fresh) … 100 (fully fatigued). */
  score: number;
  level: FatigueLevel;
  /** Recommended multiplier to apply to normal send frequency (0–1). */
  frequencyMultiplier: number;
  primaryDriver: string;
}

/**
 * Compute a fatigue score from delivery/engagement history.
 *
 * Philosophy: fatigue is driven far more by *being ignored* than by raw
 * volume. A user who opens everything is not fatigued even at high volume; a
 * user ignoring a long streak is fatigued even at low volume. The score is
 * deliberately conservative — when fatigue rises we *reduce* frequency, never
 * increase it.
 */
export function assessFatigue(inputs: FatigueInputs): FatigueAssessment {
  const { sent7d, opened7d, dismissed7d, consecutiveIgnored } = inputs;

  if (inputs.permissionGranted === false) {
    return {
      score: 100,
      level: "critical",
      frequencyMultiplier: 0,
      primaryDriver: "permission_revoked",
    };
  }

  if (sent7d === 0) {
    return {
      score: 0,
      level: "healthy",
      frequencyMultiplier: 1,
      primaryDriver: "no_recent_sends",
    };
  }

  const openRate = opened7d / sent7d;
  const dismissRate = dismissed7d / sent7d;

  // Consecutive-ignore is the dominant driver: each ignored send after the
  // 3rd adds weight quickly.
  const ignoreStreakPenalty = Math.min(45, Math.max(0, consecutiveIgnored - 2) * 12);

  // Low open rate contributes up to 30 points.
  const openPenalty = Math.round((1 - clamp01(openRate)) * 30);

  // Dismissals are an explicit "not now" — up to 20 points.
  const dismissPenalty = Math.round(clamp01(dismissRate) * 20);

  // Sheer volume contributes mildly (up to 15) and only above a comfortable
  // baseline of ~14/week (2/day).
  const volumePenalty = Math.min(15, Math.max(0, sent7d - 14) * 1.5);

  const score = clampScore(
    ignoreStreakPenalty + openPenalty + dismissPenalty + volumePenalty,
  );

  const level = scoreToLevel(score);
  const frequencyMultiplier = levelToMultiplier(level);
  const primaryDriver = pickDriver({
    ignoreStreakPenalty,
    openPenalty,
    dismissPenalty,
    volumePenalty,
  });

  return { score, level, frequencyMultiplier, primaryDriver };
}

function scoreToLevel(score: number): FatigueLevel {
  if (score >= 80) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "elevated";
  return "healthy";
}

function levelToMultiplier(level: FatigueLevel): number {
  switch (level) {
    case "healthy": return 1;
    case "elevated": return 0.6;
    case "high": return 0.3;
    case "critical": return 0.1;
  }
}

function pickDriver(p: {
  ignoreStreakPenalty: number;
  openPenalty: number;
  dismissPenalty: number;
  volumePenalty: number;
}): string {
  const entries: Array<[string, number]> = [
    ["consecutive_ignores", p.ignoreStreakPenalty],
    ["low_open_rate", p.openPenalty],
    ["dismissals", p.dismissPenalty],
    ["volume", p.volumePenalty],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]![1] > 0 ? entries[0]![0] : "healthy";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
