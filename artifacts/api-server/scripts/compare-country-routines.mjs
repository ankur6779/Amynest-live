/**
 * Compare country-specific routine outputs for identical fixed input.
 * Run: node --import tsx/esm scripts/compare-country-routines.mjs
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { getCountryRoutineProfile, getCountryLabelPack } from "../src/lib/routine-country-profile.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  hardValidateSchedule,
} from "../src/lib/routine-scheduler.ts";

const FIXED_INPUT = {
  age: 8,
  wakeTime: "07:00",
  sleepTime: "21:00",
  hasSchool: true,
  schoolStart: "09:00",
  schoolEnd: "15:00",
  mood: "normal",
  caregiver: "parent",
  weather: { condition: "clear", temperature: 25 },
  region: "default",
  fridgeItems: ["milk", "eggs", "bread", "rice", "vegetables"],
  goals: ["balanced development"],
};

const COUNTRIES = [
  { label: "USA", code: "US", flag: "🇺🇸" },
  { label: "UK", code: "UK", flag: "🇬🇧" },
  { label: "Australia", code: "AU", flag: "🇦🇺" },
  { label: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { label: "Austria", code: "AT", flag: "🇦🇹" },
  { label: "UAE", code: "AE", flag: "🇦🇪" },
  { label: "India", code: "IN", flag: "🇮🇳" },
];

/** Neutral canonical day — identical for every country before localization. */
function buildCanonicalBase() {
  const items = [
    { time: "07:00", activity: "Wake up & freshen up", duration: 30, category: "morning_routine", status: "pending" },
    { time: "07:45", activity: "Breakfast", duration: 30, category: "meal", status: "pending" },
    { time: "09:00", activity: "At school", duration: 360, category: "school", status: "pending" },
    { time: "15:15", activity: "Homework", duration: 45, category: "study", status: "pending" },
    { time: "16:15", activity: "Outdoor play", duration: 45, category: "outdoor", status: "pending" },
    { time: "17:15", activity: "Creative play", duration: 30, category: "play", status: "pending" },
    { time: "18:30", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
    { time: "20:15", activity: "Wind-down & story", duration: 30, category: "rest", status: "pending" },
    { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
  ];
  return enforceSchoolBlock(items, true, "09:00", "15:00", "Year 3");
}

function formatRoutine(items) {
  return items
    .filter((it) => (it.duration ?? 0) >= 10 || /sleep|lights out/i.test(it.activity))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time))
    .map((it) => {
      const start = normalizeTo24h(it.time);
      const end = minsToTime24(parseTimeToMins(start) + (it.duration ?? 30));
      return {
        activity: it.activity,
        start,
        end,
        category: it.category,
        culturalTag: it.culturalTag ?? undefined,
        reason: it.routineExplanation?.reason ?? it.scheduleDecision?.reason ?? undefined,
        source: it.routineExplanation?.source ?? undefined,
      };
    });
}

function pickHighlights(formatted, code) {
  const labels = getCountryLabelPack(code);
  const dinner = formatted.find((i) => /dinner/i.test(i.activity));
  const sleep = formatted.find((i) => /sleep|lights out/i.test(i.activity));
  const study = formatted.filter((i) => i.category === "study" || /homework|tuition|study|hausaufgaben/i.test(i.activity));
  const outdoor = formatted.filter((i) => i.category === "outdoor" || /outdoor|park|backyard|cricket|beach/i.test(i.activity));
  const extra = formatted.filter((i) =>
    /soccer|football club|sports practice|music|club|tuition/i.test(i.activity),
  );
  const indep = formatted.filter((i) =>
    /get ready|on your own|independently|pack backpack|selbstständig/i.test(i.activity),
  );
  return { labels, dinner, sleep, study, outdoor, extra, indep };
}

const baseItems = buildCanonicalBase();
const results = [];

for (const { label, code, flag } of COUNTRIES) {
  const builtContext = buildRoutineContext({
    country: code,
    weatherOutdoor: "yes",
    hasSchool: true,
    mood: "normal",
    temperatureC: FIXED_INPUT.weather.temperature,
    region: FIXED_INPUT.region,
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: baseItems.map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
      hasSchool: true,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
    },
    builtContext,
    childProfile: { ageGroup: "early_school" },
    behaviorHistory: {
      entries: [],
      previousDayContext: { moodScore: "normal", activityCompletion: 70 },
    },
  });

  const formatted = formatRoutine(pipeline.items);
  const hard = hardValidateSchedule(pipeline.items, "07:00", "21:00");
  const profile = getCountryRoutineProfile(code);
  const highlights = pickHighlights(formatted, code);

  results.push({
    label,
    code,
    flag,
    formatted,
    hard,
    pipeline,
    profile,
    highlights,
  });
}

console.log(JSON.stringify({ input: FIXED_INPUT, results: results.map((r) => ({
  country: r.label,
  code: r.code,
  valid: r.hard.valid,
  errors: r.hard.errors,
  reverted: r.pipeline.reverted,
  routine: r.formatted.map(({ activity, start, end }) => ({ activity, start, end })),
  highlights: {
    dinner: r.highlights.dinner?.start,
    sleep: r.highlights.sleep?.start,
    studyActivities: r.highlights.study.map((s) => s.activity),
    outdoorActivities: r.highlights.outdoor.map((s) => s.activity),
    extracurricular: r.highlights.extra.map((s) => s.activity),
    independence: r.highlights.indep.map((s) => s.activity),
  },
  profile: {
    dinnerWindow: r.profile.dinnerWindow,
    sleepWindow: r.profile.sleepWindow,
    extracurricularCulture: r.profile.extracurricularCulture,
    outdoorPreference: r.profile.outdoorPreference,
    academicIntensity: r.profile.academicIntensity,
    independenceLevel: r.profile.independenceLevel,
  },
  state: r.pipeline.state,
  culturalChanges: r.pipeline.culturalChanges,
})) }, null, 2));
