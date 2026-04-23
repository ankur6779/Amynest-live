import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase-auth";
import { useSubscription } from "./use-subscription";

// Source the canonical Clerk userId directly — the subscription payload does
// NOT include userId, so falling back to entitlements would silently bucket
// every signed-in user into the "anon" key and leak usage across accounts.

/**
 * Smart usage-based freemium tracking — per "section" (e.g. "parenting_hub",
 * "life_skills", "olympiad"). Free users may consume:
 *   • exactly ONE block in the section (e.g. one accordion / one card)
 *   • inside that one block, ONE sub-block (e.g. one article / one tip)
 *
 * After that, all OTHER blocks in the section appear locked (blurred + lock
 * icon), and clicking them surfaces the upgrade paywall.
 *
 * Storage is local & one-time (NOT daily). Per-user scoping is done via the
 * Clerk userId (provided by useSubscription). Premium users always get full
 * access — usage tracking is a no-op for them.
 */

export interface SectionUsage {
  blockUsedId: string | null;
  subBlockUsedId: string | null;
  usedAt: number;
}

const STORAGE_PREFIX = "amynest_section_usage_v1";

function storageKey(userId: string | null, sectionId: string): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}:${sectionId}`;
}

function load(userId: string | null, sectionId: string): SectionUsage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, sectionId));
    if (!raw) return null;
    return JSON.parse(raw) as SectionUsage;
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

  const blockUsedId = state?.blockUsedId ?? null;
  const subBlockUsedId = state?.subBlockUsedId ?? null;

  const markBlockUsed = useCallback(
    (blockId: string) => {
      if (isPremium) return;
      // Already locked into a different block — ignore (caller should have
      // checked isBlockLocked first; this is just a safety net).
      if (blockUsedId && blockUsedId !== blockId) return;
      if (blockUsedId === blockId) return;
      const next: SectionUsage = {
        blockUsedId: blockId,
        subBlockUsedId: null,
        usedAt: Date.now(),
      };
      setState(next);
      save(userId, sectionId, next);
    },
    [isPremium, blockUsedId, userId, sectionId],
  );

  const markSubBlockUsed = useCallback(
    (blockId: string, subBlockId: string) => {
      if (isPremium) return;
      // Sub-block can only be marked inside the already-used block.
      if (blockUsedId !== blockId) return;
      if (subBlockUsedId === subBlockId) return;
      if (subBlockUsedId) return;
      const next: SectionUsage = {
        blockUsedId,
        subBlockUsedId: subBlockId,
        usedAt: Date.now(),
      };
      setState(next);
      save(userId, sectionId, next);
    },
    [isPremium, blockUsedId, subBlockUsedId, userId, sectionId],
  );

  const isBlockLocked = useCallback(
    (blockId: string): boolean => {
      if (isPremium) return false;
      if (!blockUsedId) return false; // nothing used yet — open
      return blockId !== blockUsedId;
    },
    [isPremium, blockUsedId],
  );

  const isSubBlockLocked = useCallback(
    (blockId: string, subBlockId: string): boolean => {
      if (isPremium) return false;
      // Locked entire block → all sub-blocks locked
      if (blockUsedId && blockUsedId !== blockId) return true;
      if (!subBlockUsedId) return false; // first one inside unlocked block
      return subBlockId !== subBlockUsedId;
    },
    [isPremium, blockUsedId, subBlockUsedId],
  );

  /** True if user has consumed their free quota for this section. */
  const fullyUsed = !!blockUsedId;

  return {
    isPremium,
    blockUsedId,
    subBlockUsedId,
    fullyUsed,
    markBlockUsed,
    markSubBlockUsed,
    isBlockLocked,
    isSubBlockLocked,
  };
}
