/**
 * Birth Sky preferences (Pack 7 §1) — local + server mirror via sync.
 * showTradition also mirrored into tradition-settings-store for Tradition segment.
 */

export type BirthSkyPreferences = {
  showTradition: boolean;
  skySounds: boolean;
  monthlyNotesOptIn: boolean;
  updatedAt: string;
};

const KEY = "amynest:birth-sky:preferences:v1:";

function key(userId: string): string {
  return `${KEY}${userId || "local"}`;
}

const DEFAULT: BirthSkyPreferences = {
  showTradition: true,
  /** Soft Web Audio sky cues — on for public launch (still respects reduced-motion). */
  skySounds: true,
  /** Reserved preference (delivery not yet live) — kept for sync compatibility. */
  monthlyNotesOptIn: true,
  updatedAt: new Date(0).toISOString(),
};

export function loadPreferences(userId: string): BirthSkyPreferences {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<BirthSkyPreferences>;
    return {
      showTradition: parsed.showTradition !== false,
      skySounds: parsed.skySounds !== false,
      monthlyNotesOptIn: parsed.monthlyNotesOptIn !== false,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : DEFAULT.updatedAt,
    };
  } catch {
    return { ...DEFAULT };
  }
}

/** Persist preferences. Preserves `updatedAt` when provided (LWW sync). */
export function savePreferences(userId: string, prefs: BirthSkyPreferences): void {
  const next: BirthSkyPreferences = {
    showTradition: prefs.showTradition,
    skySounds: prefs.skySounds,
    monthlyNotesOptIn: prefs.monthlyNotesOptIn,
    updatedAt: prefs.updatedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(key(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  // Keep Tradition intro store visibility in sync (Pack 5 + Pack 7).
  try {
    const tradKey = `amynest:birth-sky:tradition-settings:v1:${userId || "local"}`;
    const raw = localStorage.getItem(tradKey);
    const base = raw ? JSON.parse(raw) : { traditionIntroAccepted: true };
    localStorage.setItem(
      tradKey,
      JSON.stringify({
        ...base,
        showTradition: next.showTradition,
        updatedAt: next.updatedAt,
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Local preference mutation — bumps `updatedAt` for LWW outbox. */
export function patchPreferencesLocal(
  userId: string,
  patch: Partial<Omit<BirthSkyPreferences, "updatedAt">>,
): BirthSkyPreferences {
  const cur = loadPreferences(userId);
  const next: BirthSkyPreferences = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  savePreferences(userId, next);
  return next;
}
