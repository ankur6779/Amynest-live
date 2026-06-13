import type { AdaptiveMood } from "@workspace/family-routine";
import { ageBandForLifeSkills, L, pickDailyLifeSkillTasks } from "@workspace/life-skills";
import { STORAGE_KEY_DRAFT, STAGE_LABELS, type PtmSession } from "@workspace/ptm-prep";

export const SUPPORT_TILE_ORDER = [
  "articles",
  "emotional",
  "life-skills",
  "ptm-prep",
  "new-parent-tips",
] as const;

export type SupportTileId = (typeof SUPPORT_TILE_ORDER)[number];

export const HEALTH_TILE_ORDER = ["nutrition", "health-lab"] as const;

export type HealthTileId = (typeof HEALTH_TILE_ORDER)[number];
export type EmotionalCardId = "overwhelmed" | "anxious" | "connect" | "break";

/** Sep–Nov — common PTM window in Indian schools. */
export function isPtmSeason(date = new Date()): boolean {
  const m = date.getMonth();
  return m >= 8 && m <= 10;
}

export function formatHubDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAdaptiveMood(childId: number | string, date = new Date()): AdaptiveMood {
  if (typeof window === "undefined") return "neutral";
  const todayStr = formatHubDate(date);
  try {
    const raw = window.localStorage.getItem(`amynest:adaptive:mood:${childId}:${todayStr}`);
    if (raw === "low" || raw === "neutral" || raw === "active") return raw;
  } catch {
    /* ignore */
  }
  return "neutral";
}

const MOOD_EMOTIONAL_ORDER: Record<AdaptiveMood, EmotionalCardId[]> = {
  low: ["overwhelmed", "break", "connect", "anxious"],
  neutral: ["overwhelmed", "anxious", "connect", "break"],
  active: ["connect", "anxious", "overwhelmed", "break"],
};

export function orderEmotionalCards(mood: AdaptiveMood): EmotionalCardId[] {
  return MOOD_EMOTIONAL_ORDER[mood];
}

export function sortSupportTileIds(
  ids: readonly string[],
  opts: { ptmSeason?: boolean } = {},
): string[] {
  const base = opts.ptmSeason
    ? (["articles", "emotional", "ptm-prep", "life-skills", "new-parent-tips"] as const)
    : SUPPORT_TILE_ORDER;
  const set = new Set(ids);
  return base.filter(id => set.has(id));
}

export function sortHealthTileIds(ids: readonly string[]): string[] {
  const set = new Set(ids);
  return HEALTH_TILE_ORDER.filter(id => set.has(id));
}

export function getLifeSkillPreviewText(
  childAgeYears: number,
  childId: number | string,
  date = new Date(),
): string | null {
  if (childAgeYears < 2) return null;
  const tasks = pickDailyLifeSkillTasks({
    ageBand: ageBandForLifeSkills(childAgeYears),
    date: formatHubDate(date),
    childKey: childId,
    count: 1,
  });
  const first = tasks[0];
  return first ? L(first.title, "en") : null;
}

export function getPtmPreviewText(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    const session = JSON.parse(raw) as PtmSession;
    const stage = STAGE_LABELS[session.stage]?.title ?? session.stage;
    const selected = session.questions.filter(q => q.selected).length;
    if (session.stage === "prepare" && selected > 0) {
      return `${selected} questions ready · ${stage}`;
    }
    if (session.stage !== "done") {
      return `Resume · ${stage}`;
    }
    return null;
  } catch {
    return null;
  }
}
