/**
 * Autonomy development — age-appropriate independence blocks for pre-teens+.
 */
import type { AgeGroup } from "./routine-templates.js";
import {
  attachActivityMetadata,
  getActivityMetadata,
  matchesAgeGroup,
} from "./routine-activity-metadata.js";
import {
  isLockedScheduleItem,
  isSleepItem,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  type RoutineScheduleItem,
  type ScheduleDecisionMeta,
} from "./routine-scheduler.js";
import { isProtectedScheduleBlock } from "./routine-category-taxonomy.js";

const INDEPENDENCE_RE =
  /\b(independence|self[- ]?care|pack backpack|get ready on your own|get dressed independently|lay out clothes|pack school bag|selbstständig)\b/i;

export type AutonomyContext = {
  ageGroup?: AgeGroup;
  requireIndependenceTasks: boolean;
  independenceMorningLabel: string;
  independenceEveningLabel: string;
  wakeMins: number;
  sleepMins: number;
  schoolEndMins?: number;
  hasSchool?: boolean;
};

export type AutonomyAdjustment = {
  activity: string;
  change: string;
};

function hasIndependenceBlock(items: RoutineScheduleItem[]): boolean {
  return items.some(
    (it) =>
      INDEPENDENCE_RE.test(it.activity) ||
      it.culturalTag === "autonomy_evening" ||
      it.culturalTag === "autonomy_morning",
  );
}

function tag(item: RoutineScheduleItem, reason: string): RoutineScheduleItem {
  const decision: ScheduleDecisionMeta = {
    reason,
    source: "development",
    originalActivity: item.activity,
  };
  return { ...item, scheduleDecision: decision };
}

function findMorningSlot(wakeMins: number, items: RoutineScheduleItem[]): number {
  const sorted = items
    .filter((it) => !isSleepItem(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const first = sorted[0];
  if (!first) return wakeMins + 15;
  const firstStart = parseTimeToMins(first.time);
  return Math.max(wakeMins + 10, firstStart - 25);
}

function findEveningSlot(sleepMins: number, items: RoutineScheduleItem[]): number {
  const sorted = items
    .filter((it) => !isSleepItem(it) && !isProtectedScheduleBlock(it))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
  const last = sorted[sorted.length - 1];
  if (!last) return sleepMins - 55;
  const lastStart = parseTimeToMins(last.time);
  return Math.min(sleepMins - 50, Math.max(lastStart - 35, sleepMins - 90));
}

/**
 * Reinforce autonomy-friendly blocks when profile requires independence tasks.
 */
export function applyAutonomyDevelopment(
  items: RoutineScheduleItem[],
  ctx: AutonomyContext,
): { items: RoutineScheduleItem[]; adjustments: AutonomyAdjustment[] } {
  const adjustments: AutonomyAdjustment[] = [];

  if (!ctx.requireIndependenceTasks) {
    return { items, adjustments };
  }

  const ageOk =
    ctx.ageGroup === "pre_teen" ||
    ctx.ageGroup === "early_school" ||
    ctx.ageGroup === "preschool";
  if (!ageOk) {
    return { items, adjustments };
  }

  let working = items.map((it) => ({ ...it }));

  for (let i = 0; i < working.length; i++) {
    const item = working[i]!;
    if (!INDEPENDENCE_RE.test(item.activity)) continue;
    const meta = getActivityMetadata(item);
    if (!meta.autonomyFriendly) {
      working[i] = attachActivityMetadata(
        tag(
          {
            ...item,
            notes:
              (item.notes ? `${item.notes} ` : "") +
              "Autonomy: child-led steps with parent check-in only if needed.",
          },
          "Autonomy: reinforced independence block",
        ),
        { autonomyFriendly: true },
      );
      adjustments.push({
        activity: item.activity,
        change: "autonomy: reinforced existing independence block",
      });
    }
  }

  if (
    !working.some((it) => it.culturalTag === "autonomy_morning") &&
    !hasIndependenceBlock(working)
  ) {
    const morningStart = findMorningSlot(ctx.wakeMins, working);
    const morningBlock = attachActivityMetadata(
      tag(
        {
          time: minsToTime24(morningStart),
          activity: ctx.independenceMorningLabel,
          duration: ctx.ageGroup === "pre_teen" ? 20 : 15,
          category: "self_care",
          status: "pending",
          notes: "Autonomy: morning self-care routine — builds daily independence.",
          energyImpact: "low",
          culturalTag: "autonomy_morning",
        },
        "Autonomy: added morning independence block",
      ),
      { autonomyFriendly: true, category: "self-care", intensity: "low" },
    );

    if (
      ctx.ageGroup &&
      matchesAgeGroup(getActivityMetadata(morningBlock), ctx.ageGroup)
    ) {
      working.push(morningBlock);
      adjustments.push({
        activity: morningBlock.activity,
        change: "autonomy: inserted morning independence block",
      });
    }
  }

  if (
    (ctx.ageGroup === "pre_teen" || ctx.ageGroup === "early_school") &&
    !working.some((it) => it.culturalTag === "autonomy_evening")
  ) {
    const eveningStart = findEveningSlot(ctx.sleepMins, working);
    const eveningBlock = attachActivityMetadata(
      tag(
        {
          time: minsToTime24(eveningStart),
          activity: ctx.independenceEveningLabel,
          duration: 15,
          category: "self_care",
          status: "pending",
          notes: "Autonomy: evening prep — pack bag, lay out clothes, or tidy space.",
          energyImpact: "low",
          culturalTag: "autonomy_evening",
        },
        "Autonomy: added evening independence block",
      ),
      { autonomyFriendly: true, category: "self-care", intensity: "low" },
    );
    working.push(eveningBlock);
    adjustments.push({
      activity: eveningBlock.activity,
      change: "autonomy: inserted evening independence block",
    });
  }

  working.sort(
    (a, b) => parseTimeToMins(normalizeTo24h(a.time)) - parseTimeToMins(normalizeTo24h(b.time)),
  );

  void ctx.schoolEndMins;
  void ctx.hasSchool;
  void isLockedScheduleItem;

  return { items: working, adjustments };
}
