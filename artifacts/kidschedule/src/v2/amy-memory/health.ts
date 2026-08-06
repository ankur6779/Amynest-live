/**
 * Developer-only Amy Memory health — no production UI (P1).
 */

import { getDefaultMemoryAdapter } from "./local-storage-adapter";
import { listLegacyKeysRemaining } from "./migrate-legacy";
import { readAmyMemory } from "./api";
import type { AmyMemoryHealth } from "./types";
import { freezeDeep } from "./freeze";

export function getAmyMemoryHealth(): AmyMemoryHealth {
  const snap = readAmyMemory(getDefaultMemoryAdapter());
  return freezeDeep({
    schemaVersion: snap?.schemaVersion ?? null,
    contextVersion: snap?.contextVersion ?? null,
    migrationApplied: snap?.migrationApplied ?? false,
    legacyKeysRemaining: listLegacyKeysRemaining(),
    lastUpdated: snap?.updatedAt ?? null,
  });
}
