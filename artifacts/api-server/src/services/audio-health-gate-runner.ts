/**
 * Unified Audio Health Gate runner — identical probe + evaluation path for CI and admin dashboard.
 */
import {
  AUDIO_GATE_PHASE_NAMES,
  createCrashGateReport,
  evaluateAudioHealthGate,
  type AudioHealthGateInput,
  type AudioHealthGateReport,
  type CacheHealthInput,
  type LogAnalysisInput,
  type PrewarmHealthInput,
  type SecurityHealthInput,
  type StaticAudioSample,
  type TtsHealthInput,
} from "./audio-health-gate.js";

const TIMEOUT_ERROR_RE =
  /timeout|timed_out|audio_start_timeout|pipeline_timeout|watchdog|layer_timeout/i;

const TTS_POLL_TIMEOUT_MS = 90_000;
const TTS_POLL_INTERVAL_MS = 750;

export type GateFetchResult = {
  ok: boolean;
  status: number;
  ms: number;
  body?: unknown;
  text?: string;
};

export type OrphanBaselineStore = {
  load: () => number | null;
  save: (orphans: number) => void;
};

export type AudioHealthGateRunnerOptions = {
  apiUrl: string;
  adminToken?: string;
  internalHealthSecret?: string;
  requireProductionSecrets?: boolean;
  staticSampleHashes?: string[];
  staticSampleCount?: number;
  orphanBaseline?: OrphanBaselineStore;
  offlineOnly?: boolean;
};

type AdminDashboardBody = {
  totalRequests?: number;
  failureRate?: number;
  errorFeed?: { error: string }[];
  cacheHealth?: { hitRate?: number };
};

type AdminSystemHealthBody = {
  metrics?: { cacheHitRate?: number; redisHealthy?: boolean };
  health?: { dbHealthy?: boolean; workerHealthy?: boolean };
  bullmq?: { failedJobs?: { type: string }[] };
  warmup?: {
    recentWarmupFailures?: number;
    recentWarmupTotal?: number;
    warmupSuccessRate?: number | null;
  };
};

function trimApiUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function gateFetch(
  apiUrl: string,
  path: string,
  opts?: {
    adminToken?: string;
    internalHealthSecret?: string;
    init?: RequestInit;
    auth?: boolean;
  },
): Promise<GateFetchResult> {
  const started = performance.now();
  const headers: Record<string, string> = {
    ...(opts?.init?.headers as Record<string, string> | undefined),
  };
  if (opts?.auth && opts.adminToken) {
    headers.Authorization = `Bearer ${opts.adminToken.trim()}`;
  }
  if (opts?.internalHealthSecret && path.includes("/healthz/env")) {
    headers["x-health-secret"] = opts.internalHealthSecret;
  }

  try {
    const res = await fetch(`${trimApiUrl(apiUrl)}${path}`, {
      ...opts?.init,
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    const ms = Math.round(performance.now() - started);
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      const body = (await res.json().catch(() => ({}))) as unknown;
      return { ok: res.ok, status: res.status, ms, body };
    }
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, ms, text };
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    return {
      ok: false,
      status: 0,
      ms,
      text: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Minimum accepted static/TTS audio body size (rejects CDN poison placeholders). */
export const MIN_AUDIO_BODY_BYTES = 500;

/**
 * Evaluate a static-audio HTTP response using the body as source of truth.
 * Cloudflare/edge often omit Content-Length; header-only checks false-fail valid MP3s.
 */
export function evaluateStaticAudioResponse(opts: {
  status: number;
  contentType: string;
  contentLengthHeader: number | null;
  body: ArrayBuffer | Uint8Array;
  staticSource?: string | null;
}): { ok: boolean; contentLength: number; error?: string } {
  const bytes =
    opts.body instanceof Uint8Array ? opts.body : new Uint8Array(opts.body);
  const contentLength =
    bytes.byteLength > 0
      ? bytes.byteLength
      : Math.max(0, opts.contentLengthHeader ?? 0);
  const contentType = (opts.contentType ?? "").toLowerCase();
  const staticSource = (opts.staticSource ?? "").toLowerCase();

  if (opts.status < 200 || opts.status >= 300) {
    return { ok: false, contentLength, error: `HTTP ${opts.status}` };
  }
  if (staticSource === "placeholder") {
    return {
      ok: false,
      contentLength,
      error: `CDN placeholder (${contentLength} bytes)`,
    };
  }
  if (contentLength < MIN_AUDIO_BODY_BYTES) {
    return {
      ok: false,
      contentLength,
      error: `body too small (${contentLength} bytes)`,
    };
  }

  const hasId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const hasMpegFrame = bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
  const mimeLooksAudio =
    contentType.includes("audio") ||
    contentType.includes("mpeg") ||
    contentType.includes("octet-stream") ||
    contentType === "";

  if (!mimeLooksAudio && !hasId3 && !hasMpegFrame) {
    return {
      ok: false,
      contentLength,
      error: `unexpected content-type (${opts.contentType || "missing"})`,
    };
  }
  if (bytes.byteLength > 0 && !hasId3 && !hasMpegFrame) {
    return {
      ok: false,
      contentLength,
      error: "body is not MPEG/ID3 audio",
    };
  }

  return { ok: true, contentLength };
}

async function probeStaticSamples(
  apiUrl: string,
  hashes: string[],
): Promise<StaticAudioSample[]> {
  const out: StaticAudioSample[] = [];
  for (const hash of hashes) {
    try {
      const res = await fetch(`${trimApiUrl(apiUrl)}/api/static-audio/${hash}.mp3`, {
        method: "GET",
        signal: AbortSignal.timeout(20_000),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const clHeader = res.headers.get("content-length");
      const contentLengthHeader =
        clHeader != null && clHeader !== "" ? Number(clHeader) : null;
      const buf = await res.arrayBuffer();
      const judged = evaluateStaticAudioResponse({
        status: res.status,
        contentType,
        contentLengthHeader: Number.isFinite(contentLengthHeader)
          ? contentLengthHeader
          : null,
        body: buf,
        staticSource: res.headers.get("x-amynest-static-source"),
      });

      out.push({
        hash,
        ok: judged.ok,
        status: res.status,
        contentLength: judged.contentLength,
        contentType,
        error: judged.error,
      });
    } catch (err) {
      out.push({
        hash,
        ok: false,
        status: 0,
        contentLength: 0,
        contentType: "",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

async function runSecurityChecks(
  apiUrl: string,
): Promise<SecurityHealthInput> {
  const missingPost = await gateFetch(apiUrl, "/api/static-audio/missing", {
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: ["gate-probe-key"] }),
    },
  });
  const adminDash = await gateFetch(apiUrl, "/api/admin/dashboard");
  const adminHealth = await gateFetch(apiUrl, "/api/admin/system-health");
  const storyStream = await gateFetch(apiUrl, "/api/stories/stream/invalid_probe_id");

  return {
    staticMissingPostProtected: missingPost.status === 401 || missingPost.status === 403,
    adminDashboardProtected: adminDash.status === 401 || adminDash.status === 403,
    adminSystemHealthProtected: adminHealth.status === 401 || adminHealth.status === 403,
    storyStreamRequiresAuth: storyStream.status === 401 || storyStream.status === 403 ? true : null,
  };
}

function resolvePlaybackUrl(apiUrl: string, audioUrl: string | undefined): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) return audioUrl;
  if (audioUrl.startsWith("/")) return `${trimApiUrl(apiUrl)}${audioUrl}`;
  return `${trimApiUrl(apiUrl)}/${audioUrl}`;
}

async function pollTtsJobResult(
  apiUrl: string,
  adminToken: string,
  jobId: string,
): Promise<{ audioUrl?: string; ok: boolean; error?: string }> {
  const deadline = Date.now() + TTS_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const poll = await gateFetch(apiUrl, `/api/result/${encodeURIComponent(jobId)}`, {
      adminToken,
      auth: true,
    });
    const body = poll.body as {
      status?: string;
      result?: { audioUrl?: string; url?: string; ok?: boolean };
      error?: string;
    };

    if (poll.status === 404) {
      return { ok: false, error: "TTS job not found" };
    }

    if (poll.status === 200 && body.status !== "processing") {
      const result = body.result;
      const audioUrl = result?.audioUrl ?? result?.url;
      if (audioUrl) return { ok: true, audioUrl };
      return { ok: false, error: body.error ?? "TTS job completed without audio URL" };
    }

    if (poll.status >= 400 && poll.status !== 202) {
      return { ok: false, error: body?.error ?? `TTS poll HTTP ${poll.status}` };
    }

    await new Promise((r) => setTimeout(r, TTS_POLL_INTERVAL_MS));
  }
  return { ok: false, error: "TTS job poll timed out" };
}

async function verifyPlaybackUrl(
  _apiUrl: string,
  playbackUrl: string,
  adminToken?: string,
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken.trim()}`;
    const res = await fetch(playbackUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    const clHeader = res.headers.get("content-length");
    const contentLengthHeader =
      clHeader != null && clHeader !== "" ? Number(clHeader) : null;
    const judged = evaluateStaticAudioResponse({
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      contentLengthHeader: Number.isFinite(contentLengthHeader)
        ? contentLengthHeader
        : null,
      body: await res.arrayBuffer(),
      staticSource: res.headers.get("x-amynest-static-source"),
    });
    return judged.ok;
  } catch {
    return false;
  }
}

async function runTtsGenerateProbe(
  apiUrl: string,
  adminToken: string,
  infraBody: Record<string, unknown> | undefined,
): Promise<TtsHealthInput> {
  const openAiConfigured = !!(infraBody?.tts as { openAiConfigured?: boolean } | undefined)
    ?.openAiConfigured;
  const storageOk = infraBody?.ok === true;
  const probeStarted = performance.now();

  const genRes = await gateFetch(apiUrl, "/api/tts/generate", {
    adminToken,
    auth: true,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "AmyNest audio health gate probe.", mode: "default" }),
    },
  });

  const genBody = genRes.body as {
    ok?: boolean;
    audioUrl?: string;
    url?: string;
    jobId?: string;
    pollUrl?: string;
    error?: string;
  };

  let audioUrl: string | undefined;
  let generationOk = genRes.ok;
  let generationLatencyMs: number | null = null;

  if (genRes.ok && (genBody.audioUrl || genBody.url)) {
    audioUrl = genBody.audioUrl ?? genBody.url;
    generationLatencyMs = Math.round(performance.now() - probeStarted);
  } else if (genBody.jobId) {
    const generationStarted = performance.now();
    const polled = await pollTtsJobResult(apiUrl, adminToken, genBody.jobId);
    generationOk = polled.ok;
    audioUrl = polled.audioUrl;
    generationLatencyMs = Math.round(performance.now() - generationStarted);
    if (!polled.ok) {
      return {
        generationOk: false,
        playbackUrlValid: false,
        ttfaMs: null,
        generationLatencyMs,
        cacheLatencyMs: null,
        openAiConfigured: openAiConfigured ?? false,
        storageOk: storageOk ?? false,
      };
    }
  } else {
    generationOk = false;
  }

  const resolvedPlayback = resolvePlaybackUrl(apiUrl, audioUrl);
  const playbackUrlValid = resolvedPlayback
    ? await verifyPlaybackUrl(apiUrl, resolvedPlayback, adminToken)
    : false;
  const ttfaMs = playbackUrlValid ? Math.round(performance.now() - probeStarted) : null;

  return {
    generationOk: generationOk && !!audioUrl,
    playbackUrlValid,
    ttfaMs,
    generationLatencyMs,
    cacheLatencyMs: null,
    openAiConfigured: openAiConfigured ?? false,
    storageOk: storageOk ?? false,
  };
}

function deriveLogAnalysis(dashBody: AdminDashboardBody): LogAnalysisInput {
  const errors = dashBody.errorFeed ?? [];
  const timeoutCount = errors.filter((e) => TIMEOUT_ERROR_RE.test(e.error)).length;
  return {
    totalRequests: dashBody.totalRequests ?? 0,
    failureRate: dashBody.failureRate ?? 0,
    timeoutRate: errors.length > 0 ? timeoutCount / errors.length : 0,
    sampleCount: dashBody.totalRequests ?? 0,
  };
}

function derivePrewarmMetrics(
  systemBody: AdminSystemHealthBody | undefined,
  queueRedisOk: boolean,
  queueMode: string,
): PrewarmHealthInput {
  const warmup = systemBody?.warmup;
  return {
    warmupSuccessRate: warmup?.warmupSuccessRate ?? null,
    lockOk: queueRedisOk || queueMode !== "bullmq",
    recentWarmupFailures: warmup?.recentWarmupFailures ?? 0,
    recentWarmupTotal: warmup?.recentWarmupTotal ?? 0,
  };
}

function buildCacheInput(
  hitRate: number,
  hitRateVerified: boolean,
  redisOk: boolean,
  gcsOk: boolean,
  postgresOk: boolean,
): CacheHealthInput {
  return {
    hitRate,
    hitRateVerified,
    memoryOk: true,
    redisOk,
    gcsOk,
    postgresOk,
  };
}

export function validateProductionSecrets(opts: AudioHealthGateRunnerOptions): string[] {
  if (!opts.requireProductionSecrets) return [];
  const blockers: string[] = [];
  if (!opts.internalHealthSecret?.trim()) {
    blockers.push("INTERNAL_HEALTH_SECRET missing — production gate requires queue health probes");
  }
  return blockers;
}

function deriveTtsHealthFromInfra(
  infraBody: Record<string, unknown> | undefined,
  staticSamples: StaticAudioSample[] | undefined,
): TtsHealthInput {
  const ttsMeta = infraBody?.tts as { openAiConfigured?: boolean } | undefined;
  const openAiConfigured = !!ttsMeta?.openAiConfigured;
  const storageOk = infraBody?.ok === true;
  const staticProbed = (staticSamples?.length ?? 0) > 0;
  const staticOk = staticSamples?.every((sample) => sample.ok) ?? false;

  return {
    generationOk: openAiConfigured && storageOk,
    playbackUrlValid: staticProbed && staticOk,
    ttfaMs: null,
    generationLatencyMs: null,
    cacheLatencyMs: null,
    openAiConfigured,
    storageOk,
  };
}

export async function collectAudioHealthGateInput(
  opts: AudioHealthGateRunnerOptions,
): Promise<AudioHealthGateInput> {
  const configBlockers = validateProductionSecrets(opts);
  const adminToken = opts.adminToken?.trim() ?? "";
  const internalHealthSecret = opts.internalHealthSecret?.trim() ?? "";
  const phaseSkips: Record<string, string> = {};

  if (opts.offlineOnly) {
    return {
      infraAudioOk: true,
      staticCircuitOpen: false,
      configBlockers,
      phaseSkips: Object.fromEntries(
        Object.values(AUDIO_GATE_PHASE_NAMES)
          .filter((name) => name !== AUDIO_GATE_PHASE_NAMES.infra)
          .map((name) => [name, "Offline mode"]),
      ),
    };
  }

  const infra = await gateFetch(opts.apiUrl, "/api/healthz/audio");
  const infraBody = infra.body as Record<string, unknown> | undefined;
  const staticBody = infraBody?.staticAudio as { serverCircuitOpen?: boolean } | undefined;

  let logAnalysis: LogAnalysisInput | undefined;
  let cache: CacheHealthInput | undefined;
  let queueInput: AudioHealthGateInput["queue"];
  let adminSysBody: AdminSystemHealthBody | undefined;
  let dashBody: AdminDashboardBody | undefined;
  let adminAuthorized = false;

  if (!adminToken) {
    phaseSkips[AUDIO_GATE_PHASE_NAMES.log] = "ADMIN_AUTH_TOKEN not configured";
    phaseSkips[AUDIO_GATE_PHASE_NAMES.orphan] = "ADMIN_AUTH_TOKEN not configured";
  } else {
    const dash = await gateFetch(opts.apiUrl, "/api/admin/dashboard", { adminToken, auth: true });
    const system = await gateFetch(opts.apiUrl, "/api/admin/system-health", { adminToken, auth: true });
    adminSysBody = system.body as AdminSystemHealthBody;
    dashBody = dash.body as AdminDashboardBody;
    adminAuthorized = dash.ok && !!dashBody;

    if (adminAuthorized) {
      logAnalysis = deriveLogAnalysis(dashBody);
      const hitRate = dashBody.cacheHealth?.hitRate ?? adminSysBody?.metrics?.cacheHitRate ?? 0;
      cache = buildCacheInput(
        hitRate,
        hitRate > 0,
        adminSysBody?.metrics?.redisHealthy ?? false,
        infraBody?.ok === true,
        adminSysBody?.health?.dbHealthy ?? true,
      );
    } else {
      phaseSkips[AUDIO_GATE_PHASE_NAMES.log] = "Admin dashboard unreachable or unauthorized";
      phaseSkips[AUDIO_GATE_PHASE_NAMES.orphan] = "Admin token invalid or expired";
    }
  }

  if (!internalHealthSecret) {
    phaseSkips[AUDIO_GATE_PHASE_NAMES.queue] = "INTERNAL_HEALTH_SECRET not configured";
  } else {
    const envProbe = await gateFetch(opts.apiUrl, "/api/healthz/env", {
      internalHealthSecret,
    });
    const envBody = envProbe.body as {
      queue?: {
        mode?: string;
        redis?: boolean;
        redisPing?: boolean;
        workerExpected?: boolean;
        status?: string;
        bullmq?: Record<string, number>;
      };
    };

    if (envBody?.queue) {
      const q = envBody.queue;
      queueInput = {
        redisReachable: !!q.redis && !!q.redisPing,
        workerAvailable: q.workerExpected ? !!q.redis && q.status === "ok" : true,
        queueMode: q.mode ?? "unknown",
        failedJobs: Number(q.bullmq?.failed ?? 0),
        stalledJobs: Number(q.bullmq?.stalled ?? 0),
        waitingJobs: Number(q.bullmq?.waiting ?? 0),
        activeJobs: Number(q.bullmq?.active ?? 0),
      };
    } else {
      phaseSkips[AUDIO_GATE_PHASE_NAMES.queue] = "Queue health probe failed (/api/healthz/env)";
    }
  }

  if (
    !queueInput &&
    adminSysBody &&
    adminToken &&
    !opts.requireProductionSecrets
  ) {
    queueInput = {
      redisReachable: adminSysBody.metrics?.redisHealthy ?? false,
      workerAvailable: adminSysBody.health?.workerHealthy ?? true,
      queueMode: "bullmq",
      failedJobs: adminSysBody.bullmq?.failedJobs?.length ?? 0,
      stalledJobs: 0,
      waitingJobs: 0,
      activeJobs: 0,
    };
    delete phaseSkips[AUDIO_GATE_PHASE_NAMES.queue];
  }

  const staticHashes = opts.staticSampleHashes ?? [];
  const staticSamples =
    staticHashes.length > 0 ? await probeStaticSamples(opts.apiUrl, staticHashes) : undefined;
  if (!staticSamples?.length) {
    phaseSkips[AUDIO_GATE_PHASE_NAMES.static] = "No static audio sample hashes configured";
  }

  const security = await runSecurityChecks(opts.apiUrl);

  let orphan: AudioHealthGateInput["orphan"];
  if (!adminToken || !adminAuthorized) {
    orphan = undefined;
  } else {
    const orphanRes = await gateFetch(opts.apiUrl, "/api/admin/tts-orphan-cleanup", {
      adminToken,
      auth: true,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      },
    });
    const orphanBody = orphanRes.body as { orphans?: number; scanned?: number } | undefined;
    if (orphanRes.ok && orphanBody) {
      if (opts.orphanBaseline) opts.orphanBaseline.save(orphanBody.orphans ?? 0);
      orphan = {
        orphans: orphanBody.orphans ?? 0,
        scanned: orphanBody.scanned ?? 0,
        weeklyAverageOrphans: opts.orphanBaseline?.load() ?? null,
      };
    } else {
      phaseSkips[AUDIO_GATE_PHASE_NAMES.orphan] = "Orphan dry-run scan failed";
    }
  }

  const ttsCache = await gateFetch(opts.apiUrl, "/api/healthz/tts-cache");
  const ttsCacheBody = ttsCache.body as { ok?: boolean } | undefined;

  if (!cache) {
    cache = buildCacheInput(
      logAnalysis ? Math.max(0, 1 - (logAnalysis.failureRate ?? 0)) : 0,
      false,
      queueInput?.redisReachable ?? false,
      infraBody?.ok === true,
      ttsCacheBody?.ok !== false,
    );
  }

  let tts: TtsHealthInput | undefined;
  if (adminAuthorized) {
    tts = await runTtsGenerateProbe(opts.apiUrl, adminToken, infraBody);
  } else {
    tts = deriveTtsHealthFromInfra(infraBody, staticSamples);
  }

  const prewarm = derivePrewarmMetrics(
    adminSysBody,
    queueInput?.redisReachable ?? false,
    queueInput?.queueMode ?? "unknown",
  );

  return {
    infraAudioOk: infra.ok && infraBody?.ok === true,
    staticCircuitOpen: staticBody?.serverCircuitOpen === true,
    logAnalysis,
    queue: queueInput,
    tts,
    prewarm,
    staticSamples,
    cache,
    orphan,
    security,
    configBlockers,
    phaseSkips,
  };
}

export async function runAudioHealthGate(
  opts: AudioHealthGateRunnerOptions,
): Promise<AudioHealthGateReport> {
  const input = await collectAudioHealthGateInput(opts);
  return evaluateAudioHealthGate(input);
}

export { createCrashGateReport };
