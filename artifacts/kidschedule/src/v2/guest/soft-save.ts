/**
 * Phase 4B — Soft save glue.
 * Guest Age · Name · Worry stay in local guest session; after auth continue to Today
 * (or a stashed return path such as /premium). No Analytics · No AI.
 */

import { FrontDoorState } from "@/v2/front-door/state-machine";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";
import { isTodayV2Enabled } from "@/v2/entry/v2-shell-flags";
import {
  clearCoachDiscoveryForTests,
  clearPreparedCoachPlan,
  peekCoachDiscoverGoal,
  readPreparedCoachPlan,
  stashCoachDiscoverGoal,
} from "@/v2/coach-discovery/prepared-plan";
import {
  clearLegacyKeys,
  readAmyMemory,
  updateAmyMemory,
} from "@/v2/amy-memory";
import { getGuestSession, isGuestModeV2Enabled } from "./session";
import type { V2GuestSession } from "./types";

/** @deprecated Claim lives in Amy Memory merge — key retained for tests/grep. */
export const V2_SOFT_SAVE_CLAIM_KEY = "amynest.v2.guest.soft_save_claimed";
export const V2_POST_AUTH_RETURN_KEY = "amynest.v2.post_auth_return";

/**
 * Default Continuity guest gate — protect what was built, never billing.
 * Prefer buildPremiumAccountRequiredMessage when name/worry exist.
 */
export const V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE =
  "Permission for Amy to keep caring — the relationship you've already begun.";

function worryLabel(worry: V2GuestSession["worry"]): string | null {
  if (!worry) return null;
  return FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === worry)?.label ?? null;
}

/** Presentation: remain present — never money / upgrade / create-account sales. */
export function buildPremiumAccountRequiredMessage(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined = getGuestSession(),
): string {
  const name = session?.name?.trim() || null;
  const concern = worryLabel(session?.worry ?? null);

  if (name && concern) {
    return `Permission for Amy to keep caring for ${name}'s ${concern} — the relationship you've already begun.`;
  }
  if (concern) {
    return `Permission for Amy to keep caring about your ${concern} — the relationship you've already begun.`;
  }
  if (name) {
    return `Permission for Amy to keep caring for ${name} — the relationship you've already begun.`;
  }
  return V2_PREMIUM_ACCOUNT_REQUIRED_MESSAGE;
}


type SoftSaveClaim = {
  guestId: string;
  claimedAt: string;
  ageBand: string | null;
  name: string | null;
  worry: string | null;
};

function readSs(key: string): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSs(key: string, value: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeSs(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readSoftSaveClaim(): SoftSaveClaim | null {
  const memory = readAmyMemory();
  if (!memory?.merge.guestId || !memory.merge.lastMergedAt) return null;
  return {
    guestId: memory.merge.guestId,
    claimedAt: memory.merge.lastMergedAt,
    ageBand: memory.child.ageBand,
    name: memory.child.displayName,
    worry: memory.challenge.worryId,
  };
}

/**
 * Claim current guest session for the account (keeps Age · Name · Worry in place).
 * Does not clear guest facts — Today continues to personalize from Amy Memory.
 */
export function claimGuestSessionOnAuth(
  session: V2GuestSession | null = getGuestSession(),
): SoftSaveClaim | null {
  if (!isGuestModeV2Enabled() || !session) return null;
  const claimedAt = new Date().toISOString();
  const claim: SoftSaveClaim = {
    guestId: session.guestId,
    claimedAt,
    ageBand: session.ageBand,
    name: session.name,
    worry: session.worry,
  };
  const prevVersion = readAmyMemory()?.merge.mergeVersion ?? 0;
  updateAmyMemory(
    {
      identity: {
        guestId: session.guestId,
      },
      child: {
        displayName: session.name,
        ageBand: session.ageBand,
      },
      challenge: {
        worryId: session.worry,
      },
      merge: {
        guestId: session.guestId,
        accountId: null,
        mergeVersion: prevVersion + 1,
        mergeReason: "soft_save_claim",
        lastMergedAt: claimedAt,
      },
    },
    {
      source: "soft_save_claim",
      sectionSources: {
        child: "soft_save_claim",
        challenge: "soft_save_claim",
      },
    },
  );
  return claim;
}

/** Stash return path (e.g. /premium) before Sign in / Sign up. */
export function setPostAuthReturnPath(path: string): void {
  const normalized = path.startsWith("/") ? path.split("?")[0]! : `/${path}`;
  writeSs(V2_POST_AUTH_RETURN_KEY, normalized);
}

export function peekPostAuthReturnPath(): string | null {
  return readSs(V2_POST_AUTH_RETURN_KEY);
}

export function consumePostAuthReturnPath(): string | null {
  const v = peekPostAuthReturnPath();
  removeSs(V2_POST_AUTH_RETURN_KEY);
  return v;
}

/**
 * Signup continuity subline from existing guest + soft-save return path.
 * Null when there is nothing personal to honor.
 */
export function buildSignupContinuitySubline(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined = getGuestSession(),
  returnPath?: string | null,
): string | null {
  const path = returnPath === undefined ? peekPostAuthReturnPath() : returnPath;
  const name = session?.name?.trim() || null;
  const concern = worryLabel(session?.worry ?? null);
  const returningToPremium = path === "/premium";
  const returningToCoach =
    path === "/amy-coach" || (path?.startsWith("/today/") ?? false);

  if (name && concern) {
    if (returningToPremium) {
      return `Save ${name}'s ${concern} progress.`;
    }
    if (returningToCoach) {
      return `Save ${name}'s ${concern} journey.`;
    }
    return `Save ${name}'s ${concern} progress.`;
  }
  if (concern) {
    return `Save your ${concern} progress.`;
  }
  if (name) {
    return `Save ${name}'s progress.`;
  }
  if (returningToPremium || returningToCoach || path === "/today") {
    return "Create your account to protect what Amy already started.";
  }
  return null;
}

function guestReadyForToday(session: V2GuestSession | null): boolean {
  if (!session || !isTodayV2Enabled()) return false;
  return (
    session.state === FrontDoorState.COMPLETE || Boolean(session.worry)
  );
}

/**
 * After signup / sign-in: Premium / Coach / Today return paths, else Today when ready.
 * Returns null when V2 has no opinion (caller keeps classic onboarding/dashboard).
 */
export function tryResolveV2PostAuthPath(): string | null {
  const returnTo = peekPostAuthReturnPath();
  if (
    returnTo === "/premium" ||
    returnTo === "/amy-coach" ||
    returnTo === "/ask-amy" ||
    returnTo === "/for-child" ||
    returnTo === "/today" ||
    (returnTo?.startsWith("/today/") ?? false)
  ) {
    consumePostAuthReturnPath();
    claimGuestSessionOnAuth();
    if (returnTo === "/amy-coach") {
      const prepared = readPreparedCoachPlan();
      if (prepared && !peekCoachDiscoverGoal()) {
        stashCoachDiscoverGoal(prepared.goalId);
      }
      clearPreparedCoachPlan();
    }
    return returnTo;
  }

  const prepared = readPreparedCoachPlan();
  if (prepared) {
    claimGuestSessionOnAuth();
    stashCoachDiscoverGoal(prepared.goalId);
    clearPreparedCoachPlan();
    return "/amy-coach";
  }

  const session = getGuestSession();
  if (guestReadyForToday(session)) {
    claimGuestSessionOnAuth(session);
    return "/today";
  }

  return null;
}

/** Convenience when a fallback path is required. */
export function resolveV2PostAuthPath(fallback = "/"): string {
  return tryResolveV2PostAuthPath() ?? (fallback.startsWith("/") ? fallback : "/");
}

export function clearSoftSaveForTests(): void {
  clearLegacyKeys();
  removeSs(V2_POST_AUTH_RETURN_KEY);
  if (readAmyMemory()) {
    updateAmyMemory({
      merge: {
        guestId: null,
        accountId: null,
        mergeVersion: 0,
        mergeReason: null,
        lastMergedAt: null,
      },
    });
  }
  clearCoachDiscoveryForTests();
}
