/**
 * Canary routing — Render primary, Coolify receives a configurable share.
 *
 * Env (wrangler [vars]):
 *   BACKEND_ORIGIN          — primary (Render)
 *   CANARY_BACKEND_ORIGIN   — canary target (Coolify); empty = disabled
 *   CANARY_PERCENT          — 0–100 integer; default 0 (all Render)
 *
 * Sticky assignment via FNV-1a hash of cf-connecting-ip + device id so the
 * same client stays on one backend during a canary stage.
 */

/** @param {string} primary @param {string | undefined} canary @param {number} percent */
export function parseCanaryConfig(primary, canary, percent) {
  const p = Math.max(0, Math.min(100, Math.floor(Number(percent) || 0)));
  const canaryUrl = (canary ?? "").trim().replace(/\/$/, "");
  return {
    primary: (primary ?? "").trim().replace(/\/$/, ""),
    canary: canaryUrl || null,
    percent: p,
    enabled: Boolean(canaryUrl) && p > 0 && p < 100,
    fullCanary: Boolean(canaryUrl) && p >= 100,
  };
}

/** @param {string} key */
function fnv1aPercent(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

/**
 * @param {Record<string, string>} env
 * @param {Request} request
 * @returns {{ url: string; lane: "render" | "coolify" }}
 */
export function selectBackend(env, request) {
  const cfg = parseCanaryConfig(
    env.BACKEND_ORIGIN,
    env.CANARY_BACKEND_ORIGIN,
    env.CANARY_PERCENT,
  );

  if (cfg.fullCanary && cfg.canary) {
    return { url: cfg.canary, lane: "coolify" };
  }

  if (!cfg.enabled || !cfg.canary) {
    return { url: cfg.primary, lane: "render" };
  }

  const stickyKey =
    request.headers.get("x-amynest-device-id") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  const bucket = fnv1aPercent(stickyKey);
  if (bucket < cfg.percent) {
    return { url: cfg.canary, lane: "coolify" };
  }
  return { url: cfg.primary, lane: "render" };
}

/** Rollout ladder (percent). */
export const CANARY_STAGES = [1, 10, 25, 50, 100];
