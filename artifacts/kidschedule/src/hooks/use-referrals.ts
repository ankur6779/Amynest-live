import { parseApiJson, safeJsonResponse } from "@/lib/safe-json-response";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";

export type ReferralStats = {
  code: string;
  validReferrals: number;
  paidReferrals: number;
  rewardsGranted: number;
  rewardsAvailable: number;
  rewardCap: number;
  validThreshold: number;
  paidThreshold: number;
  rewardDays: number;
  bonusExpiresAt: string | null;
  isPremium: boolean;
};

export type ReferralRow = {
  id: number;
  status: "pending" | "valid" | "paid";
  createdAt: string;
  validatedAt: string | null;
  paidAt: string | null;
};

export type GiftToken = {
  id: number;
  giftCode: string;
  bonusDays: number;
  status: "available" | "redeemed" | "expired";
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
};

export type ReferralPayload = {
  stats: ReferralStats;
  referrals: ReferralRow[];
  giftTokens: GiftToken[];
};

const QKEY = ["referrals", "me"] as const;

export function useReferrals() {
  const { isSignedIn, isLoaded } = useAuth();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const query = useQuery<ReferralPayload>({
    queryKey: QKEY,
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/referrals/me"));
      if (!res.ok) throw new Error(`referrals ${res.status}`);
      return (await parseApiJson<ReferralPayload>(res));
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 30_000,
  });

  const attribute = useMutation({
    mutationFn: async (code: string) => {
      const res = await authFetch(getApiUrl("/api/referrals/attribute"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await safeJsonResponse<{ error?: string }>(res).then((p) => (p.ok ? p.data : {})));
      if (!res.ok) throw new Error(json?.error ?? `attribute ${res.status}`);
      return json as { ok: true; alreadyAttributed: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const redeemGift = useMutation({
    mutationFn: async (giftCode: string) => {
      const res = await authFetch(getApiUrl("/api/gift-tokens/redeem"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftCode: giftCode.trim().toUpperCase() }),
      });
      const json = (await safeJsonResponse<{ error?: string }>(res).then((p) => (p.ok ? p.data : {})));
      if (!res.ok) throw new Error(json?.error ?? `redeem ${res.status}`);
      return json as { ok: true; bonusDays: number; giftCode: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  return {
    payload: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    attribute,
    redeemGift,
  };
}

export const PENDING_REFERRAL_KEY = "amynest_pending_referral_code";
export const PENDING_GIFT_KEY = "amynest_pending_gift_code";

/** Pending deep-link codes bound to the uid that captured them (null = signed-out). */
type PendingAttribution = { code: string; capturedForUid: string | null };

function parsePendingAttribution(raw: string | null): PendingAttribution | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Legacy plain-string storage — treat as unsigned capture.
  if (trimmed[0] !== "{") {
    return { code: trimmed, capturedForUid: null };
  }
  try {
    const parsed = JSON.parse(trimmed) as { code?: unknown; capturedForUid?: unknown };
    const code = typeof parsed.code === "string" ? parsed.code.trim() : "";
    if (!code) return null;
    const capturedForUid =
      typeof parsed.capturedForUid === "string" && parsed.capturedForUid.length > 0
        ? parsed.capturedForUid
        : null;
    return { code, capturedForUid };
  } catch {
    return null;
  }
}

function writePendingAttribution(key: string, code: string, capturedForUid: string | null): void {
  window.localStorage.setItem(
    key,
    JSON.stringify({ code, capturedForUid } satisfies PendingAttribution),
  );
}

/**
 * Auto-apply a pending gift/referral only when it cannot steal across accounts:
 * - captured while signed in as this uid, or
 * - unsigned capture and the deep-link query is still on this page load.
 * Otherwise clear stale/wrong-user pending and return null.
 */
export function readPendingAttributionForUser(
  key: string,
  userId: string,
  urlParam: "gift" | "ref",
): string | null {
  try {
    if (typeof window === "undefined") return null;
    const pending = parsePendingAttribution(window.localStorage.getItem(key));
    if (!pending) return null;
    if (pending.capturedForUid === userId) return pending.code;
    const urlHasCode = new URLSearchParams(window.location.search).get(urlParam)?.trim();
    if (!pending.capturedForUid && urlHasCode) {
      return pending.code;
    }
    window.localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export function capturePendingReferralCode(userId?: string | null): string | null {
  try {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim();
    if (ref) {
      writePendingAttribution(PENDING_REFERRAL_KEY, ref, userId ?? null);
      return ref;
    }
    return parsePendingAttribution(window.localStorage.getItem(PENDING_REFERRAL_KEY))?.code ?? null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {
    // ignore
  }
}

export function readPendingReferralCode(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return parsePendingAttribution(window.localStorage.getItem(PENDING_REFERRAL_KEY))?.code ?? null;
  } catch {
    return null;
  }
}

export function readPendingReferralCodeForUser(userId: string): string | null {
  return readPendingAttributionForUser(PENDING_REFERRAL_KEY, userId, "ref");
}

export function capturePendingGiftCode(userId?: string | null): string | null {
  try {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const gift = params.get("gift")?.trim();
    if (gift) {
      writePendingAttribution(PENDING_GIFT_KEY, gift.toUpperCase(), userId ?? null);
      return gift.toUpperCase();
    }
    return parsePendingAttribution(window.localStorage.getItem(PENDING_GIFT_KEY))?.code ?? null;
  } catch {
    return null;
  }
}

export function clearPendingGiftCode(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(PENDING_GIFT_KEY);
  } catch {
    // ignore
  }
}

export function readPendingGiftCode(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return parsePendingAttribution(window.localStorage.getItem(PENDING_GIFT_KEY))?.code ?? null;
  } catch {
    return null;
  }
}

export function readPendingGiftCodeForUser(userId: string): string | null {
  return readPendingAttributionForUser(PENDING_GIFT_KEY, userId, "gift");
}
