/**
 * Tradition intro / visibility persistence (Pack 5 §1.4).
 * Per-user recommended; keyed by userId when available, else device-local.
 */

export type TraditionIntroState = {
  /** Accepted cultural framing — may show Tradition content. */
  traditionIntroAccepted: boolean;
  /**
   * “Astronomy only” path from intro — hides Tradition content
   * (settings toggle equivalent until Pack 7 Settings).
   */
  showTradition: boolean;
  updatedAt: string;
};

const PREFIX = "amynest:birth-sky:tradition-settings:v1:";

function key(userKey: string): string {
  return `${PREFIX}${userKey || "local"}`;
}

const DEFAULT: TraditionIntroState = {
  traditionIntroAccepted: false,
  showTradition: true,
  updatedAt: new Date(0).toISOString(),
};

export function loadTraditionSettings(userKey: string): TraditionIntroState {
  try {
    const raw = localStorage.getItem(key(userKey));
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<TraditionIntroState>;
    return {
      traditionIntroAccepted: Boolean(parsed.traditionIntroAccepted),
      showTradition: parsed.showTradition !== false,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : DEFAULT.updatedAt,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveTraditionSettings(
  userKey: string,
  state: TraditionIntroState,
): void {
  const next = { ...state, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(key(userKey), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function acceptTraditionIntro(userKey: string): TraditionIntroState {
  const next: TraditionIntroState = {
    traditionIntroAccepted: true,
    showTradition: true,
    updatedAt: new Date().toISOString(),
  };
  saveTraditionSettings(userKey, next);
  return next;
}

export function dismissTraditionAstronomyOnly(userKey: string): TraditionIntroState {
  const next: TraditionIntroState = {
    traditionIntroAccepted: true,
    showTradition: false,
    updatedAt: new Date().toISOString(),
  };
  saveTraditionSettings(userKey, next);
  return next;
}
