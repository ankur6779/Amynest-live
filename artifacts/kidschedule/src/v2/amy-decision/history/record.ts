/**
 * recordDecisionHistory — pure History Engine.
 * Input: StableDecisionResult only. Never AmyDecision directly.
 */

import { freezeDeep } from "../freeze";
import type { StableDecisionResult } from "../stability/types";
import { createEmptyDecisionHistoryDocument } from "./empty";
import { findCurrentHistory } from "./find";
import { computeHistoryId } from "./history-id";
import { sealHistoryRecord } from "./history-hash";
import type {
  DecisionHistoryDocument,
  DecisionHistoryOutcomeState,
  DecisionHistoryRecord,
  RecordDecisionHistoryOptions,
  RecordDecisionHistoryResult,
} from "./types";
import { AMY_DECISION_HISTORY_VERSION } from "./types";

const RECORDABLE = new Set<DecisionHistoryOutcomeState>([
  "NEW",
  "REPLACED",
  "EXPIRED",
  "INVALIDATED",
]);

function hasStableShape(stable: unknown): stable is StableDecisionResult {
  if (!stable || typeof stable !== "object") return false;
  const s = stable as Partial<StableDecisionResult>;
  return (
    typeof s.stabilityState === "string" &&
    typeof s.stabilityToken === "string" &&
    typeof s.currentDecisionId === "string" &&
    Boolean(s.decision) &&
    typeof s.decision === "object" &&
    Array.isArray(s.stabilityReasonCodes)
  );
}

function cloneRecord(record: DecisionHistoryRecord): DecisionHistoryRecord {
  return freezeDeep(JSON.parse(JSON.stringify(record)) as DecisionHistoryRecord);
}

function buildRecord(
  stable: StableDecisionResult,
  outcomeState: DecisionHistoryOutcomeState,
  previousHistoryId: string | null,
  recordedAt: string,
): DecisionHistoryRecord {
  const decision = stable.decision;
  const historyId = computeHistoryId({
    stabilityToken: stable.stabilityToken,
    decisionId: decision.decisionId || stable.currentDecisionId,
    outcomeState,
    previousHistoryId,
    recordedAt,
  });

  return sealHistoryRecord({
    historyId,
    decisionId: decision.decisionId || stable.currentDecisionId,
    stabilityToken: stable.stabilityToken,
    decisionVersion: decision.decisionVersion ?? "unknown",
    policyId: decision.policyId ?? "unknown",
    policyVersion: decision.policyVersion ?? stable.policyVersion,
    contextVersion: decision.contextVersion ?? "unknown",
    primaryExperience: {
      experienceId: decision.primaryExperience?.experienceId ?? "unknown",
    },
    secondaryExperience: decision.secondaryExperience
      ? { experienceId: decision.secondaryExperience.experienceId }
      : null,
    passiveExperience: decision.passiveExperience
      ? { experienceId: decision.passiveExperience.experienceId }
      : null,
    reasonCodes: Object.freeze([...(decision.reasonCodes ?? [])]),
    stabilityReasonCodes: Object.freeze([...stable.stabilityReasonCodes]),
    confidence: decision.confidence ?? "UNKNOWN",
    recordedAt,
    outcomeState,
    previousHistoryId,
    replacedByHistoryId: null,
  });
}

function skip(
  document: DecisionHistoryDocument,
  previousDocument: DecisionHistoryDocument | null,
  skipReason: NonNullable<RecordDecisionHistoryResult["skipReason"]>,
): RecordDecisionHistoryResult {
  return freezeDeep({
    recorded: false,
    skipReason,
    record: null,
    document,
    previousDocument,
  });
}

/**
 * Append a history record from a StableDecisionResult.
 * Pure: returns a new document; never mutates the input document's records in place.
 *
 * Records only NEW | REPLACED | EXPIRED | INVALIDATED.
 * Skips UNCHANGED (and duplicate stabilityToken at tip).
 */
export function recordDecisionHistory(
  stable: StableDecisionResult,
  document: DecisionHistoryDocument | null = null,
  options: RecordDecisionHistoryOptions = {},
): RecordDecisionHistoryResult {
  const now = options.now ?? new Date();
  const recordedAt = now.toISOString();
  const previousDocument = document;
  const base = document ?? createEmptyDecisionHistoryDocument(now);

  if (!hasStableShape(stable)) {
    return skip(base, previousDocument, "INVALID_STABLE");
  }

  if (stable.stabilityState === "UNCHANGED") {
    return skip(base, previousDocument, "UNCHANGED");
  }

  if (!RECORDABLE.has(stable.stabilityState as DecisionHistoryOutcomeState)) {
    return skip(base, previousDocument, "NOT_RECORDABLE_STATE");
  }

  const outcomeState = stable.stabilityState as DecisionHistoryOutcomeState;
  const current = findCurrentHistory(base);

  // Duplicate prevention — same token + same outcome already at tip.
  // Allows EXPIRED/INVALIDATED re-record when outcomeState differs.
  if (
    current &&
    current.stabilityToken === stable.stabilityToken &&
    current.outcomeState === outcomeState
  ) {
    return skip(base, previousDocument, "DUPLICATE_TOKEN");
  }

  const previousHistoryId = current?.historyId ?? null;
  const nextRecord = buildRecord(
    stable,
    outcomeState,
    previousHistoryId,
    recordedAt,
  );

  // Document rebuild: clone prior records; tip gets replacedByHistoryId link.
  // Does not mutate caller's previous document / frozen records in place.
  // Reseal tip clone so historyHash covers the new replacedByHistoryId.
  const nextRecords: DecisionHistoryRecord[] = base.records.map((r) => {
    if (current && r.historyId === current.historyId) {
      const { historyHash: _drop, ...payload } = cloneRecord(r);
      return sealHistoryRecord({
        ...payload,
        replacedByHistoryId: nextRecord.historyId,
      });
    }
    return cloneRecord(r);
  });
  nextRecords.push(nextRecord);

  const nextDocument = freezeDeep({
    schemaVersion: AMY_DECISION_HISTORY_VERSION,
    records: Object.freeze(nextRecords),
    currentHistoryId: nextRecord.historyId,
    updatedAt: recordedAt,
  }) as DecisionHistoryDocument;

  return freezeDeep({
    recorded: true,
    skipReason: null,
    record: nextRecord,
    document: nextDocument,
    previousDocument,
  });
}
