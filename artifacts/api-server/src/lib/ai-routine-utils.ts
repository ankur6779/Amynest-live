import { timeToMins, type AgeGroup } from "./routine-templates.js";
import {
  generateRoutineFromState,
  rawContextFromScheduleInput,
} from "./routine-decision-engine.js";
import {
  deriveBehavioralState,
  type ChildProfileForRoutine,
  type InterpretedBehavioralState,
  type RoutineRawContext,
} from "./routine-context-engine.js";
import {
  scheduleRoutineItems,
  normalizeTo24h,
  minsToTime24,
  type RoutineScheduleItem,
  type ScheduleOpts,
} from "./routine-scheduler.js";

export type AiRoutineItem = RoutineScheduleItem;

export type ReAnchorContext = RoutineRawContext & {
  childProfile?: ChildProfileForRoutine;
  interpretedState?: InterpretedBehavioralState;
};

export function reAnchorToWakeTime(
  items: AiRoutineItem[],
  wakeUpTime: string,
  sleepTime: string,
  ageGroup: AgeGroup,
  opts?: Pick<ScheduleOpts, "hasSchool" | "schoolStartMins" | "schoolEndMins"> & {
    context?: ReAnchorContext;
  },
): AiRoutineItem[] {
  const wake = normalizeTo24h(wakeUpTime);
  const sleep = normalizeTo24h(sleepTime);
  const scheduleOpts: ScheduleOpts = {
    wakeUpTime: wake,
    sleepTime: sleep,
    ageGroup,
    hasSchool: opts?.hasSchool,
    schoolStartMins: opts?.schoolStartMins,
    schoolEndMins: opts?.schoolEndMins,
  };

  if (opts?.context) {
    const childProfile: ChildProfileForRoutine = opts.context.childProfile ?? {
      ageGroup,
    };
    const state =
      opts.context.interpretedState ??
      deriveBehavioralState(
        rawContextFromScheduleInput(opts.context),
        childProfile,
      );
    return generateRoutineFromState(items, state, scheduleOpts).items;
  }

  return scheduleRoutineItems(items, scheduleOpts);
}

export { deriveBehavioralState, generateRoutineFromState };

export function enforceSchoolBlock(
  items: AiRoutineItem[],
  hasSchool: boolean,
  schoolStartTime: string,
  schoolEndTime: string,
  childClass: string | undefined,
): AiRoutineItem[] {
  if (!items.length) return items;

  if (!hasSchool) {
    return items.filter((it) => (it.category ?? "").toLowerCase() !== "school");
  }

  const schoolStart = timeToMins(normalizeTo24h(schoolStartTime));
  const schoolEnd = timeToMins(normalizeTo24h(schoolEndTime));
  if (schoolEnd <= schoolStart) return items;
  const schoolDur = schoolEnd - schoolStart;

  const kept = items.filter((it) => {
    const t = timeToMins(normalizeTo24h(it.time));
    const end = t + Math.max(1, it.duration ?? 30);
    const overlaps = t < schoolEnd && end > schoolStart;
    const cat = (it.category ?? "").toLowerCase();
    const isSchool = cat === "school";
    const isTiffin = cat === "tiffin";
    return (!overlaps || isTiffin) && !isSchool;
  });

  const schoolItem: AiRoutineItem = {
    time: minsToTime24(schoolStart),
    activity: childClass ? `${childClass} — at school` : "At school",
    duration: schoolDur,
    category: "school",
    notes: "Protected school time — child is unavailable.",
    status: "pending",
  };

  return [...kept, schoolItem].sort(
    (a, b) => timeToMins(normalizeTo24h(a.time)) - timeToMins(normalizeTo24h(b.time)),
  );
}
