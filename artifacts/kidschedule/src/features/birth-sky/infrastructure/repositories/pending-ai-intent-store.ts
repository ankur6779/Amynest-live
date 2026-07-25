/**
 * Pending AI intent (Pack 2 Addenda A/B).
 * TTL 15m OR module exit. Not cleared by backgrounding or paywall "Not now".
 */

import {
  PENDING_AI_TTL_MS,
  type PendingAiIntent,
} from "../../domain/models/conversation";

const KEY = "amynest:birth-sky:pending-ai-intent:v1";

export function loadPendingAiIntent(): PendingAiIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAiIntent;
    if (!parsed?.stashedAt || !parsed.profileId) return null;
    if (Date.now() - parsed.stashedAt > (parsed.ttlMs || PENDING_AI_TTL_MS)) {
      clearPendingAiIntent("ttl");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function stashPendingAiIntent(
  intent: Omit<PendingAiIntent, "stashedAt" | "ttlMs">,
): PendingAiIntent {
  const next: PendingAiIntent = {
    ...intent,
    stashedAt: Date.now(),
    ttlMs: PENDING_AI_TTL_MS,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearPendingAiIntent(
  _cause: "ttl" | "module_exit" | "resumed" | "dismissed",
): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isPendingAiIntentValid(intent: PendingAiIntent | null): boolean {
  if (!intent) return false;
  return Date.now() - intent.stashedAt <= (intent.ttlMs || PENDING_AI_TTL_MS);
}
