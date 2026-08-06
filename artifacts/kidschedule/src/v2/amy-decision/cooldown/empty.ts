import { freezeDeep } from "../freeze";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  type DecisionCooldownDocument,
} from "./types";

export function createEmptyCooldownDocument(
  now: Date = new Date(),
): DecisionCooldownDocument {
  return freezeDeep({
    schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
    entries: Object.freeze([]) as ReadonlyArray<never>,
    updatedAt: now.toISOString(),
  });
}
