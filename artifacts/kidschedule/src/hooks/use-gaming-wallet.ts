import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  fetchGamingWallet,
  syncGamingWallet,
  type ServerWalletSnapshot,
} from "@/lib/gaming-wallet-api";
import { applyWalletSnapshot, readLocalWalletPartial } from "@/lib/gaming-wallet-storage";

const qkey = (userId: string | null) =>
  ["gaming-wallet", userId ?? "anon"] as const;

/**
 * Hydrates localStorage from the server wallet (with one-time offline merge).
 */
export function useGamingWallet() {
  const authFetch = useAuthFetch();
  const { isSignedIn, userId } = useAuth();
  const qc = useQueryClient();
  const QKEY = qkey(userId);

  const query = useQuery<ServerWalletSnapshot | null>({
    queryKey: QKEY,
    enabled: !!isSignedIn,
    staleTime: 60_000,
    queryFn: async () => {
      const local = readLocalWalletPartial();
      const hasLocal =
        local.pointsBalance > 0 ||
        local.unlockedGames.length > 2 ||
        local.playLog.length > 0;
      if (hasLocal) {
        try {
          return await syncGamingWallet(authFetch);
        } catch {
          return fetchGamingWallet(authFetch);
        }
      }
      return fetchGamingWallet(authFetch);
    },
  });

  useEffect(() => {
    if (query.data) applyWalletSnapshot(query.data);
  }, [query.data]);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    await qc.invalidateQueries({ queryKey: QKEY });
  }, [isSignedIn, qc, QKEY]);

  return {
    wallet: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh,
    serverBacked: !!isSignedIn && !!query.data,
  };
}
