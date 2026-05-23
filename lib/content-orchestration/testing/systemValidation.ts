import type { NbaAction } from "../src/ml/types.js";
import { correctPredictionDrift } from "../src/ml/predictionDrift.js";
import type {
  ChildSimulationResult,
  FailureFlag,
  FullSimulationResult,
  LayerValidationResult,
  SystemMetrics,
} from "./simulationTypes.js";

/** Simulation includes disengaged archetypes; slightly looser than production SLO. */
const PREDICTION_ERROR_THRESHOLD = 0.62;
const ML_USAGE_BALANCED_MIN = 0.3;
const ML_USAGE_BALANCED_MAX = 0.6;
const ML_USAGE_AGGRESSIVE_MIN = 0.6;
const ML_USAGE_CONSERVATIVE_MAX = 0.4;
const ML_LIFT_WARN = 0.02;
const UNDERREACTION_THRESHOLD = 0.3;
const PERSONALITY_IMPACT_MIN = 0.35;
const NOISE_ROBUSTNESS_MIN = 0.55;
const STABILITY_DELTA_FAIL = -0.12;
const ADAPTATION_LATENCY_FAIL = 2.5;
const ADAPTATION_LATENCY_WARN = 2;
const ADAPTATION_DELAY_MS_FAIL = 450;
const ADAPTATION_DELAY_MS_WARN = 300;
const OVERREACTION_THRESHOLD = 0.395;
const DIRECTION_ACCURACY_MIN = 0.7;
const PERSONALITY_DIVERGENCE_MIN = 0.06;
const TRAIT_STABILITY_MIN = 0.0005;
const TRAIT_STABILITY_MAX = 0.15;
const COHERENCE_MIN = 0.2;
const TUTOR_REPEAT_MAX = 3;
const DECISION_CONSISTENCY_FAIL = 0.32;
const DECISION_CONSISTENCY_WARN = 0.45;
const UX_SCORE_FAIL = 0.6;
const UX_SCORE_WARN = 0.7;
const REWARD_VARIANCE_TOO_HIGH = 0.08;
const REWARD_VARIANCE_TOO_LOW = 0.0001;
const BURST_STABILITY_MIN = 0.7;
const DIFFICULTY_LIFT_GAP_RATIO = 0.45;

function layer(
  id: string,
  status: LayerValidationResult["status"],
  message: string,
  details?: string[],
  suggestions?: string[],
): LayerValidationResult {
  return { layer: id, status, message, details, suggestions };
}

export function getMlUsageRate(sim: FullSimulationResult): number {
  const { ml, rule } = sim.mlVsRuleBreakdown;
  const total = ml + rule;
  return total > 0 ? ml / total : 0;
}

export function computeMlLift(sim: FullSimulationResult): number {
  const { mlRewardSum, mlRewardCount, ruleRewardSum, ruleRewardCount } =
    sim.mlRewardBreakdown;
  const mlAvg = mlRewardCount > 0 ? mlRewardSum / mlRewardCount : 0;
  const ruleAvg = ruleRewardCount > 0 ? ruleRewardSum / ruleRewardCount : 0;
  return mlAvg - ruleAvg;
}

export function computeDifficultyAdjustedLift(sim: FullSimulationResult): number {
  const {
    mlAdjustedSum,
    mlAdjustedCount,
    ruleAdjustedSum,
    ruleAdjustedCount,
  } = sim.mlRewardBreakdown;
  const mlAvg = mlAdjustedCount > 0 ? mlAdjustedSum / mlAdjustedCount : 0;
  const ruleAvg = ruleAdjustedCount > 0 ? ruleAdjustedSum / ruleAdjustedCount : 0;
  return mlAvg - ruleAvg;
}

export function computeDecisionConsistencyScore(sim: FullSimulationResult): number {
  const samples =
    sim.decisionSamples.length > 0
      ? sim.decisionSamples
      : sim.children.flatMap((c) =>
          c.sessions.flatMap((s) => s.decisionSamples),
        );
  const clusters = new Map<string, string[]>();
  for (const sample of samples) {
    if (sample.action === "NOOP") continue;
    const actions = clusters.get(sample.contextKey) ?? [];
    actions.push(sample.action);
    clusters.set(sample.contextKey, actions);
  }
  let agreementSum = 0;
  let clusterCount = 0;
  for (const actions of clusters.values()) {
    if (actions.length < 2) continue;
    clusterCount += 1;
    const counts = new Map<string, number>();
    for (const action of actions) {
      counts.set(action, (counts.get(action) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    agreementSum += maxCount / actions.length;
  }
  return clusterCount > 0 ? agreementSum / clusterCount : 1;
}

export function computeRewardVariance(sim: FullSimulationResult): number {
  const rewards = sim.children.flatMap((c) => c.sessionRewards);
  if (rewards.length < 2) return 0;
  const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
  return rewards.reduce((a, v) => a + (v - mean) ** 2, 0) / rewards.length;
}

export function computeAvgAdaptationDelayMs(sim: FullSimulationResult): number {
  const delays = sim.children.flatMap((c) =>
    c.sessions.flatMap((s) => s.adaptationDelayMs),
  );
  return delays.length > 0
    ? delays.reduce((a, b) => a + b, 0) / delays.length
    : 0;
}

export function computeBurstNoiseStabilityScore(sim: FullSimulationResult): number {
  if (!sim.burstNoiseMode) return 1;
  const burstSessions = sim.children.flatMap((c) =>
    c.sessions.filter((s) => s.burstNoiseApplied),
  );
  if (burstSessions.length === 0) return 1;
  const stable = burstSessions.filter((s) => s.burstStabilityOk).length;
  return stable / burstSessions.length;
}

function computeFlipRate(sim: FullSimulationResult): number {
  let flipSessions = 0;
  let sessionCount = 0;
  for (const child of sim.children) {
    for (const session of child.sessions) {
      sessionCount += 1;
      const actions = session.decisions
        .map((d) => d.nbaAction)
        .filter(Boolean) as NbaAction[];
      if (hasRapidDifficultyFlipFlop(actions)) flipSessions += 1;
    }
  }
  return sessionCount > 0 ? flipSessions / sessionCount : 0;
}

function computeRewardSmoothnessScore(variance: number): number {
  if (variance <= REWARD_VARIANCE_TOO_LOW) return 0.5;
  if (variance >= REWARD_VARIANCE_TOO_HIGH) return 0.3;
  const mid = 0.015;
  const spread = 0.06;
  return Math.max(0.4, Math.min(1, 1 - Math.abs(variance - mid) / spread));
}

function normalizeCoherenceForUx(coherenceScore: number): number {
  return Math.max(0, Math.min(1, coherenceScore / COHERENCE_MIN));
}

export function computeUxScore(
  sim: FullSimulationResult,
  partial?: {
    coherenceScore?: number;
    avgAdaptationDelayMs?: number;
    avgAdaptationLatency?: number;
    rewardVariance?: number;
  },
): number {
  const coherenceScore =
    partial?.coherenceScore ??
    sim.children
      .flatMap((c) => c.sessions.map((s) => s.coherenceScore))
      .reduce((a, b) => a + b, 0) /
      Math.max(
        1,
        sim.children.reduce((a, c) => a + c.sessions.length, 0),
      );
  const coherenceNorm = normalizeCoherenceForUx(coherenceScore);
  const flipRate = computeFlipRate(sim);
  const stabilityScore = Math.max(0, 1 - flipRate * 2);
  const avgDelayMs =
    partial?.avgAdaptationDelayMs ?? computeAvgAdaptationDelayMs(sim);
  const avgLatency =
    partial?.avgAdaptationLatency ??
    sim.children
      .flatMap((c) => c.sessions.flatMap((s) => s.adaptationLatencies))
      .reduce((a, b) => a + b, 0) /
      Math.max(
        1,
        sim.children.flatMap((c) =>
          c.sessions.flatMap((s) => s.adaptationLatencies),
        ).length,
      );
  const latencyScore = sim.simulateLatency
    ? Math.max(0, 1 - avgDelayMs / ADAPTATION_DELAY_MS_FAIL)
    : Math.max(0, 1 - avgLatency / ADAPTATION_LATENCY_FAIL);
  const rewardVariance =
    partial?.rewardVariance ?? computeRewardVariance(sim);
  const smoothnessScore = computeRewardSmoothnessScore(rewardVariance);
  return Math.max(
    0,
    Math.min(
      1,
      coherenceNorm * 0.25 +
        stabilityScore * 0.25 +
        latencyScore * 0.25 +
        smoothnessScore * 0.25,
    ),
  );
}

export function computeUnderreactionRate(sim: FullSimulationResult): number {
  const flags = sim.children.flatMap((c) =>
    c.sessions.map((s) => s.underreactionFlag),
  );
  return flags.filter(Boolean).length / Math.max(1, flags.length);
}

function countSessionActions(
  child: ChildSimulationResult,
  action: string,
): number {
  return child.sessions.reduce(
    (a, s) => a + s.decisions.filter((d) => d.action === action).length,
    0,
  );
}

export function computePersonalityImpactScore(sim: FullSimulationResult): number {
  let checks = 0;
  let passes = 0;

  const distracted = sim.children.find(
    (c) => c.config.archetype === "slow_distractible",
  );
  const curious = sim.children.find((c) => c.config.archetype === "fast_curiosity");
  const persistent = sim.children.find(
    (c) => c.config.archetype === "persistent_avg",
  );
  const bored = sim.children.find(
    (c) => c.config.archetype === "bored_low_engagement",
  );

  if (distracted && curious) {
    checks += 2;
    if (
      countSessionActions(distracted, "SHORTEN_SESSION") >=
      countSessionActions(curious, "SHORTEN_SESSION")
    ) {
      passes += 1;
    }
    if (
      countSessionActions(curious, "SWAP_CONTENT") >=
      countSessionActions(distracted, "SWAP_CONTENT")
    ) {
      passes += 1;
    }
  }

  if (persistent) {
    checks += 1;
    const ratio =
      persistent.personalityInfluencedDecisions /
      Math.max(1, persistent.totalAdaptiveDecisions);
    if (ratio >= 0.12) passes += 1;
  }

  if (bored && distracted) {
    checks += 1;
    const boredIdle = bored.sessions.reduce(
      (a, s) => a + s.events.filter((e) => e.type === "USER_IDLE").length,
      0,
    );
    const avgIdle =
      boredIdle /
      Math.max(1, bored.sessions.reduce((a, s) => a + s.events.length, 0));
    if (avgIdle >= 0.08) passes += 1;
  }

  const totalInfluenced = sim.children.reduce(
    (a, c) => a + c.personalityInfluencedDecisions,
    0,
  );
  const totalAdaptive = sim.children.reduce(
    (a, c) => a + c.totalAdaptiveDecisions,
    0,
  );
  checks += 1;
  if (totalAdaptive === 0 || totalInfluenced / totalAdaptive >= 0.15) {
    passes += 1;
  }

  return checks > 0 ? passes / checks : 0;
}

export function computeNoiseRobustnessScore(sim: FullSimulationResult): number {
  if (!sim.injectNoise) return 1;

  const totalEvents = sim.children.reduce(
    (a, c) => a + c.sessions.reduce((s, sess) => s + sess.events.length, 0),
    0,
  );
  const noiseRatio = sim.noiseEventCount / Math.max(1, totalEvents);
  const underreaction = computeUnderreactionRate(sim);
  const overFlags = sim.children.flatMap((c) =>
    c.sessions.flatMap((s) => s.overreactionFlags),
  );
  const overreaction =
    overFlags.length > 0
      ? overFlags.filter(Boolean).length / overFlags.length
      : 0;

  let score = 1;
  if (underreaction > UNDERREACTION_THRESHOLD) score -= 0.35;
  if (overreaction > OVERREACTION_THRESHOLD) score -= 0.25;
  if (noiseRatio < 0.08) score -= 0.15;
  return Math.max(0, Math.min(1, score));
}

function traitVariance(traits: import("./simulationTypes.js").PersonalityTraits[]): number {
  if (traits.length < 2) return 0;
  const keys = ["curiosity", "persistence", "distractibility"] as const;
  let sum = 0;
  for (const k of keys) {
    const vals = traits.map((t) => t[k]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    sum += vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
  }
  return sum / keys.length;
}

function hasAdaptiveAction(decisions: { action: string }[]): boolean {
  return decisions.some(
    (d) =>
      d.action === "ADJUST_DIFFICULTY" ||
      d.action === "SWAP_CONTENT" ||
      d.action === "INJECT_REWARD" ||
      d.action === "SHORTEN_SESSION",
  );
}

export function validateV1V2(sim: FullSimulationResult): LayerValidationResult {
  const details: string[] = [];
  let fail = false;

  for (const child of sim.children) {
    if (!child.ageBand) {
      fail = true;
      details.push(`${child.config.id}: missing ageBand`);
    }
    for (const session of child.sessions) {
      if (planModulesEmpty(session.plan)) {
        fail = true;
        details.push(`${child.config.id} session ${session.sessionIndex}: no modules`);
      }
      const ids = session.contentIds;
      const unique = new Set(ids);
      if (unique.size < ids.length && ids.length - unique.size > 1) {
        fail = true;
        details.push(
          `${child.config.id} session ${session.sessionIndex}: duplicate content in session`,
        );
      }
    }
    for (let i = 1; i < child.sessions.length; i++) {
      const prev = new Set(child.sessions[i - 1]!.contentIds);
      const cur = child.sessions[i]!.contentIds;
      const overlap = cur.filter((id) => prev.has(id));
      if (overlap.length === cur.length && cur.length > 2) {
        fail = true;
        details.push(
          `${child.config.id}: same content repeated across sessions ${i - 1} and ${i}`,
        );
      }
    }
  }

  return layer(
    "V1–V2 (Age + Content)",
    fail ? "fail" : "pass",
    fail
      ? "Age band, module selection, or anti-repetition checks failed"
      : "Age bands assigned, modules populated, no harmful repetition",
    details,
    fail
      ? ["Review moduleEngine filters and contentEngine freshness scoring"]
      : undefined,
  );
}

function planModulesEmpty(plan: ChildSimulationResult["sessions"][0]["plan"]): boolean {
  return plan.modules.length === 0 && plan.sessionPlan.length === 0;
}

export function validateV3(sim: FullSimulationResult): LayerValidationResult {
  const details: string[] = [];
  let failCount = 0;
  const latencies: number[] = [];
  let overreactions = 0;
  let overreactionTotal = 0;

  for (const child of sim.children) {
    for (const session of child.sessions) {
      const negatives = session.events.filter(
        (e) =>
          e.type === "CONTENT_SKIPPED" ||
          e.type === "USER_IDLE" ||
          e.metadata?.correct === false,
      );
      if (negatives.length < 3) continue;

      const adapted = hasAdaptiveAction(session.decisions);

      if (!adapted && negatives.length >= 3) {
        failCount += 1;
        details.push(
          `${child.config.id} s${session.sessionIndex}: no adaptation after ${negatives.length} negative signals`,
        );
      }

      for (const l of session.adaptationLatencies) latencies.push(l);
      for (const o of session.overreactionFlags) {
        overreactionTotal += 1;
        if (o) overreactions += 1;
      }

      const boredom = session.events.filter((e) => e.type === "USER_IDLE").length;
      const reward = session.decisions.some((d) => d.action === "INJECT_REWARD");
      if (boredom >= 2 && !reward && child.config.archetype === "bored_low_engagement") {
        details.push(
          `${child.config.id} s${session.sessionIndex}: warn — idle without reward (may be cooldown)`,
        );
      }
    }
  }

  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const overreactionRate =
    overreactionTotal > 0 ? overreactions / overreactionTotal : 0;

  if (avgLatency > ADAPTATION_LATENCY_FAIL) {
    failCount += 1;
    details.push(`avg adaptationLatency ${avgLatency.toFixed(2)} > ${ADAPTATION_LATENCY_FAIL}`);
  } else if (avgLatency > ADAPTATION_LATENCY_WARN) {
    details.push(`warn: avg adaptationLatency ${avgLatency.toFixed(2)}`);
  }
  if (overreactionRate > OVERREACTION_THRESHOLD) {
    failCount += 1;
    details.push(
      `overreactionRate ${(overreactionRate * 100).toFixed(0)}% > ${OVERREACTION_THRESHOLD * 100}%`,
    );
  }

  details.unshift(
    `avg adaptationLatency: ${avgLatency.toFixed(2)}`,
    `overreactionRate: ${(overreactionRate * 100).toFixed(1)}%`,
  );

  return layer(
    "V3 (Realtime Adaptation)",
    failCount > 0 ? "fail" : "pass",
    failCount > 0
      ? `${failCount} adaptation timing/overreaction issue(s)`
      : "Adaptation fast, stable, and not over-reactive",
    details.slice(0, 8),
    failCount > 0
      ? ["Tune realtimeDecisionEngine thresholds or rewardEngine cooldown"]
      : undefined,
  );
}

export function validateV4(sim: FullSimulationResult): LayerValidationResult {
  const { ml, rule } = sim.mlVsRuleBreakdown;
  const total = ml + rule;
  const mlUsageRate = getMlUsageRate(sim);
  const mode = sim.mlMode ?? "balanced";

  const rewards = sim.children.flatMap((c) => c.sessionRewards);
  const trend =
    rewards.length >= 2 ? rewards[rewards.length - 1]! - rewards[0]! : 0;

  const details = [
    `mode: ${mode} (threshold ${sim.mlMode ? "" : "default"})`,
    `mlVsRuleBreakdown: { ml: ${ml}, rule: ${rule} }`,
    `mlUsageRate: ${(mlUsageRate * 100).toFixed(1)}%`,
    `Avg reward trend: ${trend >= 0 ? "+" : ""}${trend.toFixed(3)}`,
  ];

  if (total === 0) {
    return layer(
      "V4 (ML Decisions)",
      "fail",
      "No NBA decisions recorded via onNbaDecision hook",
      details,
      ["Verify hybridDecision emitNbaDecision and simulation subscribe flow"],
    );
  }

  let status: LayerValidationResult["status"] = "pass";
  if (mode === "balanced") {
    if (mlUsageRate < ML_USAGE_BALANCED_MIN || mlUsageRate > ML_USAGE_BALANCED_MAX) {
      status = "fail";
      details.push(
        `balanced range ${ML_USAGE_BALANCED_MIN * 100}–${ML_USAGE_BALANCED_MAX * 100}% violated`,
      );
    }
  } else if (mode === "aggressive") {
    if (mlUsageRate <= ML_USAGE_AGGRESSIVE_MIN) {
      status = "fail";
      details.push(`aggressive mode expected > ${ML_USAGE_AGGRESSIVE_MIN * 100}%`);
    }
  } else if (mode === "conservative") {
    if (mlUsageRate >= ML_USAGE_CONSERVATIVE_MAX) {
      status = "fail";
      details.push(`conservative mode expected < ${ML_USAGE_CONSERVATIVE_MAX * 100}%`);
    }
  }

  return layer(
    "V4 (ML Decisions)",
    status,
    status === "pass"
      ? `ML usage ${(mlUsageRate * 100).toFixed(0)}% within ${mode} expectations`
      : `ML usage ${(mlUsageRate * 100).toFixed(0)}% outside ${mode} range`,
    details,
    status !== "pass"
      ? ["Tune minMlParticipationWeight per mode or bandit confidence calibration"]
      : undefined,
  );
}

export function validateMlEffectiveness(sim: FullSimulationResult): LayerValidationResult {
  const mlLift = computeMlLift(sim);
  const difficultyAdjustedLift = computeDifficultyAdjustedLift(sim);
  const details = [
    `mlLift: ${mlLift >= 0 ? "+" : ""}${mlLift.toFixed(4)}`,
    `difficultyAdjustedLift: ${difficultyAdjustedLift >= 0 ? "+" : ""}${difficultyAdjustedLift.toFixed(4)}`,
    `ml rewards: ${sim.mlRewardBreakdown.mlRewardCount}`,
    `rule rewards: ${sim.mlRewardBreakdown.ruleRewardCount}`,
  ];

  let status: LayerValidationResult["status"] = "pass";
  if (difficultyAdjustedLift <= 0) status = "fail";
  else if (mlLift <= 0) status = "fail";
  else if (mlLift < ML_LIFT_WARN) status = "warn";
  else if (
    mlLift > 0 &&
    difficultyAdjustedLift < mlLift * DIFFICULTY_LIFT_GAP_RATIO
  ) {
    status = "warn";
    details.push(
      "warn: difficultyAdjustedLift significantly lower than raw mlLift (possible easy-win lift)",
    );
  }

  return layer(
    "ML Effectiveness",
    status,
    status === "pass"
      ? `ML decisions outperform rules (lift +${mlLift.toFixed(3)}, adjusted +${difficultyAdjustedLift.toFixed(3)})`
      : status === "fail"
        ? difficultyAdjustedLift <= 0
          ? "Difficulty-adjusted ML lift not positive — lift may be artificial"
          : "ML not improving outcomes vs rule baseline"
        : "ML lift positive but small or difficulty-adjusted lift is weak",
    details,
    status !== "pass"
      ? ["Recalibrate bandit reward estimates or feature weights"]
      : undefined,
  );
}

export function validateDifficultyAdjustedLift(
  sim: FullSimulationResult,
): LayerValidationResult {
  const difficultyAdjustedLift = computeDifficultyAdjustedLift(sim);
  const mlLift = computeMlLift(sim);
  const fail = difficultyAdjustedLift <= 0;
  const warn =
    !fail &&
    mlLift > 0 &&
    difficultyAdjustedLift < mlLift * DIFFICULTY_LIFT_GAP_RATIO;

  return layer(
    "Difficulty-Adjusted ML Lift",
    fail ? "fail" : warn ? "warn" : "pass",
    fail
      ? `difficultyAdjustedLift ${difficultyAdjustedLift.toFixed(4)} ≤ 0`
      : warn
        ? `Adjusted lift ${difficultyAdjustedLift.toFixed(4)} much lower than mlLift ${mlLift.toFixed(4)}`
        : `Real learning lift after difficulty normalization (+${difficultyAdjustedLift.toFixed(3)})`,
    [
      `difficultyAdjustedLift: ${difficultyAdjustedLift >= 0 ? "+" : ""}${difficultyAdjustedLift.toFixed(4)}`,
      `mlLift: ${mlLift >= 0 ? "+" : ""}${mlLift.toFixed(4)}`,
    ],
    fail || warn
      ? ["Ensure ML wins on medium/hard contexts, not only easy content"]
      : undefined,
  );
}

export function validateDecisionConsistency(
  sim: FullSimulationResult,
): LayerValidationResult {
  const decisionConsistencyScore = computeDecisionConsistencyScore(sim);
  const fail = decisionConsistencyScore < DECISION_CONSISTENCY_FAIL;
  const warn =
    !fail && decisionConsistencyScore < DECISION_CONSISTENCY_WARN;

  return layer(
    "Decision Consistency",
    fail ? "fail" : warn ? "warn" : "pass",
    fail
      ? `decisionConsistencyScore ${decisionConsistencyScore.toFixed(2)} too low`
      : warn
        ? `Similar contexts show mixed actions (${decisionConsistencyScore.toFixed(2)})`
        : `Consistent actions in similar contexts (${decisionConsistencyScore.toFixed(2)})`,
    [`decisionConsistencyScore: ${decisionConsistencyScore.toFixed(2)}`],
    fail || warn
      ? ["Review feature clustering stability and NBA action tie-breaking"]
      : undefined,
  );
}

export function validateAdaptationDelay(
  sim: FullSimulationResult,
): LayerValidationResult {
  if (!sim.simulateLatency) {
    return layer(
      "Latency Simulation",
      "pass",
      "Latency simulation disabled for this run",
      ["simulateLatency: false"],
    );
  }

  const avgAdaptationDelayMs = computeAvgAdaptationDelayMs(sim);
  const fail = avgAdaptationDelayMs > ADAPTATION_DELAY_MS_FAIL;
  const warn =
    !fail && avgAdaptationDelayMs > ADAPTATION_DELAY_MS_WARN;

  return layer(
    "Latency Simulation",
    fail ? "fail" : warn ? "warn" : "pass",
    fail
      ? `adaptationDelayMs ${avgAdaptationDelayMs.toFixed(0)}ms > ${ADAPTATION_DELAY_MS_FAIL}ms`
      : warn
        ? `Adaptation delay ${avgAdaptationDelayMs.toFixed(0)}ms approaching limit`
        : `Realtime adaptation within latency budget (${avgAdaptationDelayMs.toFixed(0)}ms avg)`,
    [`adaptationDelayMs: ${avgAdaptationDelayMs.toFixed(0)}`],
    fail || warn
      ? ["Reduce decision pipeline latency or batch processing delays"]
      : undefined,
  );
}

export function validateBurstNoiseStability(
  sim: FullSimulationResult,
): LayerValidationResult {
  if (!sim.burstNoiseMode) {
    return layer(
      "Burst Noise Stability",
      "pass",
      "Burst noise mode disabled for this run",
      ["burstNoiseMode: false"],
    );
  }

  const burstNoiseStabilityScore = computeBurstNoiseStabilityScore(sim);
  const fail = burstNoiseStabilityScore < BURST_STABILITY_MIN;

  return layer(
    "Burst Noise Stability",
    fail ? "fail" : "pass",
    fail
      ? `burstNoiseStabilityScore ${burstNoiseStabilityScore.toFixed(2)} — instability under burst noise`
      : `Stable under burst noise (score ${burstNoiseStabilityScore.toFixed(2)})`,
    [
      `burstNoiseStabilityScore: ${burstNoiseStabilityScore.toFixed(2)}`,
      `burst sessions: ${sim.children.flatMap((c) => c.sessions.filter((s) => s.burstNoiseApplied)).length}`,
    ],
    fail
      ? ["Add hysteresis on difficulty drops and module swaps during noisy bursts"]
      : undefined,
  );
}

export function validateUxScore(sim: FullSimulationResult): LayerValidationResult {
  const uxScore = computeUxScore(sim);
  const fail = uxScore < UX_SCORE_FAIL;
  const warn = !fail && uxScore < UX_SCORE_WARN;
  const coherenceScore =
    sim.children
      .flatMap((c) => c.sessions.map((s) => s.coherenceScore))
      .reduce((a, b) => a + b, 0) /
    Math.max(1, sim.children.reduce((a, c) => a + c.sessions.length, 0));

  return layer(
    "UX Proxy Score",
    fail ? "fail" : warn ? "warn" : "pass",
    fail
      ? `uxScore ${uxScore.toFixed(2)} below ${UX_SCORE_FAIL}`
      : warn
        ? `UX proxy ${uxScore.toFixed(2)} below ideal ${UX_SCORE_WARN}`
        : `Smooth user experience proxy (${uxScore.toFixed(2)})`,
    [
      `uxScore: ${uxScore.toFixed(2)}`,
      `coherence: ${coherenceScore.toFixed(2)}`,
    ],
    fail || warn
      ? ["Balance adaptation speed, coherence, and reward smoothness"]
      : undefined,
  );
}

export function validateRewardSmoothness(
  sim: FullSimulationResult,
): LayerValidationResult {
  const rewardVariance = computeRewardVariance(sim);
  const tooHigh = rewardVariance > REWARD_VARIANCE_TOO_HIGH;
  const tooLow = rewardVariance < REWARD_VARIANCE_TOO_LOW;
  const fail = tooHigh || tooLow;

  return layer(
    "Reward Smoothness",
    fail ? "fail" : "pass",
    tooHigh
      ? `rewardVariance ${rewardVariance.toFixed(4)} too high (spiky experience)`
      : tooLow
        ? `rewardVariance ${rewardVariance.toFixed(4)} too low (flat experience)`
        : `Reward trajectory smooth (variance ${rewardVariance.toFixed(4)})`,
    [`rewardVariance: ${rewardVariance.toFixed(4)}`],
    fail
      ? ["Tune rewardEngine smoothing and avoid abrupt engagement swings"]
      : undefined,
  );
}

export function validateUnderreaction(sim: FullSimulationResult): LayerValidationResult {
  const underreactionRate = computeUnderreactionRate(sim);
  const fail = underreactionRate > UNDERREACTION_THRESHOLD;

  return layer(
    "Underreaction Detection",
    fail ? "fail" : "pass",
    fail
      ? `underreactionRate ${(underreactionRate * 100).toFixed(0)}% > ${UNDERREACTION_THRESHOLD * 100}%`
      : `System adapts after sustained negative signals (${(underreactionRate * 100).toFixed(1)}%)`,
    [`underreactionRate: ${(underreactionRate * 100).toFixed(1)}%`],
    fail ? ["Lower adaptation thresholds in realtimeDecisionEngine"] : undefined,
  );
}

export function validatePersonalityImpact(
  sim: FullSimulationResult,
): LayerValidationResult {
  const score = computePersonalityImpactScore(sim);
  const fail = score < PERSONALITY_IMPACT_MIN;

  const details = [
    `personalityImpactScore: ${score.toFixed(2)}`,
    ...sim.children.map(
      (c) =>
        `${c.config.id}: ${c.personalityInfluencedDecisions}/${c.totalAdaptiveDecisions} trait-aligned decisions`,
    ),
  ];

  return layer(
    "Personality Impact",
    fail ? "fail" : "pass",
    fail
      ? "Traits do not sufficiently influence adaptive decisions"
      : "Personality traits correlate with session decisions",
    details.slice(0, 6),
    fail ? ["Wire personalityEngine into hybridDecision feature weights"] : undefined,
  );
}

export function validateNoiseRobustness(
  sim: FullSimulationResult,
): LayerValidationResult {
  if (!sim.injectNoise) {
    return layer(
      "Noise Robustness",
      "pass",
      "Noise injection disabled for this run",
      ["injectNoise: false"],
    );
  }

  const score = computeNoiseRobustnessScore(sim);
  const fail = score < NOISE_ROBUSTNESS_MIN;

  return layer(
    "Noise Robustness",
    fail ? "fail" : "pass",
    fail
      ? `noiseRobustnessScore ${score.toFixed(2)} below ${NOISE_ROBUSTNESS_MIN}`
      : `Stable under ${sim.noiseEventCount} noisy events (score ${score.toFixed(2)})`,
    [
      `noiseRobustnessScore: ${score.toFixed(2)}`,
      `noisy events: ${sim.noiseEventCount}`,
      `underreactionRate: ${(computeUnderreactionRate(sim) * 100).toFixed(1)}%`,
    ],
    fail ? ["Harden realtime pipeline against malformed events"] : undefined,
  );
}

export function validateV5(sim: FullSimulationResult): LayerValidationResult {
  const finals = sim.children.map((c) => c.finalPersonality.traits);
  const keys = ["curiosity", "persistence", "distractibility"] as const;

  let maxSpread = 0;
  for (const k of keys) {
    const vals = finals.map((t) => t[k]);
    maxSpread = Math.max(maxSpread, Math.max(...vals) - Math.min(...vals));
  }

  const stabilityScores = sim.children.map((c) =>
    traitVariance(c.personalitySnapshots),
  );
  const traitStability =
    stabilityScores.reduce((a, b) => a + b, 0) /
    Math.max(1, stabilityScores.length);

  const details: string[] = [
    `traitStability (avg variance): ${traitStability.toFixed(4)}`,
    `cross-child spread: ${maxSpread.toFixed(2)}`,
  ];

  let fail = false;
  let warn = false;
  if (maxSpread < PERSONALITY_DIVERGENCE_MIN) fail = true;
  if (traitStability > TRAIT_STABILITY_MAX) fail = true;
  if (traitStability < TRAIT_STABILITY_MIN) fail = true;

  for (const child of sim.children) {
    const snaps = child.personalitySnapshots;
    if (snaps.length < 2) continue;
    const first = snaps[0]!;
    const last = snaps[snaps.length - 1]!;
    const dCuriosity = last.curiosity - first.curiosity;
    const dDistraction = last.distractibility - first.distractibility;

    if (child.config.archetype === "fast_curiosity" && dCuriosity <= 0) {
      warn = true;
      details.push(`${child.config.id}: warn — curiosity flat/down (fast learner)`);
    }
    if (child.config.archetype === "bored_low_engagement" && dDistraction <= 0) {
      warn = true;
      details.push(`${child.config.id}: warn — distractibility flat/down (bored)`);
    }
  }

  return layer(
    "V5 (Personality Evolution)",
    fail ? "fail" : warn ? "warn" : "pass",
    fail
      ? "Personality noisy, static, or wrong directional drift"
      : `Traits stable (${traitStability.toFixed(3)}) and archetypes diverge (${maxSpread.toFixed(2)})`,
    details,
    fail
      ? ["Tune TRAIT_EMA_ALPHA; align event generators with archetype expectations"]
      : undefined,
  );
}

function spread(vals: number[]): number {
  if (vals.length === 0) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

export function computeMeanPredictionError(sim: FullSimulationResult): number {
  let errorSum = 0;
  let n = 0;
  for (const child of sim.children) {
    for (let i = 0; i < child.predictions.length; i++) {
      const pred = child.predictions[i]!;
      const actualDiff =
        child.sessions[i]?.recommendedDifficulty ?? "medium";
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      const predLevel = diffOrder[pred.recommendedDifficulty];
      const actLevel = diffOrder[actualDiff as keyof typeof diffOrder] ?? 1;
      errorSum += Math.abs(predLevel - actLevel) / 2;
      const disengaged =
        child.config.archetype === "bored_low_engagement" ||
        child.config.skipRate > 0.15;
      const drift = correctPredictionDrift(pred, {
        engagementScore: disengaged ? 35 : 72,
        skips: disengaged ? 3 : 0,
        sessionLengthMinutes: disengaged ? 3 : 12,
        completed: !disengaged,
      });
      errorSum += drift.mismatch;
      n += 1;
    }
  }
  return n > 0 ? errorSum / n : 0;
}

export function computeDirectionAccuracy(sim: FullSimulationResult): number {
  let correct = 0;
  let total = 0;
  for (const child of sim.children) {
    for (let i = 1; i < child.predictions.length; i++) {
      const prev = child.predictions[i - 1]!;
      const cur = child.predictions[i]!;
      const prevEng = prev.predictedEngagement;
      const curEng = cur.predictedEngagement;
      const actualUp =
        (child.sessions[i]?.sessionEngagement ?? 0) >=
        (child.sessions[i - 1]?.sessionEngagement ?? 0);
      const predictedUp = curEng >= prevEng;
      if (actualUp === predictedUp) correct += 1;
      total += 1;
    }
  }
  return total > 0 ? correct / total : 0.75;
}

export function validateV6(sim: FullSimulationResult): LayerValidationResult {
  const predictionError = computeMeanPredictionError(sim);
  const directionAccuracy = computeDirectionAccuracy(sim);
  const fail =
    predictionError > PREDICTION_ERROR_THRESHOLD ||
    directionAccuracy < DIRECTION_ACCURACY_MIN;

  const details = [
    `predictionError: ${predictionError.toFixed(2)}`,
    `directionAccuracy: ${(directionAccuracy * 100).toFixed(1)}%`,
  ];

  return layer(
    "V6 (Prediction Accuracy)",
    fail ? "fail" : "pass",
    fail
      ? "Prediction magnitude or direction below threshold"
      : "Prediction error and direction trend acceptable",
    details,
    fail
      ? ["Run predictionDrift correction; improve engagement trend model"]
      : undefined,
  );
}

export function validateV7(sim: FullSimulationResult): LayerValidationResult {
  let fail = false;
  const details: string[] = [];

  for (const child of sim.children) {
    for (const session of child.sessions) {
      const seq = session.tutorTurnSequence;
      if (seq.length === 0) continue;

      const hasExplain = seq.includes("explain");
      const hasAsk = seq.includes("ask");
      const hasIntro = hasExplain || hasAsk;
      const hasEvaluate = seq.includes("correct") || seq.includes("encourage");
      if (seq.length >= 2 && !(hasIntro && hasAsk && hasEvaluate)) {
        fail = true;
        details.push(
          `${child.config.id} s${session.sessionIndex}: missing explain→ask→evaluate→adapt (${seq.join("→")})`,
        );
      }

      const sessionMsgs = child.tutorMessages.slice(
        session.sessionIndex * 2,
        session.sessionIndex * 2 + 3,
      );
      const msgCounts = new Map<string, number>();
      for (const m of sessionMsgs) {
        msgCounts.set(m, (msgCounts.get(m) ?? 0) + 1);
      }
      for (const [, count] of msgCounts) {
        if (count > TUTOR_REPEAT_MAX) {
          fail = true;
          details.push(
            `${child.config.id} s${session.sessionIndex}: tutor response repeated ${count} times`,
          );
        }
      }
    }

    const modes = new Set(child.tutorModes);
    if (modes.size < 2 && child.tutorModes.length >= 2) {
      fail = true;
      details.push(`${child.config.id}: tutor modes did not vary`);
    }
  }

  return layer(
    "V7 (Tutor Behavior)",
    fail ? "fail" : "pass",
    fail
      ? "Tutor loop incomplete or repetitive"
      : "Tutor explain→ask→evaluate loop with variety",
    details.slice(0, 6),
    fail ? ["Review errorCorrection flow and adaptTeachingStyle thresholds"] : undefined,
  );
}

export function validateV8(sim: FullSimulationResult): LayerValidationResult {
  const f = sim.family;
  const fail = !f.hasSiblingInfluence;
  return layer(
    "V8 (Family System)",
    fail ? "fail" : "pass",
    fail
      ? "Sibling influence signals not applied"
      : "Sibling dynamics active without negative child-facing comparison",
    [
      `children: ${f.childIds.join(", ")}`,
      `internal comparison safe: ${f.hasInternalComparisonOnly}`,
      `exploration boost: ${f.explorationBoostApplied}`,
    ],
    fail ? ["Run refreshFamilyIntelligence with 2+ snapshots"] : undefined,
  );
}

export function validateV9(sim: FullSimulationResult): LayerValidationResult {
  const g = sim.global;
  const fail = g.coldStartPathLength < 2;
  return layer(
    "V9 (Global Intelligence)",
    fail ? "fail" : "pass",
    fail
      ? "Cold start path not assigned"
      : "Global graph informs path and ranking",
    [
      `recommended path length: ${g.coldStartPathLength}`,
      `ranking/path nudge applied: ${g.rankingBoostApplied}`,
    ],
    fail ? ["Seed globalGraph and ensure ensureGlobalGraphLoaded runs"] : undefined,
  );
}

export function validateV10(
  sim: FullSimulationResult,
  optimization?: FullSimulationResult["optimizationComparison"],
): LayerValidationResult {
  const m = sim.meta;
  const metaSkipped = m.cyclesRun === 0 && !m.experimentsCreated && !m.modelLifecycleRan;

  if (metaSkipped && !optimization) {
    return layer(
      "V10 (Autonomous Optimization)",
      "pass",
      "Meta layer skipped; optimization validated separately",
      ["skipMetaLayer: true"],
    );
  }

  const changed = Math.abs(m.finalExplorationRate - m.initialExplorationRate) > 0.001;
  let fail = !changed && !m.experimentsCreated;

  const details = [
    `exploration ${m.initialExplorationRate.toFixed(3)} → ${m.finalExplorationRate.toFixed(3)}`,
    `experiments: ${m.experimentsCreated}`,
    `model lifecycle: ${m.modelLifecycleRan}`,
  ];

  if (optimization) {
    details.push(
      `baseline engagement ${optimization.baselineEngagement.toFixed(1)} → optimized ${optimization.optimizedEngagement.toFixed(1)}`,
      `baseline reward ${optimization.baselineReward.toFixed(3)} → optimized ${optimization.optimizedReward.toFixed(3)}`,
      `baseline drop-off ${optimization.baselineDropOff.toFixed(2)} → optimized ${optimization.optimizedDropOff.toFixed(2)}`,
      `coherence ${optimization.baselineCoherence.toFixed(2)} → ${optimization.optimizedCoherence.toFixed(2)}`,
      `oscillation ${optimization.baselineOscillation.toFixed(2)} → ${optimization.optimizedOscillation.toFixed(2)}`,
      `stabilityDelta: ${optimization.stabilityDelta >= 0 ? "+" : ""}${optimization.stabilityDelta.toFixed(3)}`,
      `oscillationDelta: ${optimization.oscillationDelta >= 0 ? "+" : ""}${optimization.oscillationDelta.toFixed(3)}`,
    );
    if (!optimization.improved) {
      fail = true;
      details.push("NO_OPTIMIZATION_IMPROVEMENT: metrics did not improve");
    }
    if (!optimization.coherenceStable) {
      fail = true;
      details.push(
        "OPTIMIZATION_INSTABILITY: reward improved but coherence dropped significantly",
      );
    }
    if (!optimization.uxStable) {
      fail = true;
      details.push(
        "OPTIMIZATION_UX_TRADEOFF: optimization increased oscillation without UX stability",
      );
    }
  }

  return layer(
    "V10 (Autonomous Optimization)",
    fail ? "fail" : "pass",
    fail
      ? "Meta layer did not improve system vs baseline"
      : "Auto-tuning improves engagement/reward vs baseline",
    details,
    fail
      ? ["Run runMetaLearningCycle with metric samples; check human override freeze"]
      : undefined,
  );
}

export function validateSessionCoherence(sim: FullSimulationResult): LayerValidationResult {
  const scores = sim.children.flatMap((c) =>
    c.sessions.map((s) => s.coherenceScore),
  );
  const coherenceScore =
    scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  const fail = coherenceScore < COHERENCE_MIN;

  return layer(
    "Session Coherence",
    fail ? "fail" : "pass",
    fail
      ? `coherenceScore ${coherenceScore.toFixed(2)} below ${COHERENCE_MIN}`
      : `Session flow coherent (avg ${coherenceScore.toFixed(2)})`,
    [`sessions scored: ${scores.length}`],
    fail ? ["Review sessionEngine module ordering rules"] : undefined,
  );
}

function hasRapidDifficultyFlipFlop(actions: NbaAction[]): boolean {
  const diffOnly = actions.filter(
    (a) => a === "INCREASE_DIFFICULTY" || a === "DECREASE_DIFFICULTY",
  );
  if (diffOnly.length < 3) return false;
  let flips = 0;
  for (let i = 1; i < diffOnly.length; i++) {
    if (diffOnly[i] !== diffOnly[i - 1]) flips += 1;
  }
  return flips >= 2;
}

export function validateStability(sim: FullSimulationResult): LayerValidationResult {
  const details: string[] = [];
  let flipSessions = 0;
  let sessionCount = 0;

  for (const child of sim.children) {
    for (const session of child.sessions) {
      sessionCount += 1;
      const actions = session.decisions
        .map((d) => d.nbaAction)
        .filter(Boolean) as NbaAction[];
      if (hasRapidDifficultyFlipFlop(actions)) {
        flipSessions += 1;
        details.push(
          `${child.config.id} s${session.sessionIndex}: difficulty flip-flop in session`,
        );
      }
    }

    const diffs = child.difficultyLevels;
    let flips = 0;
    for (let i = 1; i < diffs.length; i++) {
      if (diffs[i] !== diffs[i - 1]) flips += 1;
    }
    if (flips > 7) {
      details.push(`${child.config.id}: warn — frequent plan-level difficulty changes (${flips})`);
    }
  }

  const flipRate = sessionCount > 0 ? flipSessions / sessionCount : 0;
  const fail = flipRate > 0.5;

  return layer(
    "Stability",
    fail ? "fail" : "pass",
    fail
      ? `Oscillation in ${(flipRate * 100).toFixed(0)}% of sessions (max 50%)`
      : "Sessions remain coherent without excessive oscillation",
    details.slice(0, 6),
    fail ? ["Review oscillationGuard and maxTuningDeltaPerCycle in policyEngine"] : undefined,
  );
}

export function computeSystemMetrics(sim: FullSimulationResult): SystemMetrics {
  const mlVsRuleBreakdown = { ...sim.mlVsRuleBreakdown };
  const mlUsageRatio = getMlUsageRate(sim);

  const engagements = sim.children.map((c) => c.finalProfile.behavior.engagementScore);
  const rewards = sim.children.flatMap((c) => c.sessionRewards);
  const rewardTrend =
    rewards.length >= 2
      ? (rewards[rewards.length - 1]! - rewards[0]!) / rewards.length
      : 0;

  const allLatencies = sim.children.flatMap((c) =>
    c.sessions.flatMap((s) => s.adaptationLatencies),
  );
  const avgLatency =
    allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;

  const overFlags = sim.children.flatMap((c) =>
    c.sessions.flatMap((s) => s.overreactionFlags),
  );
  const overreactionRate =
    overFlags.length > 0
      ? overFlags.filter(Boolean).length / overFlags.length
      : 0;

  const traitStability =
    sim.children
      .map((c) => traitVariance(c.personalitySnapshots))
      .reduce((a, b) => a + b, 0) / Math.max(1, sim.children.length);

  const coherenceScore =
    sim.children
      .flatMap((c) => c.sessions.map((s) => s.coherenceScore))
      .reduce((a, b) => a + b, 0) /
    Math.max(
      1,
      sim.children.reduce((a, c) => a + c.sessions.length, 0),
    );

  const bored = sim.children.find((c) => c.config.archetype === "bored_low_engagement");
  const fast = sim.children.find((c) => c.config.archetype === "fast_curiosity");
  const dropOffReduction =
    bored && fast
      ? Math.max(
          0,
          ((bored.finalProfile.behavior.engagementScore -
            fast.finalProfile.behavior.engagementScore) /
            100) *
            -1 +
            0.15,
        ) * 100
      : 5;

  const exploreChild = sim.children[0]!;
  const exploreSessions = exploreChild.sessions.filter((s) =>
    s.plan.personalizationMeta.explorationTriggered,
  );

  const mlLift = computeMlLift(sim);
  const underreactionRate = computeUnderreactionRate(sim);
  const personalityImpactScore = computePersonalityImpactScore(sim);
  const noiseRobustnessScore = computeNoiseRobustnessScore(sim);
  const stabilityDelta = sim.optimizationComparison?.stabilityDelta ?? 0;
  const difficultyAdjustedLift = computeDifficultyAdjustedLift(sim);
  const decisionConsistencyScore = computeDecisionConsistencyScore(sim);
  const avgAdaptationDelayMs = computeAvgAdaptationDelayMs(sim);
  const burstNoiseStabilityScore = computeBurstNoiseStabilityScore(sim);
  const rewardVariance = computeRewardVariance(sim);
  const uxScore = computeUxScore(sim, {
    coherenceScore,
    avgAdaptationDelayMs,
    avgAdaptationLatency: avgLatency,
    rewardVariance,
  });

  return {
    avgEngagementScore:
      engagements.reduce((a, b) => a + b, 0) / Math.max(1, engagements.length),
    avgRewardTrend: rewardTrend,
    mlUsageRatio,
    mlVsRuleBreakdown,
    predictionError: computeMeanPredictionError(sim),
    directionAccuracy: computeDirectionAccuracy(sim),
    avgAdaptationLatency: avgLatency,
    overreactionRate,
    traitStability,
    coherenceScore,
    dropOffReductionPct: Math.min(100, Math.max(0, dropOffReduction)),
    explorationEffectiveness:
      exploreSessions.length / Math.max(1, exploreChild.sessions.length),
    mlAccuracy: mlUsageRatio,
    mlLift,
    underreactionRate,
    stabilityDelta,
    personalityImpactScore,
    noiseRobustnessScore,
    difficultyAdjustedLift,
    decisionConsistencyScore,
    avgAdaptationDelayMs,
    burstNoiseStabilityScore,
    uxScore,
    rewardVariance,
  };
}

export function collectFailureFlags(
  layers: LayerValidationResult[],
  metrics: SystemMetrics,
  optimization?: FullSimulationResult["optimizationComparison"],
): FailureFlag[] {
  const flags: FailureFlag[] = [];

  if (metrics.mlLift <= 0) {
    flags.push({
      code: "ML_NOT_EFFECTIVE",
      message: `mlLift ${metrics.mlLift.toFixed(4)} — ML not outperforming rules`,
      severity: "critical",
    });
  } else if (metrics.mlLift < ML_LIFT_WARN) {
    flags.push({
      code: "ML_NOT_EFFECTIVE",
      message: `mlLift ${metrics.mlLift.toFixed(4)} is small`,
      severity: "warning",
    });
  }
  if (metrics.difficultyAdjustedLift <= 0) {
    flags.push({
      code: "ML_FAKE_LIFT",
      message: `difficultyAdjustedLift ${metrics.difficultyAdjustedLift.toFixed(4)} ≤ 0 — lift not real after difficulty normalization`,
      severity: "critical",
    });
  } else if (
    metrics.mlLift > 0 &&
    metrics.difficultyAdjustedLift < metrics.mlLift * DIFFICULTY_LIFT_GAP_RATIO
  ) {
    flags.push({
      code: "ML_FAKE_LIFT",
      message: `difficultyAdjustedLift ${metrics.difficultyAdjustedLift.toFixed(4)} much lower than mlLift ${metrics.mlLift.toFixed(4)}`,
      severity: "warning",
    });
  }
  if (metrics.decisionConsistencyScore < DECISION_CONSISTENCY_FAIL) {
    flags.push({
      code: "LOW_DECISION_CONSISTENCY",
      message: `decisionConsistencyScore ${metrics.decisionConsistencyScore.toFixed(2)}`,
      severity: "critical",
    });
  } else if (metrics.decisionConsistencyScore < DECISION_CONSISTENCY_WARN) {
    flags.push({
      code: "LOW_DECISION_CONSISTENCY",
      message: `decisionConsistencyScore ${metrics.decisionConsistencyScore.toFixed(2)} — inconsistent behavior in similar contexts`,
      severity: "warning",
    });
  }
  if (
    metrics.avgAdaptationDelayMs > ADAPTATION_DELAY_MS_FAIL &&
    metrics.avgAdaptationDelayMs > 0
  ) {
    flags.push({
      code: "HIGH_ADAPTATION_DELAY",
      message: `adaptationDelayMs ${metrics.avgAdaptationDelayMs.toFixed(0)} > ${ADAPTATION_DELAY_MS_FAIL}`,
      severity: "critical",
    });
  } else if (
    metrics.avgAdaptationDelayMs > ADAPTATION_DELAY_MS_WARN &&
    metrics.avgAdaptationDelayMs > 0
  ) {
    flags.push({
      code: "HIGH_ADAPTATION_DELAY",
      message: `adaptationDelayMs ${metrics.avgAdaptationDelayMs.toFixed(0)} approaching limit`,
      severity: "warning",
    });
  }
  if (
    metrics.burstNoiseStabilityScore < BURST_STABILITY_MIN &&
    metrics.burstNoiseStabilityScore < 1
  ) {
    flags.push({
      code: "BURST_NOISE_INSTABILITY",
      message: `burstNoiseStabilityScore ${metrics.burstNoiseStabilityScore.toFixed(2)}`,
      severity: "critical",
    });
  }
  if (metrics.uxScore < UX_SCORE_FAIL) {
    flags.push({
      code: "LOW_UX_SCORE",
      message: `uxScore ${metrics.uxScore.toFixed(2)} below ${UX_SCORE_FAIL}`,
      severity: "critical",
    });
  } else if (metrics.uxScore < UX_SCORE_WARN) {
    flags.push({
      code: "LOW_UX_SCORE",
      message: `uxScore ${metrics.uxScore.toFixed(2)} below ideal ${UX_SCORE_WARN}`,
      severity: "warning",
    });
  }
  if (
    metrics.rewardVariance > REWARD_VARIANCE_TOO_HIGH ||
    metrics.rewardVariance < REWARD_VARIANCE_TOO_LOW
  ) {
    flags.push({
      code: "REWARD_INSTABILITY",
      message: `rewardVariance ${metrics.rewardVariance.toFixed(4)} out of smooth range`,
      severity: "critical",
    });
  }
  if (metrics.underreactionRate > UNDERREACTION_THRESHOLD) {
    flags.push({
      code: "UNDERREACTION",
      message: `underreactionRate ${(metrics.underreactionRate * 100).toFixed(0)}%`,
      severity: "critical",
    });
  }
  if (metrics.personalityImpactScore < PERSONALITY_IMPACT_MIN) {
    flags.push({
      code: "PERSONALITY_NO_IMPACT",
      message: `personalityImpactScore ${metrics.personalityImpactScore.toFixed(2)}`,
      severity: "critical",
    });
  }
  if (metrics.noiseRobustnessScore < NOISE_ROBUSTNESS_MIN && metrics.noiseRobustnessScore < 1) {
    flags.push({
      code: "LOW_NOISE_ROBUSTNESS",
      message: `noiseRobustnessScore ${metrics.noiseRobustnessScore.toFixed(2)}`,
      severity: "warning",
    });
  }
  if (optimization && !optimization.coherenceStable) {
    flags.push({
      code: "OPTIMIZATION_INSTABILITY",
      message: `stabilityDelta ${optimization.stabilityDelta.toFixed(3)} — coherence degraded`,
      severity: "critical",
    });
  }
  if (optimization && !optimization.uxStable) {
    flags.push({
      code: "OPTIMIZATION_UX_TRADEOFF",
      message: `oscillationDelta ${optimization.oscillationDelta.toFixed(3)} — optimization hurt UX stability`,
      severity: "critical",
    });
  }

  if (metrics.mlUsageRatio < ML_USAGE_BALANCED_MIN) {
    flags.push({
      code: "LOW_ML_USAGE",
      message: `mlUsageRate ${(metrics.mlUsageRatio * 100).toFixed(0)}% < ${ML_USAGE_BALANCED_MIN * 100}%`,
      severity: "critical",
    });
  } else if (
    metrics.mlUsageRatio > ML_USAGE_BALANCED_MAX &&
    metrics.mlUsageRatio > ML_USAGE_AGGRESSIVE_MIN
  ) {
    flags.push({
      code: "LOW_ML_USAGE",
      message: `mlUsageRate ${(metrics.mlUsageRatio * 100).toFixed(0)}% above balanced max`,
      severity: "warning",
    });
  }
  if (metrics.predictionError > PREDICTION_ERROR_THRESHOLD) {
    flags.push({
      code: "HIGH_PREDICTION_ERROR",
      message: `Prediction error ${metrics.predictionError.toFixed(2)} exceeds threshold`,
      severity: "critical",
    });
  }
  if (metrics.directionAccuracy < DIRECTION_ACCURACY_MIN) {
    flags.push({
      code: "LOW_PREDICTION_DIRECTION_ACCURACY",
      message: `directionAccuracy ${(metrics.directionAccuracy * 100).toFixed(0)}% < ${DIRECTION_ACCURACY_MIN * 100}%`,
      severity: "critical",
    });
  }
  if (metrics.avgAdaptationLatency > ADAPTATION_LATENCY_FAIL) {
    flags.push({
      code: "HIGH_ADAPTATION_LATENCY",
      message: `adaptationLatency ${metrics.avgAdaptationLatency.toFixed(2)} > ${ADAPTATION_LATENCY_FAIL}`,
      severity: "critical",
    });
  } else if (metrics.avgAdaptationLatency > ADAPTATION_LATENCY_WARN) {
    flags.push({
      code: "HIGH_ADAPTATION_LATENCY",
      message: `adaptationLatency ${metrics.avgAdaptationLatency.toFixed(2)} > ${ADAPTATION_LATENCY_WARN}`,
      severity: "warning",
    });
  }
  if (metrics.overreactionRate > OVERREACTION_THRESHOLD) {
    flags.push({
      code: "OVERREACTION",
      message: `overreactionRate ${(metrics.overreactionRate * 100).toFixed(0)}%`,
      severity: "critical",
    });
  }
  if (
    metrics.traitStability > TRAIT_STABILITY_MAX ||
    metrics.traitStability < TRAIT_STABILITY_MIN
  ) {
    flags.push({
      code: "UNSTABLE_PERSONALITY",
      message: `traitStability ${metrics.traitStability.toFixed(4)} out of range`,
      severity: "warning",
    });
  }
  if (metrics.coherenceScore < COHERENCE_MIN) {
    flags.push({
      code: "LOW_SESSION_COHERENCE",
      message: `coherenceScore ${metrics.coherenceScore.toFixed(2)}`,
      severity: "warning",
    });
  }
  if (optimization && !optimization.improved) {
    flags.push({
      code: "NO_OPTIMIZATION_IMPROVEMENT",
      message: "Optimized run did not beat baseline on engagement/reward/drop-off",
      severity: "critical",
    });
  }

  for (const l of layers) {
    if (
      l.layer.includes("Tutor") &&
      l.status === "fail" &&
      l.details?.some((d) => d.includes("repeated"))
    ) {
      flags.push({
        code: "TUTOR_PATTERN_REPETITION",
        message: l.message,
        severity: "critical",
      });
    }
  }

  for (const l of layers) {
    if (l.status === "fail") {
      flags.push({
        code: `LAYER_FAIL_${l.layer.replace(/[^A-Z0-9]/gi, "_")}`,
        message: l.message,
        severity: "critical",
      });
    }
  }

  return flags;
}

export function validateAllLayers(
  sim: FullSimulationResult,
  optimization?: FullSimulationResult["optimizationComparison"],
): LayerValidationResult[] {
  return [
    validateV1V2(sim),
    validateV3(sim),
    validateV4(sim),
    validateMlEffectiveness(sim),
    validateDifficultyAdjustedLift(sim),
    validateDecisionConsistency(sim),
    validateUnderreaction(sim),
    validateV5(sim),
    validatePersonalityImpact(sim),
    validateV6(sim),
    validateV7(sim),
    validateV8(sim),
    validateV9(sim),
    validateV10(sim, optimization),
    validateSessionCoherence(sim),
    validateNoiseRobustness(sim),
    validateAdaptationDelay(sim),
    validateBurstNoiseStability(sim),
    validateRewardSmoothness(sim),
    validateUxScore(sim),
    validateStability(sim),
  ];
}
