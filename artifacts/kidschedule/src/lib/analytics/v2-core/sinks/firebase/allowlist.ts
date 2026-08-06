/**
 * Firebase sink allowlist — Registry decides (`firebase: true`).
 * Sprint 3C-5 additionally excludes commerce / ads layers (Ads sprint later).
 */

import {
  getRegistryEvent,
  V2_ANALYTICS_REGISTRY,
} from "../../registry/events";
import type { V2RegistryEventDefinition } from "../../types";

/** Layers deferred — Ads / commerce Firebase mapping is a later sprint. */
export const FIREBASE_SINK_EXCLUDED_LAYERS = ["commerce", "ads"] as const;

export type FirebaseAllowlistResult =
  | { ok: true; definition: V2RegistryEventDefinition }
  | {
      ok: false;
      reason:
        | "unknown_event"
        | "not_firebase"
        | "layer_excluded"
        | "optimize_excluded";
    };

/**
 * Can this registry event be forwarded to Firebase by this sink?
 * - Must exist in registry
 * - Must have `firebase: true`
 * - Must not be commerce/ads (3C-5 scope)
 * - Must not be the Ads optimize event (`canOptimize`)
 */
export function isAllowedForFirebaseSink(
  eventName: string,
): FirebaseAllowlistResult {
  const definition = getRegistryEvent(eventName);
  if (!definition) {
    return { ok: false, reason: "unknown_event" };
  }
  if (!definition.firebase) {
    return { ok: false, reason: "not_firebase" };
  }
  if (
    (FIREBASE_SINK_EXCLUDED_LAYERS as readonly string[]).includes(
      definition.layer,
    )
  ) {
    return { ok: false, reason: "layer_excluded" };
  }
  if (definition.canOptimize) {
    return { ok: false, reason: "optimize_excluded" };
  }
  return { ok: true, definition };
}

/** Names currently forwardable by FirebaseSink (derived from registry). */
export function listFirebaseSinkAllowlist(): readonly string[] {
  return V2_ANALYTICS_REGISTRY.filter(
    (e) => isAllowedForFirebaseSink(e.eventName).ok,
  ).map((e) => e.eventName);
}
