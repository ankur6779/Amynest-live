import { timeToMins, minsToTime } from "./routine-templates.js";
import type { AgeGroup } from "./routine-templates.js";

export type AiRoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: "pending" | "completed" | "skipped" | "delayed";
  rewardPoints?: number;
  meal?: string | null;
  recipe?: unknown;
  nutrition?: unknown;
  ageBand?: "2-5" | "6-10" | "10+";
  parentHubTopic?: string;
};

export function reAnchorToWakeTime(
  items: AiRoutineItem[],
  wakeUpTime: string,
  sleepTime: string,
  ageGroup: AgeGroup,
): AiRoutineItem[] {
  if (!items.length) return items;
  const wakeMins = timeToMins(wakeUpTime);
  const sleepMins = timeToMins(sleepTime);
  const effectiveSleepMins = sleepMins < wakeMins ? sleepMins + 1440 : sleepMins;

  const sorted = [...items].sort((a, b) => {
    const ta = timeToMins(a.time);
    const tb = timeToMins(b.time);
    const ra = ta < wakeMins - 120 ? ta + 1440 : ta;
    const rb = tb < wakeMins - 120 ? tb + 1440 : tb;
    return ra - rb;
  });

  let sleepIdx = -1;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.category === "sleep" || /sleep|bedtime|good night/i.test(sorted[i]!.activity)) {
      sleepIdx = i;
      break;
    }
  }
  const sleepAnchor = sleepIdx !== -1 ? sorted.splice(sleepIdx, 1)[0]! : null;

  let cursor = wakeMins;
  const anchored: AiRoutineItem[] = sorted.map((item) => {
    const dur = Math.max(1, item.duration ?? 30);
    const result = { ...item, time: minsToTime(cursor) };
    cursor += dur;
    if (cursor >= effectiveSleepMins && item.category !== "sleep") {
      cursor = Math.min(cursor, effectiveSleepMins - 10);
    }
    return result;
  });

  if (sleepAnchor) {
    anchored.push({ ...sleepAnchor, time: minsToTime(sleepMins) });
  }

  return anchored;
}

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

  const schoolStart = timeToMins(schoolStartTime);
  const schoolEnd = timeToMins(schoolEndTime);
  if (schoolEnd <= schoolStart) return items;
  const schoolDur = schoolEnd - schoolStart;

  const kept = items.filter((it) => {
    const t = timeToMins(it.time);
    const end = t + Math.max(1, it.duration ?? 30);
    const overlaps = t < schoolEnd && end > schoolStart;
    const cat = (it.category ?? "").toLowerCase();
    const isSchool = cat === "school";
    const isTiffin = cat === "tiffin";
    return (!overlaps || isTiffin) && !isSchool;
  });

  const schoolItem: AiRoutineItem = {
    time: minsToTime(schoolStart),
    activity: childClass ? `${childClass} — at school` : "At school",
    duration: schoolDur,
    category: "school",
    notes: "Protected school time — child is unavailable.",
    status: "pending",
  };

  return [...kept, schoolItem].sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
}
