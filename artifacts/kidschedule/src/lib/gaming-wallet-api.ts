import { getApiUrl } from "@/lib/api";
import {
  applyWalletSnapshot,
  readLocalWalletPartial,
  type WalletSnapshotPayload,
} from "@/lib/gaming-wallet-storage";

export type { WalletSnapshotPayload };

export interface ServerWalletSnapshot extends WalletSnapshotPayload {
  gamesPlayedToday: number;
  dailyLimit: number;
  routineStreakDays: number;
  isPremium: boolean;
}

async function parseWalletResponse(res: Response): Promise<ServerWalletSnapshot> {
  const data = await res.json();
  const wallet = data.wallet as ServerWalletSnapshot;
  applyWalletSnapshot(wallet);
  return wallet;
}

export async function fetchGamingWallet(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<ServerWalletSnapshot | null> {
  const res = await authFetch(`${getApiUrl()}/api/gaming-rewards/wallet`);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`gaming wallet ${res.status}`);
  return parseWalletResponse(res);
}

export async function syncGamingWallet(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<ServerWalletSnapshot> {
  const local = readLocalWalletPartial();
  const res = await authFetch(`${getApiUrl()}/api/gaming-rewards/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(local),
  });
  if (!res.ok) throw new Error(`gaming sync ${res.status}`);
  return parseWalletResponse(res);
}

export async function earnGamingPoints(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  body: {
    childName: string;
    activity: string;
    amount: number;
    source: "routine" | "bonus" | "dev";
    idempotencyKey?: string;
  },
): Promise<ServerWalletSnapshot> {
  const res = await authFetch(`${getApiUrl()}/api/gaming-rewards/earn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gaming earn ${res.status}`);
  return parseWalletResponse(res);
}

export async function unlockGamingGame(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  gameId: string,
): Promise<{ wallet: ServerWalletSnapshot; via?: string }> {
  const res = await authFetch(`${getApiUrl()}/api/gaming-rewards/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.wallet) applyWalletSnapshot(data.wallet as ServerWalletSnapshot);
    throw new Error(data.reason ?? `gaming unlock ${res.status}`);
  }
  applyWalletSnapshot(data.wallet as ServerWalletSnapshot);
  return { wallet: data.wallet as ServerWalletSnapshot, via: data.via as string | undefined };
}

export async function recordGamingPlay(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  body: { gameId: string; score: number; total: number },
): Promise<{ wallet: ServerWalletSnapshot; pointsEarned: number; perfect: boolean }> {
  const res = await authFetch(`${getApiUrl()}/api/gaming-rewards/play`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.wallet) applyWalletSnapshot(data.wallet);
    throw new Error(data.reason ?? `gaming play ${res.status}`);
  }
  const wallet = data.wallet as ServerWalletSnapshot;
  applyWalletSnapshot(wallet);
  return {
    wallet,
    pointsEarned: data.pointsEarned,
    perfect: data.perfect,
  };
}
