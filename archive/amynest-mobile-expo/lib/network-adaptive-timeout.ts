import NetInfo from "@react-native-community/netinfo";

export type NetworkTier = "fast" | "slow" | "offline";

let cachedTier: NetworkTier = "fast";

void NetInfo.fetch().then((state) => {
  cachedTier = tierFromNetInfo(state);
});

NetInfo.addEventListener((state) => {
  cachedTier = tierFromNetInfo(state);
});

function tierFromNetInfo(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
  type?: string;
  details?: { cellularGeneration?: string | null } | null;
}): NetworkTier {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return "offline";
  }
  const cell = state.details?.cellularGeneration;
  if (cell === "2g" || state.type === "cellular" && cell === "3g") return "slow";
  return "fast";
}

export function getNetworkTier(): NetworkTier {
  return cachedTier;
}

export function adaptiveTimeoutMs(fastMs: number, slowMs: number): number {
  return getNetworkTier() === "slow" ? slowMs : fastMs;
}

export function getNetworkLabel(): string {
  return getNetworkTier();
}
