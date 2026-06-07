import { unwrapJobPayload } from "../queue/ai-job-payload.js";
import type { AiJobRecord } from "../queue/types.js";
import { patchJobRecord } from "../queue/job-results.js";
import { isAiFinalizeRegistryEnabled } from "./ai-finalize-registry-flag.js";
import { getAiRouteContract } from "./ai-route-contracts/index.js";
import { shapePollApiResult } from "./ai-poll-api-result.js";
import { logger } from "./logger.js";

export function resolveRouteNameFromPayload(payload: unknown): string | null {
  const { routeName, input } = unwrapJobPayload(payload);
  if (routeName !== "legacy") return routeName;
  if (input && typeof input === "object" && "namespace" in input) {
    const ns = (input as { namespace?: string }).namespace;
    if (ns === "amy-assistant") return "ai/assistant-ai";
  }
  return null;
}

export function resolveContextFromPayload(payload: unknown): unknown {
  const { pollContext } = unwrapJobPayload(payload);
  return pollContext ?? {};
}

export function shouldUseRegistryForPayload(payload: unknown): boolean {
  if (!isAiFinalizeRegistryEnabled()) return false;
  const routeName = resolveRouteNameFromPayload(payload);
  if (!routeName) return false;
  return getAiRouteContract(routeName) !== undefined;
}

/**
 * Registry finalize path (feature-flagged). Returns null when legacy path should run.
 */
export async function finalizeViaRegistry(opts: {
  rawResult: unknown;
  payload: unknown;
  userId: string;
  jobId?: string;
  job?: AiJobRecord;
  skipSideEffects?: boolean;
}): Promise<unknown | null> {
  if (!shouldUseRegistryForPayload(opts.payload)) return null;

  const routeName = resolveRouteNameFromPayload(opts.payload)!;
  const contract = getAiRouteContract(routeName)!;
  const context = resolveContextFromPayload(opts.payload);

  if (opts.job?.apiResult !== undefined) {
    return opts.job.apiResult;
  }

  const apiResult = await contract.finalize(opts.rawResult, context);

  const jobId = opts.jobId ?? opts.job?.id;
  const sideEffectsAlreadyApplied = opts.job?.sideEffectsApplied === true;

  if (!opts.skipSideEffects && contract.afterFinalize && jobId && !sideEffectsAlreadyApplied) {
    try {
      await contract.afterFinalize(apiResult, context, {
        jobId,
        userId: opts.userId,
      });
    } catch (err) {
      logger.warn(
        {
          evt: "ai_finalize.after_failed",
          routeName,
          jobId,
          message: err instanceof Error ? err.message : String(err),
        },
        "afterFinalize failed (non-fatal)",
      );
    }
  }

  if (jobId) {
    await patchJobRecord(jobId, {
      apiResult,
      ...(contract.afterFinalize ? { sideEffectsApplied: true } : {}),
    });
  }

  return apiResult;
}

/**
 * Sync HTTP response body: registry when enabled, else legacy buildSyncBody.
 */
export async function resolveSyncApiBody(opts: {
  rawResult: unknown;
  payload: unknown;
  userId: string;
  jobId?: string;
  buildSyncBody: (result: unknown) => unknown;
}): Promise<unknown> {
  const registryBody = await finalizeViaRegistry({
    rawResult: opts.rawResult,
    payload: opts.payload,
    userId: opts.userId,
    jobId: opts.jobId,
  });
  if (registryBody !== null) return registryBody;
  return opts.buildSyncBody(opts.rawResult);
}

/**
 * Poll response body: cached apiResult → registry finalize → legacy shapePollApiResult.
 */
export async function resolvePollApiBody(job: AiJobRecord): Promise<unknown> {
  if (job.apiResult !== undefined) return job.apiResult;

  const raw = job.result;
  if (raw === undefined || raw === null) return raw;

  const registryBody = await finalizeViaRegistry({
    rawResult: raw,
    payload: job.payload,
    userId: job.userId,
    jobId: job.id,
    job,
  });
  if (registryBody !== null) return registryBody;

  return shapePollApiResult(job, raw);
}
