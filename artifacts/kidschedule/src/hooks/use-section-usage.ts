import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useSubscription } from "./use-subscription";

// Source the canonical Clerk userId directly — the subscription payload does
// NOT include userId, so falling back to entitlements would silently bucket
// every signed-in user into the "anon" key and leak usage across accounts.

/** Free users may consume up to this many blocks per section (lifetime). */
export const MAX_FREE_BLOCKS = 2;

/**
 * Smart usage-based freemium tracking — per "section" (e.g. "amy_coach",
 * "hub_articles", "hub_tips"). Free users may consume up to MAX_FREE_BLOCKS
 * blocks in the section (e.g. two coach topics, two hub sub-items).
 *
 * After the quota is exhausted, all OTHER blocks appear locked and clicking
 * them surfaces the upgrade paywall.
 *
 * Storage is local & one-time (NOT daily). Per-user scoping is done via the
 * Clerk userId (provided by useSubscription). Premium users always get full
 * access — usage tracking is a no-op for them.
 */

export interface SectionUsage {
  blockUsedIds: string[];
  subBlockUsedId: string | null;
  usedAt: number;
}

/** Legacy shape before multi-block support (blockUsedId singular). */
interface LegacySectionUsage {
  blockUsedId?: string | null;
  blockUsedIds?: string[];
  subBlockUsedId?: string | null;
  usedAt?: number;
}

const STORAGE_PREFIX = "amynest_section_usage_v1";

function storageKey(userId: string | null, sectionId: string): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}:${sectionId}`;
}

function normalizeUsage(raw: LegacySectionUsage | null): SectionUsage | null {
  if (!raw) return null;
  if (Array.isArray(raw.blockUsedIds)) {
    return {
      blockUsedIds: raw.blockUsedIds,
      subBlockUsedId: raw.subBlockUsedId ?? null,
      usedAt: raw.usedAt ?? Date.now(),
    };
  }
  if (raw.blockUsedId) {
    return {
      blockUsedIds: [raw.blockUsedId],
      subBlockUsedId: raw.subBlockUsedId ?? null,
      usedAt: raw.usedAt ?? Date.now(),
    };
  }
  return null;
}

/** Exported for unit tests — migrates legacy single-block storage. */
export function normalizeSectionUsage(raw: LegacySectionUsage | null): SectionUsage | null {
  return normalizeUsage(raw);
}

/** Pure lock check mirroring hook logic (premium bypass handled by caller). */
export function isSectionBlockLocked(blockUsedIds: string[], blockId: string): boolean {
  if (blockUsedIds.includes(blockId)) return false;
  if (blockUsedIds.length >= MAX_FREE_BLOCKS) return true;
  return false;
}

function load(userId: string | null, sectionId: string): SectionUsage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, sectionId));
    if (!raw) return null;
    return normalizeUsage(JSON.parse(raw) as LegacySectionUsage);
  } catch {
    return null;
  }
}

function save(userId: string | null, sectionId: string, value: SectionUsage) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId, sectionId), JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useSectionUsage(sectionId: string) {
  const { isPremium } = useSubscription();
  const { userId: rawUserId } = useAuth();
  const userId: string | null = rawUserId ?? null;

  const [state, setState] = useState<SectionUsage | null>(() =>
    load(userId, sectionId),
  );

  // Re-load if user changes (login / switch)
  useEffect(() => {
    setState(load(userId, sectionId));
  }, [userId, sectionId]);

  const blockUsedIds = state?.blockUsedIds ?? [];
  const subBlockUsedId = state?.subBlockUsedId ?? null;
  const primaryBlockId = blockUsedIds[0] ?? null;

  const markBlockUsed = useCallback(
    (blockId: string) => {
      if (isPremium) return;
      if (blockUsedIds.includes(blockId)) return;
      if (blockUsedIds.length >= MAX_FREE_BLOCKS) return;
      const next: SectionUsage = {
        blockUsedIds: [...blockUsedIds, blockId],
        subBlockUsedId: null,
        usedAt: Date.now(),
      };
      setState(next);
      save(userId, sectionId, next);
    },
    [isPremium, blockUsedIds, userId, sectionId],
  );

  const markSubBlockUsed = useCallback(
    (blockId: string, subBlockId: string) => {
      if (isPremium) return;
      if (primaryBlockId !== blockId) return;
      if (subBlockUsedId === subBlockId) return;
      if (subBlockUsedId) return;
      const next: SectionUsage = {
        blockUsedIds,
        subBlockUsedId: subBlockId,
        usedAt: Date.now(),
      };
      setState(next);
      save(userId, sectionId, next);
    },
    [isPremium, blockUsedIds, primaryBlockId, subBlockUsedId, userId, sectionId],
  );

  const isBlockLocked = useCallback(
    (blockId: string): boolean => {
      if (isPremium) return false;
      return isSectionBlockLocked(blockUsedIds, blockId);
    },
    [isPremium, blockUsedIds],
  );

  const isSubBlockLocked = useCallback(
    (blockId: string, subBlockId: string): boolean => {
      if (isPremium) return false;
      if (primaryBlockId && primaryBlockId !== blockId) return true;
      if (!subBlockUsedId) return false;
      return subBlockId !== subBlockUsedId;
    },
    [isPremium, primaryBlockId, subBlockUsedId],
  );

  /** True if user has consumed their free quota for this section. */
  const fullyUsed = blockUsedIds.length >= MAX_FREE_BLOCKS;

  return {
    isPremium,
    blockUsedIds,
    /** @deprecated Use blockUsedIds — kept for callers that only need the first slot. */
    blockUsedId: primaryBlockId,
    subBlockUsedId,
    fullyUsed,
    markBlockUsed,
    markSubBlockUsed,
    isBlockLocked,
    isSubBlockLocked,
  };
}
