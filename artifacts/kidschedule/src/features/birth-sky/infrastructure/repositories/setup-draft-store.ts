/**
 * Local SetupDraft persistence (Pack 2). Keyed by childId.
 * Sensitive fields stay client-local; never sent to analytics.
 */

import {
  createEmptySetupDraft,
  type SetupDraft,
} from "../../domain/models/setup-draft";

const PREFIX = "amynest:birth-sky:setup-draft:v1:";

function key(childId: number): string {
  return `${PREFIX}${childId}`;
}

export function loadSetupDraft(childId: number): SetupDraft | null {
  try {
    const raw = localStorage.getItem(key(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupDraft;
    if (parsed.childId !== childId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: SetupDraft): void {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(key(draft.childId), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function clearSetupDraft(childId: number): void {
  try {
    localStorage.removeItem(key(childId));
  } catch {
    /* ignore */
  }
}

export function getOrCreateSetupDraft(
  childId: number,
  childName?: string,
  prefillDob?: string | null,
): SetupDraft {
  const existing = loadSetupDraft(childId);
  if (existing) {
    return {
      ...existing,
      childName: childName ?? existing.childName,
    };
  }
  const created = createEmptySetupDraft(childId, childName, prefillDob);
  saveSetupDraft(created);
  return created;
}
