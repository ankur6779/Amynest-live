import { FF_VALUE_BRIDGE_INVITES } from "@/lib/subscription-feature-flags";
import type { Entitlements } from "@/hooks/use-subscription";
import { isInternalTrial } from "@/lib/internal-trial";

/** Phase 1 value moments only. */
export type ValueBridgeMoment = "routine_completion" | "weekly_summary";

export type ValueBridgeSource = "routine_completion" | "weekly_summary";

export type ValueBridgeInvite = {
  moment: ValueBridgeMoment;
};

const STORAGE_PREFIX = "amynest:value_bridge:";
const FIRST_ROUTINE_ITEM_KEY = `${STORAGE_PREFIX}first_routine_item_done`;
const SESSION_MOMENT_KEY = `${STORAGE_PREFIX}session_moment`;

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
): boolean {
  if (!FF_VALUE_BRIDGE_INVITES) return false;
  return isInternalTrial(entitlements);
}

export function shouldTriggerValueBridge(
  moment: ValueBridgeMoment,
  entitlements: Entitlements | null | undefined,
): boolean {
  if (!isValueBridgeEligible(entitlements)) return false;
  if (wasValueBridgeShownToday(moment)) return false;

  const sessionMoment = getSessionBridgeMoment();
  if (
    sessionMoment &&
    compareValueBridgePriority(sessionMoment, moment) >= 0
  ) {
    return false;
  }

  return true;
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
