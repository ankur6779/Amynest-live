export type NetworkTier = "fast" | "slow" | "offline";

export function getNetworkTier(): NetworkTier {
  if (typeof navigator === "undefined") return "fast";
  if (navigator.onLine === false) return "offline";
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection;
  const type = conn?.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return "slow";
  return "fast";
}

/** Scale timeouts for slow networks without changing fast-path latency. */
export function adaptiveTimeoutMs(fastMs: number, slowMs: number): number {
  return getNetworkTier() === "slow" ? slowMs : fastMs;
}

export function getNetworkLabel(): string {
  return getNetworkTier();
}
