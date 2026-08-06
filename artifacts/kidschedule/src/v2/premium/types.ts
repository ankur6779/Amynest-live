import type { Plan } from "@/hooks/use-subscription";
import type {
  PREMIUM_JOURNEY_ID,
  PREMIUM_JOURNEY_METADATA,
  PREMIUM_JOURNEY_VERSION,
} from "./journey-meta";

/** Journey UI / flow phases — not entitlement computation. */
export type PremiumJourneyPhase =
  | "loading"
  | "ready"
  | "purchasing"
  | "restoring"
  | "success"
  | "cancelled"
  | "failed"
  | "offline"
  | "already_premium";

export type PremiumOfflineContext = "general" | "restore" | "purchase";

export type PremiumJourneyEvent =
  | { type: "HYDRATE"; isPremium: boolean; online: boolean }
  | { type: "PLANS_READY" }
  | { type: "PURCHASE_START" }
  | { type: "PURCHASE_SUCCESS" }
  | { type: "PURCHASE_CANCEL" }
  | { type: "PURCHASE_FAIL"; error: string }
  | { type: "RESTORE_START" }
  | { type: "RESTORE_SUCCESS" }
  | { type: "RESTORE_FAIL"; error: string }
  | { type: "GO_OFFLINE"; context?: PremiumOfflineContext }
  | { type: "GO_ONLINE" }
  | { type: "DISMISS_CANCEL" }
  | { type: "RETRY"; online?: boolean };

export type PremiumJourneyState = {
  phase: PremiumJourneyPhase;
  error: string | null;
  isPremium: boolean;
  online: boolean;
  /** Why we entered offline (restore vs purchase vs general). */
  offlineContext: PremiumOfflineContext | null;
  /** Stable identity — no behavior effect. */
  journeyId: typeof PREMIUM_JOURNEY_ID;
  journeyVersion: typeof PREMIUM_JOURNEY_VERSION;
  metadata: typeof PREMIUM_JOURNEY_METADATA;
};

export type PremiumPurchasePlan = Exclude<Plan, "free">;

export type PremiumPurchaseResult = {
  ok: boolean;
  userCancelled?: boolean;
  reason?: string;
};

/** Injectable billing ports — wired to existing RC / native / Razorpay. */
export type PremiumBillingPorts = {
  purchase: (plan: PremiumPurchasePlan) => Promise<PremiumPurchaseResult>;
  restore: () => Promise<{ ok: boolean; reason?: string }>;
  /** Optional RC dashboard paywall; return handled=false to use custom UI. */
  presentNativePaywall?: () => Promise<{
    handled: boolean;
    purchased: boolean;
    restored: boolean;
    cancelled: boolean;
    error?: boolean;
    reason?: string;
  }>;
};
