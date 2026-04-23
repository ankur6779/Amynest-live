import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/firebase-auth";
// AsyncStorage is already a peer dep of clerk-expo + many other libs in this app.
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";

/**
 * Smart usage-based freemium tracking for mobile — mirrors the web hook.
 *
 * Free users may consume:
 *   • exactly ONE block in the section (e.g. one accordion section)
 *   • inside that block, ONE sub-block (e.g. one card / one item)
 *
 * Tracking is one-time (NOT daily). Keyed per Clerk userId so multiple users
 * on a shared device don't trample each other.
 */

export interface SectionUsage {
  blockUsedId: string | null;
  subBlockUsedId: string | null;
  usedAt: number;
}

const STORAGE_PREFIX = "amynest_section_usage_v1";

function key(userId: string | null, sectionId: string): string {
  return `${STORAGE_PREFIX}:${userId ?? "anon"}:${sectionId}`;
}

export function useSectionUsage(sectionId: string) {
  const { userId } = useAuth();
  const isPremium = useSubscriptionStore(selectIsPremium);

  const [state, setState] = useState<SectionUsage | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount / when userId or section changes.
  // Eagerly reset to a non-loaded, empty state so that stale usage from a
  // previous user doesn't leak across an account switch in the gap between
  // effect run and async resolution.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setState(null);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key(userId ?? null, sectionId));
        if (!cancelled) {
          setState(raw ? (JSON.parse(raw) as SectionUsage) : null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setState(null);
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sectionId]);

  const blockUsedId = state?.blockUsedId ?? null;
  const subBlockUsedId = state?.subBlockUsedId ?? null;

  const persist = useCallback(
    (next: SectionUsage) => {
      setState(next);
      AsyncStorage.setItem(key(userId ?? null, sectionId), JSON.stringify(next)).catch(
        () => {},
      );
    },
    [userId, sectionId],
  );

  const markBlockUsed = useCallback(
    (blockId: string) => {
      if (isPremium) return;
      if (blockUsedId && blockUsedId !== blockId) return;
      if (blockUsedId === blockId) return;
      persist({ blockUsedId: blockId, subBlockUsedId: null, usedAt: Date.now() });
    },
    [isPremium, blockUsedId, persist],
  );

  const markSubBlockUsed = useCallback(
    (blockId: string, subBlockId: string) => {
      if (isPremium) return;
      if (blockUsedId !== blockId) return;
      if (subBlockUsedId === subBlockId) return;
      if (subBlockUsedId) return;
      persist({
        blockUsedId,
        subBlockUsedId: subBlockId,
        usedAt: Date.now(),
      });
    },
    [isPremium, blockUsedId, subBlockUsedId, persist],
  );

  const isBlockLocked = useCallback(
    (blockId: string): boolean => {
      if (isPremium) return false;
      if (!blockUsedId) return false;
      return blockId !== blockUsedId;
    },
    [isPremium, blockUsedId],
  );

  const isSubBlockLocked = useCallback(
    (blockId: string, subBlockId: string): boolean => {
      if (isPremium) return false;
      if (blockUsedId && blockUsedId !== blockId) return true;
      if (!subBlockUsedId) return false;
      return subBlockId !== subBlockUsedId;
    },
    [isPremium, blockUsedId, subBlockUsedId],
  );

  return {
    isPremium,
    loaded,
    blockUsedId,
    subBlockUsedId,
    fullyUsed: !!blockUsedId,
    markBlockUsed,
    markSubBlockUsed,
    isBlockLocked,
    isSubBlockLocked,
  };
}
