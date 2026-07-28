/**
 * Resilient EphemerisPort: primary Python daemon → one retry → lite fallback.
 *
 * Root-cause fix for first-run Sky failures: create must not hard-fail when the
 * localhost daemon is briefly unavailable. Lite snapshots remain readable.
 *
 * Fail-fast: probe /readyz before hanging on a 15s primary compute when the
 * daemon is down — so lite can finish well under the client request timeout.
 */

import { logger } from "../../lib/logger.js";
import { createAstroLiteEphemerisAdapter } from "./astro-lite-adapter.js";
import {
  EphemerisComputeError,
  EphemerisUnavailableError,
  type EphemerisComputeInput,
  type EphemerisComputeResult,
  type EphemerisPort,
} from "./ephemeris-port.js";
import {
  checkEphemerisReady,
  createPythonEphemerisAdapter,
} from "./python-ephemeris-adapter.js";

function isRetryableComputeError(err: unknown): boolean {
  if (err instanceof EphemerisUnavailableError) return true;
  if (err instanceof EphemerisComputeError) {
    return (
      err.code === "ephemeris_unavailable" ||
      err.code === "not_ready" ||
      err.code === "timeout" ||
      err.code === "invalid_response"
    );
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("fetch failed") ||
      msg.includes("econnrefused") ||
      msg.includes("ephemeris_unreachable")
    );
  }
  return false;
}

async function computeLite(
  fallback: EphemerisPort,
  input: EphemerisComputeInput,
  primaryErr: unknown,
  t0: number,
  path: string,
): Promise<EphemerisComputeResult> {
  const result = await Promise.resolve(fallback.compute(input));
  const astronomy = {
    ...result.astronomy,
    metadata: {
      ...(result.astronomy.metadata ?? {}),
      calculationSource:
        result.astronomy.metadata?.calculationSource ?? "AmyLite",
      fallbackUsed: true,
      cacheHit: Boolean(result.astronomy.metadata?.cacheHit),
    },
  };
  logger.warn(
    {
      event: "birth_sky.ephemeris_compute",
      engine: result.engineVersion,
      path,
      attempt: path === "lite_fallback_skip_primary" ? 1 : 3,
      fallbackUsed: true,
      durationMs: Date.now() - t0,
      primaryError:
        primaryErr instanceof Error
          ? {
              name: primaryErr.name,
              message: primaryErr.message,
              code: (primaryErr as { code?: string }).code,
            }
          : primaryErr == null
            ? null
            : String(primaryErr),
    },
    "birth_sky.ephemeris_lite_fallback",
  );
  return { ...result, astronomy };
}

export function createResilientEphemerisPort(options?: {
  primary?: EphemerisPort;
  fallback?: EphemerisPort;
  retryDelayMs?: number;
  /** Skip primary when /readyz is false (default true). */
  failFastWhenNotReady?: boolean;
}): EphemerisPort {
  const primary = options?.primary ?? createPythonEphemerisAdapter();
  const fallback = options?.fallback ?? createAstroLiteEphemerisAdapter();
  const retryDelayMs = options?.retryDelayMs ?? 250;
  const failFastWhenNotReady = options?.failFastWhenNotReady !== false;
  let lastEngineVersion = primary.engineVersion;

  return {
    get engineVersion() {
      return lastEngineVersion;
    },
    isTemporaryAdapter: false,
    buildCacheKey(input: EphemerisComputeInput) {
      // Prefer primary cache key shape when daemon identity is known.
      try {
        return primary.buildCacheKey(input);
      } catch {
        return fallback.buildCacheKey(input);
      }
    },
    async compute(input: EphemerisComputeInput): Promise<EphemerisComputeResult> {
      const t0 = Date.now();
      let primaryErr: unknown;

      if (failFastWhenNotReady && options?.primary == null) {
        // Only probe the real daemon URL when using the default primary adapter.
        const health = await checkEphemerisReady();
        if (!health.ok || health.ready === false) {
          logger.warn(
            {
              event: "birth_sky.ephemeris_compute",
              path: "readyz_skip_primary",
              ready: health.ready ?? false,
              error: health.error,
              durationMs: Date.now() - t0,
            },
            "birth_sky.ephemeris_not_ready_skip_primary",
          );
          const lite = await computeLite(
            fallback,
            input,
            health.error ?? "ephemeris_not_ready",
            t0,
            "lite_fallback_skip_primary",
          );
          lastEngineVersion = lite.engineVersion;
          return lite;
        }
      }

      try {
        const result = await primary.compute(input);
        lastEngineVersion = result.engineVersion;
        logger.info(
          {
            event: "birth_sky.ephemeris_compute",
            engine: result.engineVersion,
            path: "primary",
            attempt: 1,
            durationMs: Date.now() - t0,
            timePrecision: input.timePrecision,
            placeProvided: input.lat != null && input.lon != null,
          },
          "birth_sky.ephemeris_compute",
        );
        return result;
      } catch (err) {
        primaryErr = err;
        logger.warn(
          {
            event: "birth_sky.ephemeris_compute",
            path: "primary",
            attempt: 1,
            retryable: isRetryableComputeError(err),
            error:
              err instanceof Error
                ? { name: err.name, message: err.message, code: (err as { code?: string }).code }
                : String(err),
            durationMs: Date.now() - t0,
          },
          "birth_sky.ephemeris_primary_failed",
        );
      }

      if (isRetryableComputeError(primaryErr)) {
        if (retryDelayMs > 0) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
        try {
          const result = await primary.compute(input);
          lastEngineVersion = result.engineVersion;
          logger.info(
            {
              event: "birth_sky.ephemeris_compute",
              engine: result.engineVersion,
              path: "primary_retry",
              attempt: 2,
              durationMs: Date.now() - t0,
            },
            "birth_sky.ephemeris_compute",
          );
          return result;
        } catch (retryErr) {
          primaryErr = retryErr;
          logger.warn(
            {
              event: "birth_sky.ephemeris_compute",
              path: "primary_retry",
              attempt: 2,
              error:
                retryErr instanceof Error
                  ? {
                      name: retryErr.name,
                      message: retryErr.message,
                      code: (retryErr as { code?: string }).code,
                    }
                  : String(retryErr),
              durationMs: Date.now() - t0,
            },
            "birth_sky.ephemeris_primary_retry_failed",
          );
        }
      }

      // Permanent path: never leave first-run users without a Sky for daemon blips.
      const lite = await computeLite(fallback, input, primaryErr, t0, "lite_fallback");
      lastEngineVersion = lite.engineVersion;
      return lite;
    },
  };
}
