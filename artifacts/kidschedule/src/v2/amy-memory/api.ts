/**
 * Amy Memory public API — facts only, no decisions, no React.
 * Sole write path for durable family state (P0 write ownership).
 */

import { computeContextVersion } from "./context-version";
import { createEmptyAmyMemory, createGuestId } from "./empty";
import { freezeDeep } from "./freeze";
import {
  getDefaultMemoryAdapter,
  type AmyMemoryStorageAdapter,
} from "./local-storage-adapter";
import { clearLegacyKeys, migrateLegacyIntoMemory } from "./migrate-legacy";
import { stampSectionMeta } from "./section-meta";
import type {
  AmyMemoryDocument,
  AmyMemoryMutable,
  AmyMemoryPatch,
  AmyMemorySectionId,
  AmyMemoryWriteOptions,
} from "./types";

const MAJOR_SECTIONS: AmyMemorySectionId[] = [
  "child",
  "challenge",
  "mission",
  "coach",
  "speech",
];

function nowIso(): string {
  return new Date().toISOString();
}

function toImmutable(doc: AmyMemoryMutable): AmyMemoryDocument {
  return freezeDeep(JSON.parse(JSON.stringify(doc)) as AmyMemoryDocument);
}

function finalize(doc: AmyMemoryMutable): AmyMemoryMutable {
  doc.updatedAt = nowIso();
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return doc;
}

function resolveAdapter(
  options?: AmyMemoryWriteOptions,
): AmyMemoryStorageAdapter {
  return (options?.adapter as AmyMemoryStorageAdapter | undefined) ??
    getDefaultMemoryAdapter();
}

function loadOrMigrate(adapter: AmyMemoryStorageAdapter): AmyMemoryMutable | null {
  const existing = adapter.readRaw();
  if (existing) return existing;

  const migrated = migrateLegacyIntoMemory();
  if (migrated) {
    const next = finalize(migrated);
    adapter.writeRaw(next);
    return next;
  }
  return null;
}

function stampPatchedSections(
  doc: AmyMemoryMutable,
  patch: AmyMemoryPatch,
  options?: AmyMemoryWriteOptions,
): void {
  const at = nowIso();
  for (const section of MAJOR_SECTIONS) {
    if (!patch[section]) continue;
    const source =
      options?.sectionSources?.[section] ??
      options?.source ??
      "amy_memory";
    stampSectionMeta(doc, section, source, at);
  }
}

/** Read frozen snapshot. Null if nothing persisted yet. */
export function readAmyMemory(
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): AmyMemoryDocument | null {
  const doc = loadOrMigrate(adapter);
  return doc ? toImmutable(doc) : null;
}

/**
 * Readonly immutable snapshot for Amy Context resolver (P1).
 * Does not create memory; may migrate legacy keys on first read.
 */
export function getAmyMemorySnapshot(
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): AmyMemoryDocument | null {
  return readAmyMemory(adapter);
}

/** Ensure a guest memory document exists. */
export function ensureAmyMemory(
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): AmyMemoryDocument {
  const existing = loadOrMigrate(adapter);
  if (existing) return toImmutable(existing);

  const created = finalize(
    createEmptyAmyMemory({
      mode: "guest",
      guestId: createGuestId(),
      source: "amy_memory.ensure",
    }),
  );
  adapter.writeRaw(created);
  return toImmutable(created);
}

/** Patch memory and return frozen snapshot. Sole mutation API. */
export function updateAmyMemory(
  patch: AmyMemoryPatch,
  options?: AmyMemoryWriteOptions,
): AmyMemoryDocument {
  const adapter = resolveAdapter(options);
  const current = loadOrMigrate(adapter) ?? createEmptyAmyMemory();
  if (patch.identity) Object.assign(current.identity, patch.identity);
  if (patch.child) Object.assign(current.child, patch.child);
  if (patch.challenge) Object.assign(current.challenge, patch.challenge);
  if (patch.frontDoor) Object.assign(current.frontDoor, patch.frontDoor);
  if (patch.mission) Object.assign(current.mission, patch.mission);
  if (patch.coach) Object.assign(current.coach, patch.coach);
  if (patch.speech) Object.assign(current.speech, patch.speech);
  if (patch.activity) Object.assign(current.activity, patch.activity);
  if (patch.preferences) {
    if (patch.preferences.parentGoals) {
      current.preferences.parentGoals = [...patch.preferences.parentGoals];
    }
    if (patch.preferences.timezone !== undefined) {
      current.preferences.timezone = patch.preferences.timezone;
    }
    if (patch.preferences.locale !== undefined) {
      current.preferences.locale = patch.preferences.locale;
    }
  }
  if (patch.merge) Object.assign(current.merge, patch.merge);
  if (patch.migrationApplied !== undefined) {
    current.migrationApplied = patch.migrationApplied;
  }

  stampPatchedSections(current, patch, options);

  const next = finalize(current);
  adapter.writeRaw(next);
  return toImmutable(next);
}

/** Bind signed-in identity; keeps guestId for merge audit. */
export function bindSignedInAmyMemory(
  args: { userId: string; childId?: string | null },
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): AmyMemoryDocument {
  return updateAmyMemory(
    {
      identity: {
        mode: "signed_in",
        userId: args.userId,
      },
      child: args.childId !== undefined ? { childId: args.childId } : undefined,
      merge: {
        accountId: args.userId,
      },
    },
    {
      adapter,
      source: "amy_memory.bind_signed_in",
      sectionSources: args.childId !== undefined ? { child: "amy_memory.bind_signed_in" } : undefined,
    },
  );
}

/**
 * Guest → account merge: promote guest facts into signed-in memory.
 */
export function mergeGuestIntoAccountMemory(
  args: {
    userId: string;
    childId?: string | null;
    mergeReason?: string;
  },
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): AmyMemoryDocument {
  const current = loadOrMigrate(adapter) ?? createEmptyAmyMemory();
  const guestId = current.identity.guestId;
  const at = nowIso();

  current.identity.mode = "signed_in";
  current.identity.userId = args.userId;
  if (args.childId) {
    current.child.childId = args.childId;
    stampSectionMeta(current, "child", "amy_memory.merge", at);
  }
  current.merge.guestId = guestId;
  current.merge.accountId = args.userId;
  current.merge.mergeVersion = (current.merge.mergeVersion ?? 0) + 1;
  current.merge.mergeReason = args.mergeReason ?? "guest_to_account";
  current.merge.lastMergedAt = at;

  const next = finalize(current);
  adapter.writeRaw(next);
  return toImmutable(next);
}

export function clearAmyMemory(
  adapter: AmyMemoryStorageAdapter = getDefaultMemoryAdapter(),
): void {
  adapter.clearRaw();
  clearLegacyKeys();
}

export function clearAmyMemoryForTests(): void {
  clearAmyMemory();
}
