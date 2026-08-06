import type { V2Platform } from "@/lib/analytics/v2-core";

/** Resolve analytics platform — no child PII. */
export function resolveV2AnalyticsPlatform(): V2Platform {
  if (typeof navigator === "undefined") return "web";
  try {
    if (/AmyNestAndroid/i.test(navigator.userAgent)) return "android";
    const cap = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
        };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const p = cap.getPlatform?.();
      if (p === "ios") return "ios";
      if (p === "android") return "android";
    }
  } catch {
    /* fall through */
  }
  return "web";
}
