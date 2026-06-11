/**
 * Production-grade routine generation audit — ages 0–36 months.
 * Mirrors POST /routines/generate pipeline (rule-based + intelligence pipeline).
 */
import { resolveRoutineGenerationInputs } from "../src/lib/routine-input-validation.ts";
import { generateRuleBasedRoutine } from "../src/lib/routine-templates.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { runBlockingTrustValidation } from "../src/lib/routine-trust-validators.ts";
import { parseTimeToMins } from "../src/lib/routine-scheduler.ts";

function getSmartWakeSleepDefaults(years, months) {
  const total = years * 12 + months;
  if (total < 12) return { wakeUpTime: "07:00", sleepTime: "19:30" };
  if (total < 36) return { wakeUpTime: "07:00", sleepTime: "20:00" };
  if (total < 72) return { wakeUpTime: "07:00", sleepTime: "21:00" };
  return { wakeUpTime: "06:30", sleepTime: "21:30" };
}

const COUNTRIES = ["IN", "US", "AE", "GB", "AU"];
const MOODS = ["normal", "happy", "tired", "upset", "hyperactive", "sick"];
const WEATHER = ["yes", "no", "limited"];
const CAREGIVERS = ["mom", "dad", "both", "grandparent", "babysitter"];
const FOOD_TYPES = ["veg", "non_veg", "vegan"];
const WAKES = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00"];
const SLEEPS = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

function ageGroupFromMonths(m) {
  if (m < 12) return "infant";
  if (m < 36) return "toddler";
  if (m < 60) return "preschool";
  if (m < 120) return "early_school";
  return "pre_teen";
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function classifyError(err) {
  if (!err) return "unknown";
  if (err.startsWith("trust-")) return err.split(":")[0] + ":" + err.split(":")[1]?.trim().slice(0, 40);
  if (err.startsWith("age-feeding:")) return "age-feeding";
  if (err.startsWith("infant safety:")) return "infant safety";
  if (err.includes("overlap:")) return "overlap";
  if (err.includes("sleep not at bedtime")) return "sleep-anchor";
  if (err.includes("idle gap")) return "idle-gap";
  if (err.includes("Wake windows") || err.includes("awake after")) return "wake-window";
  if (err.includes("Back-to-back")) return "adjacency";
  if (err.startsWith("unresolved:")) return "unresolved-soft";
  if (err.includes("tight gap")) return "tight-gap-soft";
  return err.slice(0, 60);
}

function runOne(rng, totalAgeMonths) {
  const ageGroup = ageGroupFromMonths(totalAgeMonths);
  const years = Math.floor(totalAgeMonths / 12);
  const months = totalAgeMonths % 12;
  const defaults = getSmartWakeSleepDefaults(years, months);
  const useDefaults = rng() < 0.35;
  const wake = useDefaults ? defaults.wakeUpTime : pick(rng, WAKES);
  const sleep = useDefaults ? defaults.sleepTime : pick(rng, SLEEPS);
  if (parseTimeToMins(sleep) <= parseTimeToMins(wake)) {
    return { skip: true, reason: "invalid_wake_sleep" };
  }

  const hasSchool = totalAgeMonths >= 36 && rng() < 0.55;
  const country = pick(rng, COUNTRIES);
  const mood = pick(rng, MOODS);
  const weatherOutdoor = pick(rng, WEATHER);
  const caregiver = pick(rng, CAREGIVERS);
  const foodType = pick(rng, FOOD_TYPES);

  const { resolved } = resolveRoutineGenerationInputs(
    { mood, weatherOutdoor, hasSchool: hasSchool || undefined },
    {
      wakeUpTime: wake,
      sleepTime: sleep,
      schoolStartTime: "09:00",
      schoolEndTime: "15:00",
      hasSchool,
    },
  );

  const ctx = buildRoutineContext({
    country,
    hasSchool: resolved.hasSchool,
    mood: resolved.mood,
    weatherOutdoor: resolved.weatherOutdoor,
    temperatureC: rng() < 0.1 ? 42 : rng() < 0.1 ? 5 : 25,
    aqi: rng() < 0.08 ? 350 : rng() < 0.1 ? 180 : 50,
    isWeekendDay: rng() < 0.3,
  });

  const rule = generateRuleBasedRoutine({
    childName: "AuditChild",
    ageGroup,
    totalAgeMonths,
    wakeUpTime: resolved.wakeUpTime,
    sleepTime: resolved.sleepTime,
    schoolStartTime: resolved.schoolStartTime,
    schoolEndTime: resolved.schoolEndTime,
    travelMode: "car",
    hasSchool: resolved.hasSchool && totalAgeMonths >= 36,
    mood: resolved.mood,
    foodType,
    caregiver,
    weatherOutdoor: resolved.weatherOutdoor,
    date: "2026-06-11",
  });

  const pipe = runRoutineIntelligencePipeline({
    items: rule.items.map((i) => ({ ...i, status: "pending" })),
    scheduleOpts: {
      wakeUpTime: resolved.wakeUpTime,
      sleepTime: resolved.sleepTime,
      ageGroup,
      hasSchool: resolved.hasSchool && totalAgeMonths >= 36,
      schoolStartMins: parseTimeToMins(resolved.schoolStartTime),
      schoolEndMins: parseTimeToMins(resolved.schoolEndTime),
      ageInMonths: totalAgeMonths,
    },
    builtContext: ctx,
    childProfile: { ageGroup, ageInMonths: totalAgeMonths },
    mealSeed: Math.floor(rng() * 100000),
    isVeg: foodType !== "non_veg",
  });

  const trust = runBlockingTrustValidation(pipe.items, {
    wakeMins: parseTimeToMins(resolved.wakeUpTime),
    sleepMins: parseTimeToMins(resolved.sleepTime),
    ageGroup,
    ageInMonths: totalAgeMonths,
    country,
    hasSchool: resolved.hasSchool && totalAgeMonths >= 36,
  });

  const blockingErrors = (pipe.validationErrors ?? []).filter(
    (e) =>
      !e.startsWith("unresolved:") &&
      !e.includes("tight gap") &&
      !e.startsWith("overlap: shifted"),
  );

  return {
    skip: false,
    totalAgeMonths,
    ageGroup,
    wake: resolved.wakeUpTime,
    sleep: resolved.sleepTime,
    hasSchool: resolved.hasSchool,
    country,
    mood,
    weatherOutdoor,
    validated: pipe.validated,
    trustValid: trust.valid,
    reverted: pipe.reverted,
    itemCount: pipe.items?.length ?? 0,
    blockingErrors,
    trustErrors: trust.errors,
    allErrors: pipe.validationErrors ?? [],
  };
}

const TARGET = 1200;
const rng = mulberry32(42);
const results = [];
const failures = [];
const errStats = new Map();
const byAge = new Map();

for (let i = 0; i < TARGET; i++) {
  const totalAgeMonths = Math.floor(rng() * 37); // 0–36 inclusive
  const r = runOne(rng, totalAgeMonths);
  if (r.skip) continue;
  results.push(r);

  const ageKey = String(totalAgeMonths);
  if (!byAge.has(ageKey)) byAge.set(ageKey, { ok: 0, fail: 0 });
  const would422 = !r.validated; // mirrors routes.ts rulePiped.validated check
  if (would422) {
    byAge.get(ageKey).fail++;
    failures.push(r);
    for (const e of r.blockingErrors.length ? r.blockingErrors : r.allErrors.slice(0, 3)) {
      const k = classifyError(e);
      errStats.set(k, (errStats.get(k) ?? 0) + 1);
    }
  } else {
    byAge.get(ageKey).ok++;
  }
}

const failRate = failures.length / results.length;
const agesWithFail = [...byAge.entries()].filter(([, v]) => v.fail > 0);

console.log(
  JSON.stringify(
    {
      audit: "routine-generation-0-36mo",
      totalRuns: results.length,
      targetRequested: TARGET,
      pipelineValidatedFail: failures.length,
      failRatePct: (failRate * 100).toFixed(2) + "%",
      trustFailDespiteValidated: results.filter((r) => r.validated && !r.trustValid).length,
      emptyItems: results.filter((r) => r.itemCount === 0).length,
      revertedCount: results.filter((r) => r.reverted).length,
      agesWithAnyFail: agesWithFail.length,
      topValidators: [...errStats.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      sampleFailures: failures.slice(0, 15).map((f) => ({
        ageMonths: f.totalAgeMonths,
        ageGroup: f.ageGroup,
        wake: f.wake,
        sleep: f.sleep,
        hasSchool: f.hasSchool,
        country: f.country,
        errors: f.blockingErrors.length ? f.blockingErrors : f.allErrors.slice(0, 5),
      })),
      perAgeFail: Object.fromEntries(
        agesWithFail.sort((a, b) => Number(a[0]) - Number(b[0])),
      ),
    },
    null,
    2,
  ),
);
