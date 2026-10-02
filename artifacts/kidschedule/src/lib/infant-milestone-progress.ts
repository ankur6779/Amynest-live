/** Local milestone progress store (mirrors infant-milestones cloud sync). */

export type MilestoneProgressEntry = {
  state?: string;
  updatedAt?: number;
};

/** Prefix for child + legacy milestone keys. Not retention `amynest:milestones_reached`. */
export const INFANT_MILESTONE_STORAGE_PREFIX = "amynest:milestones:";

/**
 * Boolean legacy rows have no real write time. Stamp epoch 0 so hydrated
 * server timestamps always win LWW — Date.now() would wipe peer devices.
 */
export const LEGACY_BOOLEAN_UPDATED_AT = 0;

// Map from old MilestoneTracker IDs → new BuddyMilestone IDs (only direct equivalents)
const OLD_TO_NEW_ID: Record<string, string> = {
  m0_lift_head: "b03_head_lift",
  m0_eye_track: "b03_eye_track",
  m0_social_smile: "b03_social_smile",
  m0_coo: "b03_coo",
  m3_roll_front: "b36_roll",
  m3_laughs: "b36_laugh",
  m3_reach: "b36_reach",
  m3_babble: "b36_babble",
  m3_head_steady: "b36_head_steady",
  m6_sit: "b612_sit",
  m6_bye_wave: "b612_wave",
  m6_object_perm: "b612_object_perm",
  m9_crawl: "b612_crawl",
  m9_pull_stand: "b612_pull_stand",
  m9_pincer: "b612_pincer",
  m9_mama_dada: "b612_mama",
  m12_walk: "b1224_walk",
  m12_words: "b1224_words",
  m12_commands: "b1224_one_step",
  m12_scribble: "b1224_scribble",
  m18_words50: "b1224_words",
  m18_two_word: "b1224_two_word",
  m18_body_parts: "b1224_body_parts",
  m18_pretend: "b1224_pretend",
};

export function milestoneProgressKey(childId: number): string {
  return `${INFANT_MILESTONE_STORAGE_PREFIX}child:${childId}`;
}

export function legacyMilestoneProgressKey(childName: string): string {
  return `${INFANT_MILESTONE_STORAGE_PREFIX}${childName}`;
}

function isInfantMilestoneStorageKey(key: string): boolean {
  if (!key.startsWith(INFANT_MILESTONE_STORAGE_PREFIX)) return false;
  // Retention / activation uses `amynest:milestones_reached` — different prefix char.
  return true;
}

/** Wipe all infant milestone localStorage on account switch / sign-out. */
export function clearAllInfantMilestoneProgressStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isInfantMilestoneStorageKey(key)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function normalizeProgress(
  parsed: Record<string, unknown>,
): { out: Record<string, MilestoneProgressEntry>; migrated: boolean } {
  const out: Record<string, MilestoneProgressEntry> = {};
  let migrated = false;
  for (const [k, v] of Object.entries(parsed)) {
    const newKey = OLD_TO_NEW_ID[k];
    const targetKey = newKey ?? k;
    if (newKey) migrated = true;
    if (typeof v === "boolean") {
      out[targetKey] = {
        state: v ? "achieved" : "not_started",
        updatedAt: LEGACY_BOOLEAN_UPDATED_AT,
      };
      migrated = true;
    } else if (v && typeof v === "object" && "state" in v) {
      out[targetKey] = v as MilestoneProgressEntry;
    }
  }
  return { out, migrated };
}

/**
 * Load local milestone progress for a child.
 * Migrates name-keyed legacy once, then deletes the legacy key so another
 * account with the same child name cannot inherit and re-upload it.
 */
export function loadMilestoneProgress(
  childId: number,
  legacyChildName?: string,
): Record<string, MilestoneProgressEntry> {
  const key = milestoneProgressKey(childId);
  try {
    let raw = localStorage.getItem(key);
    let adoptedLegacy = false;
    if (!raw && legacyChildName) {
      const legacyKey = legacyMilestoneProgressKey(legacyChildName);
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        localStorage.setItem(key, legacyRaw);
        raw = legacyRaw;
        adoptedLegacy = true;
        try {
          localStorage.removeItem(legacyKey);
        } catch {
          /* ignore */
        }
      }
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const { out, migrated } = normalizeProgress(parsed);
    if (migrated || adoptedLegacy) {
      saveMilestoneProgress(childId, out);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMilestoneProgress(
  childId: number,
  data: Record<string, MilestoneProgressEntry>,
): void {
  try {
    localStorage.setItem(milestoneProgressKey(childId), JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/** Fallback title when catalog lookup is unavailable. */
export function humanizeMilestoneId(milestoneId: string): string {
  return milestoneId
    .replace(/^b\d+_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
