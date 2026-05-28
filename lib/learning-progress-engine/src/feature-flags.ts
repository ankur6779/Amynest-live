/**
 * Phase 7 — Feature Flags.
 *
 * Deterministic, child-scoped flag evaluation. Used to safely roll out
 * behavioral changes (reward pacing, AI tone, recommendation strategy,
 * onboarding experiments) without hard-releasing them globally.
 *
 * IMPORTANT:
 *  - Flags NEVER mutate engine state. They only gate *which* behavior is used.
 *  - Evaluation is pure & deterministic given the input config + child id.
 *  - There is no global flag registry — the host (server or client) passes
 *    the current config snapshot in. This keeps the engine portable and
 *    avoids a parallel state system.
 */

export type RolloutKind =
  | "off"
  | "on"
  | "percentage"
  | "premium_only"
  | "allowlist"
  | "blocklist";

export interface FeatureFlagConfig {
  /** Default behavior when no rule applies. */
  defaultEnabled: boolean;
  /** Emergency kill switch — overrides everything else. */
  killSwitch?: boolean;
  /** Rollout rules evaluated top-down. First match wins. */
  rules?: FeatureFlagRule[];
}

export interface FeatureFlagRule {
  kind: RolloutKind;
  /** Required for percentage rollouts (0..100). */
  percentage?: number;
  /** Required for allowlist / blocklist rules. */
  childIds?: number[];
}

export interface FeatureFlagContext {
  childId: number;
  isPremium: boolean;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason:
    | "kill_switch"
    | "default"
    | "rule_on"
    | "rule_off"
    | "percentage_in"
    | "percentage_out"
    | "premium_only_match"
    | "premium_only_miss"
    | "allowlist_match"
    | "blocklist_match";
  bucket?: number;
}

/**
 * 32-bit FNV-1a — deterministic, fast, dependency-free. Used to bucket a
 * child into a stable 0..99 slot per flag key.
 */
export function bucketForChild(flagKey: string, childId: number): number {
  let hash = 2166136261;
  const input = `${flagKey}|${childId}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

export function evaluateFlag(
  flagKey: string,
  config: FeatureFlagConfig | undefined,
  ctx: FeatureFlagContext,
): FeatureFlagEvaluation {
  if (!config) {
    return { enabled: false, reason: "default" };
  }
  if (config.killSwitch) {
    return { enabled: false, reason: "kill_switch" };
  }
  const bucket = bucketForChild(flagKey, ctx.childId);
  for (const rule of config.rules ?? []) {
    switch (rule.kind) {
      case "off":
        return { enabled: false, reason: "rule_off", bucket };
      case "on":
        return { enabled: true, reason: "rule_on", bucket };
      case "percentage": {
        const pct = Math.max(0, Math.min(100, rule.percentage ?? 0));
        if (bucket < pct) return { enabled: true, reason: "percentage_in", bucket };
        return { enabled: false, reason: "percentage_out", bucket };
      }
      case "premium_only":
        if (ctx.isPremium) return { enabled: true, reason: "premium_only_match", bucket };
        return { enabled: false, reason: "premium_only_miss", bucket };
      case "allowlist":
        if ((rule.childIds ?? []).includes(ctx.childId)) {
          return { enabled: true, reason: "allowlist_match", bucket };
        }
        break;
      case "blocklist":
        if ((rule.childIds ?? []).includes(ctx.childId)) {
          return { enabled: false, reason: "blocklist_match", bucket };
        }
        break;
    }
  }
  return { enabled: config.defaultEnabled, reason: "default", bucket };
}

/** Convenience wrapper. */
export function isFlagEnabled(
  flagKey: string,
  config: FeatureFlagConfig | undefined,
  ctx: FeatureFlagContext,
): boolean {
  return evaluateFlag(flagKey, config, ctx).enabled;
}

/** Canonical flag keys used across AmyNest. Add here, not inline. */
export const FLAG_KEYS = {
  rewardPacingV2: "reward_pacing_v2",
  celebrationIntensityLow: "celebration_intensity_low",
  aiToneWarmer: "ai_tone_warmer",
  adaptiveRoutingAggressive: "adaptive_routing_aggressive",
  notificationsEnabled: "notifications_enabled",
  comebackStrategyBoost: "comeback_strategy_boost",
  onboardingFiveDay: "onboarding_five_day",
  familyMilestonesEnabled: "family_milestones_enabled",
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

export type FeatureFlagSnapshot = Partial<Record<FlagKey, FeatureFlagConfig>>;
