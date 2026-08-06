/**
 * Payload validator — required keys, types, PII rejection.
 */

import type { V2AnalyticsContext, V2RegistryEventDefinition } from "./types";
import { materializeOnceKey } from "./once-engine";

/** Keys never allowed in V2 analytics payloads (Constitution Law 10). */
export const FORBIDDEN_PII_PAYLOAD_KEYS = [
  "name",
  "child_name",
  "childName",
  "email",
  "phone",
  "worry_text",
  "worryText",
  "transcript",
  "free_text",
  "address",
] as const;

export type PayloadValidationOk = {
  ok: true;
  payload: Record<string, unknown>;
  onceKey: string;
};

export type PayloadValidationFail = {
  ok: false;
  reason: "missing_payload_key" | "invalid_payload" | "pii_forbidden" | "invalid_once_key";
  message: string;
};

export type PayloadValidationResult = PayloadValidationOk | PayloadValidationFail;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateV2Payload(args: {
  definition: V2RegistryEventDefinition;
  payload: Record<string, unknown> | undefined;
  context: V2AnalyticsContext;
  explicitOnceKey?: string;
}): PayloadValidationResult {
  const raw = args.payload ?? {};
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      reason: "invalid_payload",
      message: "Payload must be a plain object",
    };
  }

  for (const key of Object.keys(raw)) {
    if (
      (FORBIDDEN_PII_PAYLOAD_KEYS as readonly string[]).includes(key) &&
      raw[key] != null &&
      raw[key] !== ""
    ) {
      return {
        ok: false,
        reason: "pii_forbidden",
        message: `Payload must not include PII field "${key}"`,
      };
    }
  }

  for (const required of args.definition.requiredPayloadKeys) {
    const value = raw[required];
    if (value === undefined || value === null || value === "") {
      return {
        ok: false,
        reason: "missing_payload_key",
        message: `Missing required payload key "${required}" for ${args.definition.eventName}`,
      };
    }
  }

  let onceKey: string;
  if (args.explicitOnceKey?.trim()) {
    onceKey = args.explicitOnceKey.trim();
  } else {
    try {
      const values: Record<string, string> = {
        anonymousId: args.context.anonymousId,
        sessionId: args.context.sessionId,
        accountId: args.context.accountId ?? "",
      };
      for (const [k, v] of Object.entries(raw)) {
        if (v === undefined || v === null) continue;
        values[k] = String(v);
      }
      // Alias user_id from payload for templates
      if (raw.user_id != null) values.user_id = String(raw.user_id);
      onceKey = materializeOnceKey(args.definition.onceKeyTemplate, values);
    } catch (err) {
      return {
        ok: false,
        reason: "invalid_once_key",
        message: err instanceof Error ? err.message : "Failed to build onceKey",
      };
    }
  }

  if (!onceKey) {
    return {
      ok: false,
      reason: "invalid_once_key",
      message: "onceKey must be non-empty",
    };
  }

  return { ok: true, payload: { ...raw }, onceKey };
}
