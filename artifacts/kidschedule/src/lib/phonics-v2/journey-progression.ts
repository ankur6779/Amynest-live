/**
 * Mastery-based Reading Journey progression — age recommends start only;
 * never auto-completes prior stages without earned mastery proof.
 */
import {
  defaultLevelForAgeMonths,
  type CurriculumLevel,
} from "@workspace/phonics-curriculum";
import {
  PHONICS_V2_STAGES,
  type PhonicsV2Stage,
  type PhonicsV2StageId,
} from "./content/journey-stages";

/** Mastery threshold to level up (aligned with curriculum progression engine). */
export const LEVEL_UP_MASTERY_THRESHOLD = 85;

export type JourneyStageStatus =
  | "locked"
  | "available_for_review"
  | "current_target"
  | "mastered";

export type JourneyProgressionContext = {
  curriculumLevel: number | null | undefined;
  masteryScore: number;
  totalAgeMonths: number;
  masteredStages: PhonicsV2StageId[];
  hasTestHistory?: boolean;
  hasActivityHistory?: boolean;
  streak?: number;
};

export type JourneyStageView = {
  stage: PhonicsV2Stage;
  status: JourneyStageStatus;
  actionLabel: string;
  selectable: boolean;
};

export function resolveRecommendedStartLevel(totalAgeMonths: number): CurriculumLevel {
  return defaultLevelForAgeMonths(totalAgeMonths);
}

export function stageForCurriculumLevel(level: number): PhonicsV2Stage {
  const clamped = Math.max(1, Math.min(7, Math.round(level)));
  const exact = PHONICS_V2_STAGES.find((s) =>
    s.curriculumLevels.includes(clamped as CurriculumLevel),
  );
  if (exact) return exact;
  const fallback =
    [...PHONICS_V2_STAGES]
      .reverse()
      .find((s) => s.curriculumLevels.some((l) => l <= clamped)) ?? PHONICS_V2_STAGES[0]!;
  return fallback;
}

export function maxCurriculumLevelForStage(stage: PhonicsV2Stage): number {
  return Math.max(...stage.curriculumLevels);
}

/** True when the child has real earned progress (not age-seed only). */
export function hasEarnedCurriculumProgress(ctx: JourneyProgressionContext): boolean {
  if (ctx.hasTestHistory) return true;
  if (ctx.hasActivityHistory) return true;
  if ((ctx.streak ?? 0) > 0) return true;
  if (ctx.masteredStages.length > 0) return true;
  if (ctx.masteryScore > 0) return true;
  return false;
}

/** Single active learning objective — mastery-driven, age as fallback recommendation only. */
export function resolveCurrentTargetStage(ctx: JourneyProgressionContext): PhonicsV2Stage {
  const recommended = resolveRecommendedStartLevel(ctx.totalAgeMonths);

  if (!hasEarnedCurriculumProgress(ctx)) {
    return stageForCurriculumLevel(recommended);
  }

  const level = ctx.curriculumLevel ?? recommended;
  return stageForCurriculumLevel(level);
}

export function isStageMastered(
  stage: PhonicsV2Stage,
  ctx: JourneyProgressionContext,
): boolean {
  if (!hasEarnedCurriculumProgress(ctx)) return false;

  const level = ctx.curriculumLevel ?? 1;
  const max = maxCurriculumLevelForStage(stage);

  if (level > max) return true;
  if (level === max && ctx.masteryScore >= LEVEL_UP_MASTERY_THRESHOLD) return true;

  if (ctx.masteredStages.includes(stage.id)) {
    return level >= max || ctx.masteryScore >= 50;
  }

  return false;
}

export function resolveJourneyStageStatus(
  stage: PhonicsV2Stage,
  ctx: JourneyProgressionContext,
): JourneyStageStatus {
  const currentTarget = resolveCurrentTargetStage(ctx);

  if (isStageMastered(stage, ctx)) return "mastered";
  if (stage.order === currentTarget.order) return "current_target";
  if (stage.order < currentTarget.order) return "available_for_review";
  return "locked";
}

export function journeyStageActionLabel(status: JourneyStageStatus): string {
  switch (status) {
    case "mastered":
      return "Review";
    case "available_for_review":
      return "Review";
    case "current_target":
      return "Continue Learning";
    case "locked":
      return "Locked";
  }
}

export function isJourneyStageSelectable(status: JourneyStageStatus): boolean {
  return status !== "locked";
}

export function buildJourneyStageViews(ctx: JourneyProgressionContext): JourneyStageView[] {
  return PHONICS_V2_STAGES.map((stage) => {
    const status = resolveJourneyStageStatus(stage, ctx);
    return {
      stage,
      status,
      actionLabel: journeyStageActionLabel(status),
      selectable: isJourneyStageSelectable(status),
    };
  });
}

/** Progress % from truly mastered stages + in-stage mastery (never age-implied). */
export function computeMasteryBasedJourneyPct(ctx: JourneyProgressionContext): number {
  const views = buildJourneyStageViews(ctx);
  const masteredCount = views.filter((v) => v.status === "mastered").length;
  const current = views.find((v) => v.status === "current_target");
  const withinStage =
    current && ctx.masteryScore > 0
      ? Math.min(99, Math.max(0, ctx.masteryScore)) / 100
      : 0;
  return Math.round(
    Math.min(100, ((masteredCount + withinStage) / PHONICS_V2_STAGES.length) * 100),
  );
}

/** Curriculum levels reachable for review (at or before current target). */
export function getAccessibleCurriculumLevels(ctx: JourneyProgressionContext): CurriculumLevel[] {
  const target = resolveCurrentTargetStage(ctx);
  const out = new Set<CurriculumLevel>();
  for (const stage of PHONICS_V2_STAGES) {
    if (stage.order <= target.order) {
      for (const l of stage.curriculumLevels) out.add(l);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function showsRecommendedLevelBanner(ctx: JourneyProgressionContext): boolean {
  return !hasEarnedCurriculumProgress(ctx);
}

export function recommendedLevelLabel(ctx: JourneyProgressionContext): string {
  const stage = resolveCurrentTargetStage(ctx);
  return stage.title;
}

export function buildJourneyProgressionContext(input: {
  curriculumLevel?: number | null;
  masteryScore?: number;
  totalAgeMonths: number;
  masteredStages?: PhonicsV2StageId[];
  lastTestAt?: string | null;
  streak?: number;
  practicedItemCount?: number;
}): JourneyProgressionContext {
  return {
    curriculumLevel: input.curriculumLevel,
    masteryScore: input.masteryScore ?? 0,
    totalAgeMonths: input.totalAgeMonths,
    masteredStages: input.masteredStages ?? [],
    hasTestHistory: Boolean(input.lastTestAt),
    hasActivityHistory: (input.practicedItemCount ?? 0) > 0,
    streak: input.streak ?? 0,
  };
}
