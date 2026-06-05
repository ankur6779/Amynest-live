import { resolveRoutineGenerationInputs } from "../src/lib/routine-input-validation.ts";
import { generateRuleBasedRoutine } from "../src/lib/routine-templates.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { hardValidateSchedule } from "../src/lib/routine-scheduler.ts";

const countries = ["IN", "US", "UK", "AU", "NZ", "AE"];
const ages = [
  { g: "infant", m: 8, w: "07:00", s: "19:30" },
  { g: "toddler", m: 24, w: "07:00", s: "20:00" },
  { g: "preschool", m: 48, w: "07:00", s: "20:30" },
  { g: "early_school", m: 96, w: "06:45", s: "21:00" },
  { g: "pre_teen", m: 144, w: "06:30", s: "21:30" },
];
const moods = ["happy", "tired", "upset", "emotional", "hyperactive", "sick", "normal"];
const weatherOpts = ["yes", "no", "limited"];

let crashes = 0,
  empty = 0,
  hardFail = 0,
  ok = 0;
const total = 520;
const errors = new Map();

for (let n = 0; n < total; n++) {
  const c = countries[n % countries.length];
  const a = ages[n % ages.length];
  const mood = moods[n % moods.length];
  const w = weatherOpts[n % weatherOpts.length];
  const malformed = n % 52 === 0;
  try {
    const raw = malformed
      ? { wakeUpTime: "99:99", sleepTime: "bad", mood: "???", weatherOutdoor: "maybe" }
      : { mood, weatherOutdoor: w, hasSchool: n % 3 !== 0 };
    const { resolved } = resolveRoutineGenerationInputs(raw, {
      wakeUpTime: a.w,
      sleepTime: a.s,
      hasSchool: raw.hasSchool ?? true,
    });
    const ctx = buildRoutineContext({
      country: c,
      hasSchool: resolved.hasSchool,
      mood: resolved.mood,
      weatherOutdoor: resolved.weatherOutdoor,
      temperatureC: n % 7 === 0 ? 44 : n % 5 === 0 ? 5 : 25,
      aqi: n % 11 === 0 ? 350 : n % 13 === 0 ? 180 : 50,
    });
    const rule = generateRuleBasedRoutine({
      childName: "S",
      ageGroup: a.g,
      totalAgeMonths: a.m,
      wakeUpTime: resolved.wakeUpTime,
      sleepTime: resolved.sleepTime,
      schoolStartTime: "09:00",
      schoolEndTime: "15:00",
      travelMode: "car",
      hasSchool: resolved.hasSchool,
      mood: resolved.mood,
      foodType: n % 2 ? "veg" : "non_veg",
      caregiver: "mom",
      weatherOutdoor: resolved.weatherOutdoor,
      date: "2026-06-01",
    });
    const p = runRoutineIntelligencePipeline({
      items: rule.items.map((i) => ({ ...i, status: "pending" })),
      scheduleOpts: {
        wakeUpTime: resolved.wakeUpTime,
        sleepTime: resolved.sleepTime,
        ageGroup: a.g,
        hasSchool: resolved.hasSchool,
        schoolStartMins: 540,
        schoolEndMins: 900,
      },
      builtContext: ctx,
      childProfile: { ageGroup: a.g, ageInMonths: a.m },
      mealSeed: n,
      isVeg: true,
    });
    if (!p.items.length) empty++;
    else {
      const h = hardValidateSchedule(p.items, resolved.wakeUpTime, resolved.sleepTime);
      if (!h.valid) {
        hardFail++;
        const key = h.errors[0] ?? "unknown";
        errors.set(key, (errors.get(key) ?? 0) + 1);
      } else ok++;
    }
  } catch (e) {
    crashes++;
    const key = e instanceof Error ? e.message.slice(0, 80) : String(e);
    errors.set(key, (errors.get(key) ?? 0) + 1);
  }
}

console.log(
  JSON.stringify(
    {
      total,
      ok,
      empty,
      hardFail,
      crashes,
      okRate: `${((ok / total) * 100).toFixed(1)}%`,
      topErrors: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    },
    null,
    2,
  ),
);
