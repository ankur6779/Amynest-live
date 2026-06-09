/**
 * Audio Health Gate — deployment-blocking evaluation from live metrics + probe results.
 * Used by audio-health-gate-runner.ts (CI + admin dashboard).
 */

export const AUDIO_GATE_THRESHOLDS = {
  maxFailureRate: 0.02,
  maxTimeoutRate: 0.01,
  minWarmupSuccessRate: 0.95,
  maxFailedJobs: 50,
  maxStalledJobs: 0,
  maxTtfaMs: 2500,
  minCacheHitRate: 0.7,
  maxWarmupFailureRate: 0.05,
  orphanSpikeMultiplier: 5,
} as const;

export const AUDIO_GATE_PHASE_NAMES = {
  infra: "Infrastructure",
  log: "Log analysis (24h)",
  queue: "Queue health",
  tts: "TTS health",
  prewarm: "Prewarm health",
  static: "Static audio health",
  cache: "Cache health",
  orphan: "Orphan health",
  security: "Security health",
} as const;

export type GateDecision = "PASS" | "WARNING" | "FAIL";

export type GatePhaseStatus = "PASS" | "WARNING" | "FAIL" | "SKIPPED";

export type GateCategoryKey =
  | "Prewarm"
  | "TTS"
  | "Queue"
  | "Playback"
  | "Cache"
  | "Security"
  | "Storage"
  | "Observability";

export type GateCategoryResult = {
  score: number | null;
  status: "pass" | "warn" | "fail" | "skip";
  issues: string[];
};

export type GatePhaseResult = {
  name: string;
  status: GatePhaseStatus;
  metrics: Record<string, unknown>;
  blockers: string[];
  warnings: string[];
};

export type AudioHealthGateMetrics = {
  totalAudioRequests: number;
  totalFailures: number;
  failureRate: number;
  timeoutRate: number;
  cacheHitRate: number;
  cacheHitRateVerified: boolean;
  warmupSuccessRate: number | null;
  queueSuccessRate: number | null;
  ttfaMs: number | null;
  generationLatencyMs: number | null;
  cacheLatencyMs: number | null;
  failedJobs: number;
  stalledJobs: number;
  waitingJobs: number;
  activeJobs: number;
  orphanCount: number | null;
  staticSamplesOk: number;
  staticSamplesTotal: number;
};

export type AudioHealthGateReport = {
  generatedAt: string;
  decision: GateDecision;
  score: number;
  categories: Record<GateCategoryKey, GateCategoryResult>;
  phases: GatePhaseResult[];
  metrics: AudioHealthGateMetrics;
  blockers: string[];
  warnings: string[];
};

export type LogAnalysisInput = {
  totalRequests: number;
  failureRate: number;
  timeoutRate: number;
  errorPatterns?: Partial<Record<string, number>>;
  sampleCount?: number;
};

export type QueueHealthInput = {
  redisReachable: boolean;
  workerAvailable: boolean;
  queueMode: string;
  failedJobs: number;
  stalledJobs: number;
  waitingJobs: number;
  activeJobs: number;
};

export type TtsHealthInput = {
  generationOk: boolean;
  playbackUrlValid: boolean;
  ttfaMs: number | null;
  generationLatencyMs: number | null;
  cacheLatencyMs: number | null;
  openAiConfigured: boolean;
  storageOk: boolean;
};

export type PrewarmHealthInput = {
  warmupSuccessRate: number | null;
  lockOk: boolean;
  recentWarmupFailures: number;
  recentWarmupTotal: number;
};

export type StaticAudioSample = {
  hash: string;
  ok: boolean;
  status: number;
  contentLength: number;
  contentType: string;
  error?: string;
};

export type CacheHealthInput = {
  hitRate: number;
  hitRateVerified: boolean;
  memoryOk: boolean;
  redisOk: boolean;
  gcsOk: boolean;
  postgresOk: boolean;
};

export type OrphanHealthInput = {
  orphans: number;
  scanned: number;
  weeklyAverageOrphans: number | null;
};

export type SecurityHealthInput = {
  staticMissingPostProtected: boolean;
  adminDashboardProtected: boolean;
  adminSystemHealthProtected: boolean;
  storyStreamRequiresAuth: boolean | null;
};

export type AudioHealthGateInput = {
  logAnalysis?: LogAnalysisInput;
  queue?: QueueHealthInput;
  tts?: TtsHealthInput;
  prewarm?: PrewarmHealthInput;
  staticSamples?: StaticAudioSample[];
  cache?: CacheHealthInput;
  orphan?: OrphanHealthInput;
  security?: SecurityHealthInput;
  infraAudioOk?: boolean;
  staticCircuitOpen?: boolean;
  phaseSkips?: Partial<Record<string, string>>;
  configBlockers?: string[];
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function phaseStatus(blockers: string[], warnings: string[]): GatePhaseStatus {
  if (blockers.length > 0) return "FAIL";
  if (warnings.length > 0) return "WARNING";
  return "PASS";
}

function categoryFromIssues(issues: string[], critical: boolean): GateCategoryResult {
  if (critical) {
    return { score: 0, status: "fail", issues };
  }
  if (issues.length > 0) {
    return { score: clampScore(70 - issues.length * 10), status: "warn", issues };
  }
  return { score: 100, status: "pass", issues: [] };
}

export function skippedPhase(name: string, reason: string): GatePhaseResult {
  return {
    name,
    status: "SKIPPED",
    metrics: { skipReason: reason },
    blockers: [],
    warnings: [],
  };
}

export function evaluateLogAnalysisPhase(input: LogAnalysisInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.sampleCount != null && input.sampleCount < 10) {
    warnings.push(`Low telemetry sample count (${input.sampleCount}) — log metrics may be stale`);
  }

  if (input.totalRequests > 0 && input.failureRate > AUDIO_GATE_THRESHOLDS.maxFailureRate) {
    blockers.push(
      `Audio failure rate ${(input.failureRate * 100).toFixed(2)}% exceeds ${AUDIO_GATE_THRESHOLDS.maxFailureRate * 100}% gate`,
    );
  }

  if (input.totalRequests > 0 && input.timeoutRate > AUDIO_GATE_THRESHOLDS.maxTimeoutRate) {
    blockers.push(
      `Audio timeout rate ${(input.timeoutRate * 100).toFixed(2)}% exceeds ${AUDIO_GATE_THRESHOLDS.maxTimeoutRate * 100}% gate`,
    );
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.log,
    status: phaseStatus(blockers, warnings),
    metrics: {
      totalRequests: input.totalRequests,
      failureRate: input.failureRate,
      timeoutRate: input.timeoutRate,
      errorPatterns: input.errorPatterns ?? {},
    },
    blockers,
    warnings,
  };
}

export function evaluateQueuePhase(input: QueueHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.queueMode === "bullmq" && !input.redisReachable) {
    blockers.push("Redis unreachable while BullMQ mode is active");
  }

  if (input.queueMode === "bullmq" && !input.workerAvailable) {
    blockers.push("Audio worker unavailable (BullMQ expected)");
  }

  if (input.failedJobs > AUDIO_GATE_THRESHOLDS.maxFailedJobs) {
    blockers.push(
      `Failed queue jobs (${input.failedJobs}) exceed threshold (${AUDIO_GATE_THRESHOLDS.maxFailedJobs})`,
    );
  }

  if (input.stalledJobs > AUDIO_GATE_THRESHOLDS.maxStalledJobs) {
    blockers.push(`Stalled queue jobs (${input.stalledJobs}) — must be 0`);
  }

  if (input.queueMode === "inline") {
    warnings.push("Queue mode is inline — BullMQ worker offload not active on this probe target");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.queue,
    status: phaseStatus(blockers, warnings),
    metrics: {
      queueMode: input.queueMode,
      redisReachable: input.redisReachable,
      workerAvailable: input.workerAvailable,
      failedJobs: input.failedJobs,
      stalledJobs: input.stalledJobs,
      waitingJobs: input.waitingJobs,
      activeJobs: input.activeJobs,
    },
    blockers,
    warnings,
  };
}

export function evaluateTtsPhase(input: TtsHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.openAiConfigured) {
    blockers.push("OpenAI TTS not configured");
  }

  if (!input.storageOk) {
    blockers.push("TTS storage backend unavailable");
  }

  if (!input.generationOk) {
    blockers.push("TTS generation health check failed");
  }

  if (!input.playbackUrlValid) {
    blockers.push("TTS playback URL invalid or unreachable");
  }

  if (input.ttfaMs != null && input.ttfaMs > AUDIO_GATE_THRESHOLDS.maxTtfaMs) {
    blockers.push(
      `TTFA ${Math.round(input.ttfaMs)}ms exceeds ${AUDIO_GATE_THRESHOLDS.maxTtfaMs}ms gate`,
    );
  }

  if (input.generationLatencyMs != null && input.generationLatencyMs > AUDIO_GATE_THRESHOLDS.maxTtfaMs) {
    warnings.push(`TTS generation latency ${Math.round(input.generationLatencyMs)}ms is elevated`);
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.tts,
    status: phaseStatus(blockers, warnings),
    metrics: {
      generationOk: input.generationOk,
      playbackUrlValid: input.playbackUrlValid,
      ttfaMs: input.ttfaMs,
      generationLatencyMs: input.generationLatencyMs,
      cacheLatencyMs: input.cacheLatencyMs,
      openAiConfigured: input.openAiConfigured,
      storageOk: input.storageOk,
    },
    blockers,
    warnings,
  };
}

export function evaluatePrewarmPhase(input: PrewarmHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.lockOk) {
    blockers.push("Static audio prewarm distributed lock broken or unavailable");
  }

  if (
    input.warmupSuccessRate != null &&
    input.warmupSuccessRate < AUDIO_GATE_THRESHOLDS.minWarmupSuccessRate
  ) {
    blockers.push(
      `Warmup success ${(input.warmupSuccessRate * 100).toFixed(1)}% below ${AUDIO_GATE_THRESHOLDS.minWarmupSuccessRate * 100}% gate`,
    );
  }

  if (input.recentWarmupTotal > 0) {
    const failRate = input.recentWarmupFailures / input.recentWarmupTotal;
    if (failRate > AUDIO_GATE_THRESHOLDS.maxWarmupFailureRate) {
      blockers.push(
        `Warmup failure rate ${(failRate * 100).toFixed(1)}% exceeds ${AUDIO_GATE_THRESHOLDS.maxWarmupFailureRate * 100}% gate`,
      );
    }
  } else if (input.warmupSuccessRate == null) {
    warnings.push("No recent warmup job samples — prewarm health unverified");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.prewarm,
    status: phaseStatus(blockers, warnings),
    metrics: {
      warmupSuccessRate: input.warmupSuccessRate,
      lockOk: input.lockOk,
      recentWarmupFailures: input.recentWarmupFailures,
      recentWarmupTotal: input.recentWarmupTotal,
    },
    blockers,
    warnings,
  };
}

export function evaluateStaticPhase(samples: StaticAudioSample[]): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const failed = samples.filter((s) => !s.ok);

  for (const s of failed.slice(0, 5)) {
    blockers.push(`Static audio ${s.hash} invalid (HTTP ${s.status}${s.error ? `: ${s.error}` : ""})`);
  }

  if (failed.length > 5) {
    blockers.push(`${failed.length - 5} additional static audio samples failed`);
  }

  const badMime = samples.filter(
    (s) => s.ok && s.contentType && !s.contentType.includes("audio"),
  );
  for (const s of badMime.slice(0, 3)) {
    blockers.push(`Static audio ${s.hash} wrong MIME type: ${s.contentType}`);
  }

  if (samples.length === 0) {
    warnings.push("No static audio samples probed");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.static,
    status: phaseStatus(blockers, warnings),
    metrics: {
      sampled: samples.length,
      ok: samples.filter((s) => s.ok).length,
      failed: failed.length,
    },
    blockers,
    warnings,
  };
}

export function evaluateCachePhase(input: CacheHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.hitRateVerified || input.hitRate === 0) {
    warnings.push("Cache hit rate unverified (no telemetry samples)");
  } else if (input.hitRate < AUDIO_GATE_THRESHOLDS.minCacheHitRate) {
    blockers.push(
      `Cache hit rate ${(input.hitRate * 100).toFixed(1)}% below ${AUDIO_GATE_THRESHOLDS.minCacheHitRate * 100}% gate`,
    );
  }

  if (!input.postgresOk) warnings.push("Postgres tts_cache probe degraded");
  if (!input.gcsOk) warnings.push("GCS TTS/static storage probe degraded");
  if (!input.redisOk && input.hitRateVerified && input.hitRate > 0) {
    warnings.push("Redis cache layer unreachable");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.cache,
    status: phaseStatus(blockers, warnings),
    metrics: {
      hitRate: input.hitRate,
      hitRateVerified: input.hitRateVerified,
      memoryOk: input.memoryOk,
      redisOk: input.redisOk,
      gcsOk: input.gcsOk,
      postgresOk: input.postgresOk,
    },
    blockers,
    warnings,
  };
}

export function evaluateOrphanPhase(input: OrphanHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (input.weeklyAverageOrphans != null && input.weeklyAverageOrphans > 0) {
    const spike = input.orphans / input.weeklyAverageOrphans;
    if (spike > AUDIO_GATE_THRESHOLDS.orphanSpikeMultiplier) {
      blockers.push(
        `TTS orphans (${input.orphans}) exceed ${AUDIO_GATE_THRESHOLDS.orphanSpikeMultiplier}x weekly average (${input.weeklyAverageOrphans.toFixed(1)})`,
      );
    }
  } else if (input.orphans > 0 && input.scanned > 0) {
    const ratio = input.orphans / input.scanned;
    if (ratio > 0.25) {
      warnings.push(
        `High orphan ratio ${(ratio * 100).toFixed(1)}% (${input.orphans}/${input.scanned}) — set AUDIO_GATE_ORPHAN_WEEKLY_AVG for spike detection`,
      );
    }
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.orphan,
    status: phaseStatus(blockers, warnings),
    metrics: {
      orphans: input.orphans,
      scanned: input.scanned,
      weeklyAverageOrphans: input.weeklyAverageOrphans,
    },
    blockers,
    warnings,
  };
}

export function evaluateSecurityPhase(input: SecurityHealthInput): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.staticMissingPostProtected) {
    blockers.push("POST /api/static-audio/missing accepts unauthenticated requests (security regression)");
  }

  if (!input.adminDashboardProtected) {
    blockers.push("GET /api/admin/dashboard accessible without auth");
  }

  if (!input.adminSystemHealthProtected) {
    blockers.push("GET /api/admin/system-health accessible without auth");
  }

  if (input.storyStreamRequiresAuth === false) {
    warnings.push("Story stream endpoint is public — verify GCS proxy protection is intentional");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.security,
    status: phaseStatus(blockers, warnings),
    metrics: { ...input },
    blockers,
    warnings,
  };
}

export function evaluateInfraPhase(opts: {
  infraAudioOk: boolean;
  staticCircuitOpen: boolean;
}): GatePhaseResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!opts.infraAudioOk) {
    blockers.push("GET /api/healthz/audio reports not ready (critical audio endpoint broken)");
  }

  if (opts.staticCircuitOpen) {
    blockers.push("Static audio server circuit is OPEN");
  }

  return {
    name: AUDIO_GATE_PHASE_NAMES.infra,
    status: phaseStatus(blockers, warnings),
    metrics: {
      infraAudioOk: opts.infraAudioOk,
      staticCircuitOpen: opts.staticCircuitOpen,
    },
    blockers,
    warnings,
  };
}

function skippedCategory(reason: string): GateCategoryResult {
  return { score: null, status: "skip", issues: [reason] };
}

function scoreCategories(
  phases: GatePhaseResult[],
  input: AudioHealthGateInput,
): Record<GateCategoryKey, GateCategoryResult> {
  const phase = (name: string) => phases.find((p) => p.name === name);
  const skipReason = (name: string) =>
    (phase(name)?.metrics.skipReason as string | undefined) ?? "Phase skipped";

  const mapCategory = (
    phaseName: string,
    issues: string[],
    critical: boolean,
  ): GateCategoryResult => {
    if (phase(phaseName)?.status === "SKIPPED") {
      return skippedCategory(skipReason(phaseName));
    }
    return categoryFromIssues(issues, critical);
  };

  const prewarmIssues = phase(AUDIO_GATE_PHASE_NAMES.prewarm)?.blockers ?? [];
  const ttsIssues = phase(AUDIO_GATE_PHASE_NAMES.tts)?.blockers ?? [];
  const queueIssues = phase(AUDIO_GATE_PHASE_NAMES.queue)?.blockers ?? [];
  const playbackIssues = [
    ...(phase(AUDIO_GATE_PHASE_NAMES.static)?.blockers ?? []),
    ...(phase(AUDIO_GATE_PHASE_NAMES.infra)?.blockers ?? []),
    ...(input.tts && !input.tts.playbackUrlValid ? ["TTS playback URL invalid"] : []),
  ];
  const cacheIssues = phase(AUDIO_GATE_PHASE_NAMES.cache)?.blockers ?? [];
  const securityIssues = phase(AUDIO_GATE_PHASE_NAMES.security)?.blockers ?? [];
  const storageIssues = [
    ...(input.tts && !input.tts.storageOk ? ["TTS storage unavailable"] : []),
    ...(phase(AUDIO_GATE_PHASE_NAMES.orphan)?.blockers ?? []),
  ];
  const observabilityIssues = phase(AUDIO_GATE_PHASE_NAMES.log)?.blockers ?? [];

  const playbackPhaseSkipped =
    phase(AUDIO_GATE_PHASE_NAMES.static)?.status === "SKIPPED" &&
    phase(AUDIO_GATE_PHASE_NAMES.infra)?.status === "SKIPPED";

  return {
    Prewarm: mapCategory(AUDIO_GATE_PHASE_NAMES.prewarm, prewarmIssues, prewarmIssues.length > 0),
    TTS: mapCategory(AUDIO_GATE_PHASE_NAMES.tts, ttsIssues, ttsIssues.length > 0),
    Queue: mapCategory(AUDIO_GATE_PHASE_NAMES.queue, queueIssues, queueIssues.length > 0),
    Playback: playbackPhaseSkipped
      ? skippedCategory("Static and infrastructure probes skipped")
      : categoryFromIssues(playbackIssues, playbackIssues.length > 0),
    Cache: mapCategory(AUDIO_GATE_PHASE_NAMES.cache, cacheIssues, cacheIssues.length > 0),
    Security: mapCategory(AUDIO_GATE_PHASE_NAMES.security, securityIssues, securityIssues.length > 0),
    Storage: mapCategory(
      AUDIO_GATE_PHASE_NAMES.orphan,
      storageIssues,
      storageIssues.some((i) => i.includes("unavailable")),
    ),
    Observability: mapCategory(
      AUDIO_GATE_PHASE_NAMES.log,
      observabilityIssues,
      observabilityIssues.some((i) => i.includes("failure rate") || i.includes("timeout rate")),
    ),
  };
}

function resolvePhase<T>(
  phaseName: string,
  skipReason: string | undefined,
  input: T | undefined,
  evaluate: (value: T) => GatePhaseResult,
  missingReason: string,
): GatePhaseResult {
  if (skipReason) return skippedPhase(phaseName, skipReason);
  if (input === undefined) return skippedPhase(phaseName, missingReason);
  return evaluate(input);
}

export function evaluateAudioHealthGate(input: AudioHealthGateInput): AudioHealthGateReport {
  const skips = input.phaseSkips ?? {};
  const phases: GatePhaseResult[] = [];

  phases.push(
    evaluateInfraPhase({
      infraAudioOk: input.infraAudioOk ?? true,
      staticCircuitOpen: input.staticCircuitOpen ?? false,
    }),
  );

  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.log,
      skips[AUDIO_GATE_PHASE_NAMES.log],
      input.logAnalysis,
      evaluateLogAnalysisPhase,
      "Log telemetry not collected",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.queue,
      skips[AUDIO_GATE_PHASE_NAMES.queue],
      input.queue,
      evaluateQueuePhase,
      "Queue telemetry not collected",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.tts,
      skips[AUDIO_GATE_PHASE_NAMES.tts],
      input.tts,
      evaluateTtsPhase,
      "TTS probe not run",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.prewarm,
      skips[AUDIO_GATE_PHASE_NAMES.prewarm],
      input.prewarm,
      evaluatePrewarmPhase,
      "Prewarm telemetry not collected",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.static,
      skips[AUDIO_GATE_PHASE_NAMES.static],
      input.staticSamples,
      evaluateStaticPhase,
      "Static audio samples not probed",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.cache,
      skips[AUDIO_GATE_PHASE_NAMES.cache],
      input.cache,
      evaluateCachePhase,
      "Cache telemetry not collected",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.orphan,
      skips[AUDIO_GATE_PHASE_NAMES.orphan],
      input.orphan,
      evaluateOrphanPhase,
      "Orphan scan not run",
    ),
  );
  phases.push(
    resolvePhase(
      AUDIO_GATE_PHASE_NAMES.security,
      skips[AUDIO_GATE_PHASE_NAMES.security],
      input.security,
      evaluateSecurityPhase,
      "Security probes not run",
    ),
  );

  const configBlockers = input.configBlockers ?? [];
  const blockers = [...configBlockers, ...phases.flatMap((p) => p.blockers)];
  const warnings = phases.flatMap((p) => p.warnings);
  const categories = scoreCategories(phases, input);

  const scoredCategories = Object.values(categories).filter((c) => c.score != null);
  const score =
    scoredCategories.length > 0
      ? clampScore(
          scoredCategories.reduce((sum, c) => sum + (c.score ?? 0), 0) / scoredCategories.length,
        )
      : 0;

  let decision: GateDecision = "PASS";
  if (blockers.length > 0) {
    decision = "FAIL";
  } else if (warnings.length > 0) {
    decision = "WARNING";
  }

  const log = input.logAnalysis;
  const queue = input.queue;
  const tts = input.tts;
  const prewarm = input.prewarm;
  const cache = input.cache;
  const orphan = input.orphan;
  const staticSamples = input.staticSamples ?? [];

  const metrics: AudioHealthGateMetrics = {
    totalAudioRequests: log?.totalRequests ?? 0,
    totalFailures: log ? Math.round(log.totalRequests * log.failureRate) : 0,
    failureRate: log?.failureRate ?? 0,
    timeoutRate: log?.timeoutRate ?? 0,
    cacheHitRate: cache?.hitRate ?? 0,
    cacheHitRateVerified: cache?.hitRateVerified ?? false,
    warmupSuccessRate: prewarm?.warmupSuccessRate ?? null,
    queueSuccessRate:
      queue && queue.failedJobs + queue.activeJobs + queue.waitingJobs > 0
        ? 1 - queue.failedJobs / (queue.failedJobs + queue.activeJobs + queue.waitingJobs + 1)
        : null,
    ttfaMs: tts?.ttfaMs ?? null,
    generationLatencyMs: tts?.generationLatencyMs ?? null,
    cacheLatencyMs: tts?.cacheLatencyMs ?? null,
    failedJobs: queue?.failedJobs ?? 0,
    stalledJobs: queue?.stalledJobs ?? 0,
    waitingJobs: queue?.waitingJobs ?? 0,
    activeJobs: queue?.activeJobs ?? 0,
    orphanCount: orphan?.orphans ?? null,
    staticSamplesOk: staticSamples.filter((s) => s.ok).length,
    staticSamplesTotal: staticSamples.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    decision,
    score,
    categories,
    phases,
    metrics,
    blockers,
    warnings,
  };
}

export function createCrashGateReport(error: unknown): AudioHealthGateReport {
  const message = error instanceof Error ? error.message : String(error);
  return evaluateAudioHealthGate({
    infraAudioOk: false,
    staticCircuitOpen: false,
    configBlockers: [`Gate crashed before evaluation completed: ${message}`],
    phaseSkips: {
      [AUDIO_GATE_PHASE_NAMES.log]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.queue]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.tts]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.prewarm]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.static]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.cache]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.orphan]: "Gate crashed",
      [AUDIO_GATE_PHASE_NAMES.security]: "Gate crashed",
    },
  });
}
