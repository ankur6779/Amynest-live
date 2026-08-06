/**
 * stabilityToken — machine-only stable id for later History.
 * Not for UI. Not for AI.
 */

import type { AmyDecision } from "../types";
import { decisionOutcomeKey, type DecisionOutcomeKey } from "./fingerprint";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type StabilityTokenInput = Readonly<{
  fingerprint: string;
  decisionId: string;
  policyVersion: string;
  primary: string;
  secondary: string | null;
  passive: string | null;
  outcome: DecisionOutcomeKey;
}>;

/**
 * Deterministic token from fingerprint + decision identity + attention slots + outcome.
 */
export function computeStabilityToken(input: StabilityTokenInput): string {
  const payload = {
    fingerprint: input.fingerprint,
    decisionId: input.decisionId,
    policyVersion: input.policyVersion,
    primary: input.primary,
    secondary: input.secondary,
    passive: input.passive,
    outcome: input.outcome,
  };
  return `stabtok_v1_${fnv1a(JSON.stringify(payload))}`;
}

export function computeStabilityTokenForDecision(
  decision: AmyDecision,
  fingerprint: string,
): string {
  const outcome = decisionOutcomeKey(decision);
  return computeStabilityToken({
    fingerprint,
    decisionId: decision.decisionId,
    policyVersion: decision.policyVersion,
    primary: decision.primaryExperience.experienceId,
    secondary: decision.secondaryExperience?.experienceId ?? null,
    passive: decision.passiveExperience?.experienceId ?? null,
    outcome,
  });
}
