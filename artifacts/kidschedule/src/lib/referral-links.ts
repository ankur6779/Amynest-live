/**
 * Public web origin for referral / gift share links.
 * Override with `VITE_APP_WEB_ORIGIN` (e.g. https://amynest.app).
 */
export function getReferralShareOrigin(): string {
  const fromEnv = (import.meta.env.VITE_APP_WEB_ORIGIN as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://amynest.app";
}

export function buildReferralShareLink(code: string): string {
  const url = new URL(getReferralShareOrigin());
  url.searchParams.set("ref", code.trim().toUpperCase());
  return url.toString();
}

export function buildGiftShareLink(giftCode: string): string {
  const url = new URL(getReferralShareOrigin());
  url.searchParams.set("gift", giftCode.trim().toUpperCase());
  return url.toString();
}
