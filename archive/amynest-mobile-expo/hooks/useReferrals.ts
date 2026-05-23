import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";

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
const PENDING_KEY = "amynest_pending_referral_code";

export function useReferrals() {
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const query = useQuery<ReferralPayload>({
    queryKey: QKEY,
    queryFn: async () => {
      const res = await authFetch("/api/referrals/me");
      return (await res.json()) as ReferralPayload;
    },
    staleTime: 30_000,
  });

  const attribute = useMutation({
    mutationFn: async (code: string) => {
      const res = await authFetch("/api/referrals/attribute", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      return json as { ok: boolean; alreadyAttributed?: boolean; error?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QKEY });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const redeemGift = useMutation({
    mutationFn: async (giftCode: string) => {
      const res = await authFetch("/api/gift-tokens/redeem", {
        method: "POST",
        body: JSON.stringify({ giftCode: giftCode.trim().toUpperCase() }),
      });
      const json = await res.json().catch(() => ({}));
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
    refetch: query.refetch,
    attribute,
    redeemGift,
  };
}

export async function setPendingReferralCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, code.trim().toUpperCase());
  } catch {
    // ignore
  }
}

export async function readPendingReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
