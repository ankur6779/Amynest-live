import { FF_VALUE_BRIDGE_INVITES } from "@/lib/subscription-feature-flags";
import type { Entitlements } from "@/hooks/use-subscription";
import { hasFirstRoutineActivationProgress } from "@/lib/activation-gate";
import { isMonetizationSurfaceBlocked } from "@/lib/monetization-coordinator";
import { shouldSuppressPremiumMonetization } from "@/lib/premium-entitlement-guard";

/** Phase 1 value moments only. */
export type ValueBridgeMoment = "routine_completion" | "weekly_summary";

export type ValueBridgeSource = "routine_completion" | "weekly_summary";

export type ValueBridgeSuppressionReason =
  | "feature_flag_off"
  | "already_seen_today"
  | "already_seen_this_session"
  | "not_trial"
  | "paid_user"
  | "priority_banner_active"
  | "cooldown"
  | "not_eligible"
  | "missing_value_moment";

export type ValueBridgeInvite = {
  moment: ValueBridgeMoment;
};

const STORAGE_PREFIX = "amynest:value_bridge:";
const FIRST_ROUTINE_ITEM_KEY = `${STORAGE_PREFIX}first_routine_item_done`;
const SESSION_MOMENT_KEY = `${STORAGE_PREFIX}session_moment`;
const VISIBLE_SESSION_KEY = `${STORAGE_PREFIX}visible_session`;

export const VALUE_BRIDGE_PRIORITY: Record<ValueBridgeMoment, number> = {
  routine_completion: 100,
  weekly_summary: 90,
};

export type ValueBridgeCopy = {
  message: string;
  cta: string;
  source: ValueBridgeSource;
};

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function momentToSource(moment: ValueBridgeMoment): ValueBridgeSource {
  return moment;
}

export function isValidValueBridgeMoment(
  moment: string,
): moment is ValueBridgeMoment {
  return moment === "routine_completion" || moment === "weekly_summary";
}

export function wasValueBridgeShownToday(moment: ValueBridgeMoment): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}shown:${moment}:${dayKey()}`) === "1";
  } catch {
    return false;
  }
}

export function markValueBridgeShownToday(moment: ValueBridgeMoment): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}shown:${moment}:${dayKey()}`, "1");
  } catch {
    /* ignore */
  }
}

export function wasValueBridgeVisibleThisSession(): boolean {
  try {
    return sessionStorage.getItem(VISIBLE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markValueBridgeVisibleThisSession(): void {
  try {
    sessionStorage.setItem(VISIBLE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getSessionBridgeMoment(): ValueBridgeMoment | null {
  try {
    const raw = sessionStorage.getItem(SESSION_MOMENT_KEY);
    if (raw === "routine_completion" || raw === "weekly_summary") return raw;
    return null;
  } catch {
    return null;
  }
}

export function setSessionBridgeMoment(moment: ValueBridgeMoment): void {
  try {
    sessionStorage.setItem(SESSION_MOMENT_KEY, moment);
  } catch {
    /* ignore */
  }
}

export function wasFirstRoutineItemEverCompleted(): boolean {
  try {
    return localStorage.getItem(FIRST_ROUTINE_ITEM_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstRoutineItemEverCompleted(): void {
  try {
    localStorage.setItem(FIRST_ROUTINE_ITEM_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isValueBridgeEligible(
  entitlements: Entitlements | null | undefined,
  options?: { entitlementsResolved?: boolean },
): boolean {
  if (!FF_VALUE_BRIDGE_INVITES) return false;
  if (
    shouldSuppressPremiumMonetization({
      entitlements,
      entitlementsResolved: options?.entitlementsResolved,
    })
  ) {
    return false;
  }
  return hasFirstRoutineActivationProgress();
}

/**
 * Returns a suppression reason, or null when the bridge may be shown.
 * Order matters — first matching gate wins.
 */
export function evaluateValueBridgeSuppression(
  moment: ValueBridgeMoment,
  entitlements: Entitlements | null | undefined,
  options?: { entitlementsResolved?: boolean },
): ValueBridgeSuppressionReason | null {
  if (!FF_VALUE_BRIDGE_INVITES) return "feature_flag_off";
  if (isMonetizationSurfaceBlocked("value_bridge")) return "priority_banner_active";
  if (
    shouldSuppressPremiumMonetization({
      entitlements,
      entitlementsResolved: options?.entitlementsResolved,
    })
  ) {
    return "paid_user";
  }
  if (!entitlements) return "not_eligible";
  if (!hasFirstRoutineActivationProgress()) return "not_eligible";
  if (wasValueBridgeShownToday(moment)) return "already_seen_today";
  if (wasValueBridgeVisibleThisSession()) return "cooldown";

  const sessionMoment = getSessionBridgeMoment();
  if (sessionMoment) {
    const cmp = compareValueBridgePriority(sessionMoment, moment);
    if (cmp > 0) return "priority_banner_active";
    if (cmp === 0) return "already_seen_this_session";
  }

  return null;
}

export function shouldTriggerValueBridge(
  moment: ValueBridgeMoment,
  entitlements: Entitlements | null | undefined,
  options?: { entitlementsResolved?: boolean },
): boolean {
  return evaluateValueBridgeSuppression(moment, entitlements, options) === null;
}

export function compareValueBridgePriority(
  a: ValueBridgeMoment,
  b: ValueBridgeMoment,
): number {
  return VALUE_BRIDGE_PRIORITY[a] - VALUE_BRIDGE_PRIORITY[b];
}

export function valueBridgeCopy(moment: ValueBridgeMoment): ValueBridgeCopy {
  switch (moment) {
    case "routine_completion":
      return {
        message:
          "Great progress — you completed your first routine step. Keep the momentum going with Premium.",
        cta: "Continue Premium",
        source: "routine_completion",
      };
    case "weekly_summary":
      return {
        message:
          "Your week with Amy is growing — continue building on this progress with Premium.",
        cta: "Continue Premium",
        source: "weekly_summary",
      };
    default:
      return {
        message: "Continue your progress with Premium.",
        cta: "Continue Premium",
        source: "weekly_summary",
      };
  }
}
