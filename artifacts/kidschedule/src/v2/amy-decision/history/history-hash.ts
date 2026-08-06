/**
 * historyHash — machine-only immutable integrity hash.
 * Used for validation, corruption detection, future sync.
 * Never for UI.
 */

import type { DecisionHistoryRecord } from "./types";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Canonical payload fields — excludes historyHash itself. */
export type HistoryHashPayload = Omit<DecisionHistoryRecord, "historyHash">;

/**
 * Deterministic integrity hash over a record's durable fields.
 */
export function computeHistoryHash(payload: HistoryHashPayload): string {
  const canonical = {
    historyId: payload.historyId,
    decisionId: payload.decisionId,
    stabilityToken: payload.stabilityToken,
    decisionVersion: payload.decisionVersion,
    policyId: payload.policyId,
    policyVersion: payload.policyVersion,
    contextVersion: payload.contextVersion,
    primaryExperience: payload.primaryExperience,
    secondaryExperience: payload.secondaryExperience,
    passiveExperience: payload.passiveExperience,
    reasonCodes: payload.reasonCodes,
    stabilityReasonCodes: payload.stabilityReasonCodes,
    confidence: payload.confidence,
    recordedAt: payload.recordedAt,
    outcomeState: payload.outcomeState,
    previousHistoryId: payload.previousHistoryId,
    replacedByHistoryId: payload.replacedByHistoryId,
  };
  return `histhash_v1_${fnv1a(JSON.stringify(canonical))}`;
}

/** Seal a payload with its integrity hash. */
export function sealHistoryRecord(
  payload: HistoryHashPayload,
): DecisionHistoryRecord {
  return Object.freeze({
    ...payload,
    historyHash: computeHistoryHash(payload),
  }) as DecisionHistoryRecord;
}

/** True when stored historyHash matches recomputed integrity hash. */
export function verifyHistoryHash(record: DecisionHistoryRecord): boolean {
  if (typeof record.historyHash !== "string" || !record.historyHash) {
    return false;
  }
  const { historyHash: _stored, ...payload } = record;
  return record.historyHash === computeHistoryHash(payload);
}
