/**
 * Deterministic premium journey state machine (UI flow only).
 * Entitlement truth stays in useSubscription / RevenueCat.
 */

import {
  PREMIUM_OFFLINE_GENERAL,
  PREMIUM_OFFLINE_PURCHASE,
  PREMIUM_OFFLINE_RESTORE,
} from "./copy";
import {
  PREMIUM_JOURNEY_ID,
  PREMIUM_JOURNEY_METADATA,
  PREMIUM_JOURNEY_VERSION,
} from "./journey-meta";
import type {
  PremiumJourneyEvent,
  PremiumJourneyState,
  PremiumOfflineContext,
} from "./types";

function offlineMessage(context: PremiumOfflineContext): string {
  if (context === "restore") return PREMIUM_OFFLINE_RESTORE;
  if (context === "purchase") return PREMIUM_OFFLINE_PURCHASE;
  return PREMIUM_OFFLINE_GENERAL;
}

export function createInitialPremiumJourneyState(
  partial?: Partial<PremiumJourneyState>,
): PremiumJourneyState {
  return {
    phase: "loading",
    error: null,
    isPremium: false,
    online: true,
    offlineContext: null,
    journeyId: PREMIUM_JOURNEY_ID,
    journeyVersion: PREMIUM_JOURNEY_VERSION,
    metadata: PREMIUM_JOURNEY_METADATA,
    ...partial,
  };
}

/**
 * Simulate app restart after purchase: re-hydrate from entitlement truth.
 * Premium stays unlocked once; further purchase starts are no-ops.
 */
export function restartAfterPurchase(isPremium: boolean): PremiumJourneyState {
  return reducePremiumJourney(createInitialPremiumJourneyState(), {
    type: "HYDRATE",
    isPremium,
    online: true,
  });
}

export function reducePremiumJourney(
  state: PremiumJourneyState,
  event: PremiumJourneyEvent,
): PremiumJourneyState {
  switch (event.type) {
    case "HYDRATE": {
      if (!event.online) {
        return {
          ...state,
          online: false,
          isPremium: event.isPremium,
          phase: event.isPremium ? "already_premium" : "offline",
          offlineContext: event.isPremium ? null : "general",
          error: event.isPremium ? null : PREMIUM_OFFLINE_GENERAL,
        };
      }
      if (event.isPremium) {
        return {
          ...state,
          online: true,
          isPremium: true,
          phase: "already_premium",
          offlineContext: null,
          error: null,
        };
      }
      return {
        ...state,
        online: true,
        isPremium: false,
        phase: "ready",
        offlineContext: null,
        error: null,
      };
    }
    case "PLANS_READY": {
      if (state.isPremium) return { ...state, phase: "already_premium" };
      if (!state.online) return { ...state, phase: "offline" };
      if (state.phase === "loading") return { ...state, phase: "ready" };
      return state;
    }
    case "PURCHASE_START": {
      if (!state.online) {
        return {
          ...state,
          phase: "offline",
          offlineContext: "purchase",
          error: PREMIUM_OFFLINE_PURCHASE,
        };
      }
      // Idempotent: already unlocked → do not re-enter purchasing.
      if (state.isPremium) return { ...state, phase: "already_premium" };
      return {
        ...state,
        phase: "purchasing",
        offlineContext: null,
        error: null,
      };
    }
    case "PURCHASE_SUCCESS":
      return {
        ...state,
        phase: "success",
        isPremium: true,
        offlineContext: null,
        error: null,
      };
    case "PURCHASE_CANCEL":
      return {
        ...state,
        phase: "cancelled",
        error: null,
      };
    case "PURCHASE_FAIL":
      return {
        ...state,
        phase: "failed",
        error: event.error || "Purchase failed. Please try again.",
      };
    case "RESTORE_START": {
      if (!state.online) {
        return {
          ...state,
          phase: "offline",
          offlineContext: "restore",
          error: PREMIUM_OFFLINE_RESTORE,
        };
      }
      if (state.isPremium) return { ...state, phase: "already_premium" };
      return {
        ...state,
        phase: "restoring",
        offlineContext: null,
        error: null,
      };
    }
    case "RESTORE_SUCCESS":
      return {
        ...state,
        phase: "success",
        isPremium: true,
        offlineContext: null,
        error: null,
      };
    case "RESTORE_FAIL":
      return {
        ...state,
        phase: "failed",
        error: event.error || "No purchases found to restore.",
      };
    case "GO_OFFLINE": {
      const context = event.context ?? "general";
      return {
        ...state,
        online: false,
        phase: state.isPremium ? "already_premium" : "offline",
        offlineContext: state.isPremium ? null : context,
        error: state.isPremium ? null : offlineMessage(context),
      };
    }
    case "GO_ONLINE":
      return {
        ...state,
        online: true,
        phase: state.isPremium ? "already_premium" : "ready",
        offlineContext: null,
        error: null,
      };
    case "DISMISS_CANCEL":
      return {
        ...state,
        phase: state.online ? "ready" : "offline",
        error: null,
      };
    case "RETRY": {
      const online = event.online ?? state.online;
      if (!online) {
        const context = state.offlineContext ?? "general";
        return {
          ...state,
          online: false,
          phase: state.isPremium ? "already_premium" : "offline",
          offlineContext: state.isPremium ? null : context,
          error: state.isPremium ? null : offlineMessage(context),
        };
      }
      return {
        ...state,
        online: true,
        phase: state.isPremium ? "already_premium" : "ready",
        offlineContext: null,
        error: null,
      };
    }
    default:
      return state;
  }
}
