const PAYWALL_VISIT_KEY = "amynest:sub:paywall_visits";
const TRIAL_STARTED_KEY = "amynest:sub:trial_started_at";
const TRIAL_DISMISSED_KEY = "amynest:sub:trial_offer_dismissed";
const WINBACK_DISMISSED_KEY = "amynest:sub:winback_dismissed_at";
const POST_PURCHASE_UPSELL_KEY = "amynest:sub:post_upsell_dismissed";
const ONBOARDING_TRIAL_SEEN_KEY = "amynest:sub:onboarding_trial_seen";
const TRIAL_ENDED_SEEN_KEY = "amynest:sub:trial_ended_seen";
const TRIAL_ENDED_DISMISSED_KEY = "amynest:sub:trial_ended_dismissed_at";
const PAYWALL_DEFER_COUNT_KEY = "amynest:sub:paywall_defer_count";
const FIRST_OPEN_TS_KEY = "amynest:sub:first_open_ts";
const FIRST_ROUTINE_ACTIVATED_KEY = "amynest:sub:first_routine_activated";

export function getPaywallVisitCount(): number {
  try {
    const n = Number(sessionStorage.getItem(PAYWALL_VISIT_KEY) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementPaywallVisitCount(): number {
  const next = getPaywallVisitCount() + 1;
  try {
    sessionStorage.setItem(PAYWALL_VISIT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function markTrialStartedLocally(): void {
  try {
    localStorage.setItem(TRIAL_STARTED_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function getTrialStartedLocally(): string | null {
  try {
    return localStorage.getItem(TRIAL_STARTED_KEY);
  } catch {
    return null;
  }
}

export function markTrialOfferDismissed(): void {
  try {
    localStorage.setItem(TRIAL_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasTrialOfferDismissed(): boolean {
  try {
    return localStorage.getItem(TRIAL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingTrialSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_TRIAL_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasOnboardingTrialSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_TRIAL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWinbackDismissed(): void {
  try {
    localStorage.setItem(WINBACK_DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function wasWinbackDismissedRecently(cooldownMs = 7 * 24 * 60 * 60 * 1000): boolean {
  try {
    const raw = localStorage.getItem(WINBACK_DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < cooldownMs;
  } catch {
    return false;
  }
}

export function markPostPurchaseUpsellDismissed(plan: string): void {
  try {
    localStorage.setItem(POST_PURCHASE_UPSELL_KEY, plan);
  } catch {
    /* ignore */
  }
}

export function wasPostPurchaseUpsellDismissed(): boolean {
  try {
    return !!localStorage.getItem(POST_PURCHASE_UPSELL_KEY);
  } catch {
    return false;
  }
}

export function markTrialEndedScreenSeen(): void {
  try {
    localStorage.setItem(TRIAL_ENDED_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasTrialEndedScreenSeen(): boolean {
  try {
    return localStorage.getItem(TRIAL_ENDED_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTrialEndedScreenDismissed(): void {
  try {
    localStorage.setItem(TRIAL_ENDED_DISMISSED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function wasTrialEndedScreenDismissedRecently(
  cooldownMs = 24 * 60 * 60 * 1000,
): boolean {
  try {
    const raw = localStorage.getItem(TRIAL_ENDED_DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < cooldownMs;
  } catch {
    return false;
  }
}

/** Ensure first-open timestamp exists; returns epoch ms. */
export function ensureFirstOpenTimestamp(): number {
  try {
    const existing = localStorage.getItem(FIRST_OPEN_TS_KEY);
    if (existing) {
      const n = Number(existing);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const now = Date.now();
    localStorage.setItem(FIRST_OPEN_TS_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function getPaywallDeferCount(): number {
  try {
    const n = Number(localStorage.getItem(PAYWALL_DEFER_COUNT_KEY) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementPaywallDeferCount(): number {
  const next = getPaywallDeferCount() + 1;
  try {
    localStorage.setItem(PAYWALL_DEFER_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Durable activation signal for paywall defer (survives milestone key clears). */
export function markFirstRoutineActivated(): void {
  try {
    localStorage.setItem(FIRST_ROUTINE_ACTIVATED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasFirstRoutineActivatedFlag(): boolean {
  try {
    return localStorage.getItem(FIRST_ROUTINE_ACTIVATED_KEY) === "1";
  } catch {
    return false;
  }
}
