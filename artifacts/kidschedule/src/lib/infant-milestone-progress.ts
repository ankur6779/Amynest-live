/** Local milestone progress store (mirrors infant-milestones.tsx). */

export type MilestoneProgressEntry = {
  state?: string;
  updatedAt?: number;
};

export function milestoneProgressKey(childId: number): string {
  return `amynest:milestones:child:${childId}`;
}

function legacyMilestoneProgressKey(childName: string): string {
  return `amynest:milestones:${childName}`;
}

function parseMilestoneProgress(raw: string): Record<string, MilestoneProgressEntry> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, MilestoneProgressEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v === "object" && "state" in v) {
        out[k] = v as MilestoneProgressEntry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function loadMilestoneProgress(
  childId: number,
  legacyChildName?: string,
): Record<string, MilestoneProgressEntry> {
  const key = milestoneProgressKey(childId);
  try {
    let raw = localStorage.getItem(key);
    if (!raw && legacyChildName) {
      const legacyRaw = localStorage.getItem(legacyMilestoneProgressKey(legacyChildName));
      if (legacyRaw) {
        localStorage.setItem(key, legacyRaw);
        raw = legacyRaw;
      }
    }
    if (!raw) return {};
    return parseMilestoneProgress(raw);
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
