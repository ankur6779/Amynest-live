/** Local milestone progress store (mirrors infant-milestones.tsx). */

export type MilestoneProgressEntry = {
  state?: string;
  updatedAt?: number;
};

export function loadMilestoneProgress(
  childName: string,
): Record<string, MilestoneProgressEntry> {
  const key = `amynest:milestones:${childName}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
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

/** Fallback title when catalog lookup is unavailable. */
export function humanizeMilestoneId(milestoneId: string): string {
  return milestoneId
    .replace(/^b\d+_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
