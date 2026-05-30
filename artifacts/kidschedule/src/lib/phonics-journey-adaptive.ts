import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";
import type { PhonicsDailyPlan } from "@workspace/phonics-curriculum";
import {
  type GuidedMissionGoal,
  type PhonicsJourneyStage,
  PHONICS_JOURNEY_STAGES,
  SESSIONS_PER_STAGE_EXPORT,
} from "./phonics-journey-roadmap";
import type { WeeklyMomentum } from "./phonics-journey-engagement";
import type { PhonicsHabitState } from "./phonics-journey-habit";

export type ReviewTier = "needs_review" | "almost_mastered" | "mastered" | "new";

export type AdaptiveDifficulty = "challenge" | "balanced" | "review";

export type WeakSoundsProfile = {
  sounds: string[];
  primary: string | null;
  focusMessage: string;
};

export type PredictiveMilestone = {
  stageName: string;
  forecast: string;
};

export type EngagementRisk = {
  atRisk: true;
  title: string;
  message: string;
  actions: { label: string; scrollTarget: string }[];
};

export type LearningVelocity = {
  label: string;
  detail: string;
};

export type MilestoneActionPlan = {
  stageName: string;
  items: { label: string; done: boolean }[];
};

export type PhonicsAdaptiveState = {
  lastRecordedTestScore: number | null;
  priorWeekKey: string;
  priorWeekMastered: number;
  priorWeekAccuracy: number;
};

const STORAGE_PREFIX = "amynest:phonics-adaptive:";

const DIGRAPH_PATTERNS: { display: string; test: (item: DisplayPhonicsItem) => boolean }[] = [
  { display: "SH", test: (i) => /sh/i.test(i.symbol) || /ʃ/.test(i.phoneme ?? "") },
  { display: "TH", test: (i) => /th/i.test(i.symbol) || /[θð]/.test(i.phoneme ?? "") },
  { display: "CH", test: (i) => /ch/i.test(i.symbol) || /tʃ|dʒ/.test(i.phoneme ?? "") },
  { display: "NG", test: (i) => /ng/i.test(i.symbol) || /ŋ/.test(i.phoneme ?? "") },
];

const PHONEME_DISPLAY: Record<string, string> = {
  "ʃ": "SH",
  "θ": "TH",
  "ð": "TH",
  "tʃ": "CH",
  "dʒ": "J",
  "ŋ": "NG",
  "ɪ": "I",
  "æ": "A",
  "ɛ": "E",
  "ɒ": "O",
  "ʌ": "U",
  "i": "I",
  "a": "A",
  "e": "E",
  "o": "O",
  "u": "U",
};

function weekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export function defaultAdaptiveState(): PhonicsAdaptiveState {
  return {
    lastRecordedTestScore: null,
    priorWeekKey: weekKey(),
    priorWeekMastered: 0,
    priorWeekAccuracy: 0,
  };
}

export function loadPhonicsAdaptiveState(childId: number): PhonicsAdaptiveState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultAdaptiveState();
    return { ...defaultAdaptiveState(), ...JSON.parse(raw) };
  } catch {
    return defaultAdaptiveState();
  }
}

export function savePhonicsAdaptiveState(childId: number, state: PhonicsAdaptiveState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function phonemeDisplayName(phoneme: string): string {
  const key = phoneme.trim();
  if (PHONEME_DISPLAY[key]) return PHONEME_DISPLAY[key]!;
  if (key.length <= 3 && /^[a-zA-Z]+$/.test(key)) return key.toUpperCase();
  return key;
}

export function inferWeakSoundsFromProgress(
  progress: PhonicsProgressMap,
  items: DisplayPhonicsItem[],
): string[] {
  const struggling = items.filter((i) => {
    const plays = progress.practiced[i.id] ?? 0;
    return plays >= 3 && !progress.mastered[i.id];
  });

  const scores = new Map<string, number>();
  for (const item of struggling) {
    for (const { display, test } of DIGRAPH_PATTERNS) {
      if (test(item)) {
        scores.set(display, (scores.get(display) ?? 0) + (progress.practiced[item.id] ?? 0));
      }
    }
    const sym = item.symbol.trim();
    if (sym.length === 1) {
      const d = sym.toUpperCase();
      scores.set(d, (scores.get(d) ?? 0) + 1);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);
}

export function buildWeakSoundsProfile(
  apiWeakPhonemes: string[],
  progress: PhonicsProgressMap,
  items: DisplayPhonicsItem[],
): WeakSoundsProfile {
  const fromApi = apiWeakPhonemes.map(phonemeDisplayName);
  const fromProgress = inferWeakSoundsFromProgress(progress, items);
  const sounds = [...new Set([...fromApi, ...fromProgress])].slice(0, 5);
  const primary = sounds[0] ?? null;

  const focusMessage = primary
    ? `${primary} sounds need extra practice this week.`
    : "Keep steady practice — consistency builds strong readers.";

  return { sounds, primary, focusMessage };
}

export function getMissedWords(
  progress: PhonicsProgressMap,
  items: DisplayPhonicsItem[],
): DisplayPhonicsItem[] {
  return items.filter(
    (i) =>
      (i.type === "word" || i.type === "letter") &&
      (progress.practiced[i.id] ?? 0) >= 2 &&
      !progress.mastered[i.id],
  );
}

function itemsMatchingWeakSound(
  sound: string,
  items: DisplayPhonicsItem[],
): DisplayPhonicsItem[] {
  const pattern = DIGRAPH_PATTERNS.find((p) => p.display === sound);
  if (pattern) {
    return items.filter(pattern.test);
  }
  const lower = sound.toLowerCase();
  return items.filter(
    (i) =>
      i.symbol.toLowerCase() === lower ||
      (i.phoneme ?? "").toLowerCase() === lower,
  );
}

function weakSoundGoalDone(
  sound: string,
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  plan: PhonicsDailyPlan | null,
  todayUniqueSounds: number,
): boolean {
  if (plan) {
    const related = [...plan.practice, ...plan.revision].filter((a) => {
      const t = a.target.toLowerCase();
      const s = sound.toLowerCase();
      return t.includes(s) || a.label.toLowerCase().includes(s);
    });
    if (related.length > 0) return related.every((a) => a.completed);
  }
  const matching = itemsMatchingWeakSound(sound, items);
  if (matching.length === 0) return todayUniqueSounds >= 5;
  const practiced = matching.filter((i) => (progress.practiced[i.id] ?? 0) > 0).length;
  const target = Math.min(5, matching.length);
  return practiced >= target || matching.filter((i) => progress.mastered[i.id]).length >= target;
}

function missedWordsGoalDone(
  missed: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  plan: PhonicsDailyPlan | null,
  todayMastered: string[],
): boolean {
  if (missed.length === 0) return true;
  if (plan) {
    const revisionDone = plan.revision.filter((a) => !a.completed).length === 0;
    if (revisionDone && plan.revision.length > 0) return true;
  }
  const target = Math.min(3, missed.length);
  const masteredMissed = missed.filter(
    (i) => progress.mastered[i.id] || todayMastered.includes(i.symbol),
  ).length;
  return masteredMissed >= target;
}

/** Adaptive daily mission — weak sounds, missed words, Quick Check. */
export function buildAdaptiveMissionGoals(
  plan: PhonicsDailyPlan | null,
  progress: PhonicsProgressMap,
  practiceItems: DisplayPhonicsItem[],
  weakProfile: WeakSoundsProfile,
  quizComplete: boolean,
  todayUniqueSounds: number,
  todayMastered: string[],
): GuidedMissionGoal[] {
  const goals: GuidedMissionGoal[] = [];
  const missed = getMissedWords(progress, practiceItems);

  if (weakProfile.primary) {
    const matching = itemsMatchingWeakSound(weakProfile.primary, practiceItems);
    const target = Math.min(5, Math.max(3, matching.length || 5));
    goals.push({
      id: "weak_sound",
      emoji: "🎯",
      label: `Practice ${target} ${weakProfile.primary} word${target !== 1 ? "s" : ""}`,
      done: weakSoundGoalDone(
        weakProfile.primary,
        practiceItems,
        progress,
        plan,
        todayUniqueSounds,
      ),
    });
  }

  if (missed.length > 0) {
    const reviewCount = Math.min(3, missed.length);
    goals.push({
      id: "review_missed",
      emoji: "🔄",
      label: `Review ${reviewCount} missed word${reviewCount !== 1 ? "s" : ""}`,
      done: missedWordsGoalDone(missed, progress, plan, todayMastered),
    });
  }

  if (plan && goals.length === 0) {
    const unfinished = [...plan.practice, ...plan.revision].filter((a) => !a.completed);
    if (unfinished.length > 0) {
      goals.push({
        id: "plan_activity",
        emoji: "📚",
        label: unfinished[0]!.label,
        done: false,
      });
    }
  }

  if (goals.length === 0) {
    goals.push({
      id: "sounds",
      emoji: "🎯",
      label: "Practice 5 sounds",
      done: todayUniqueSounds >= 5,
    });
  }

  goals.push({
    id: "quiz",
    emoji: "📝",
    label: "Complete Quick Check",
    done: quizComplete || (plan?.test.completed ?? false),
  });

  return goals.slice(0, 3);
}

export function classifyReviewTier(
  item: DisplayPhonicsItem,
  progress: PhonicsProgressMap,
): ReviewTier {
  if (progress.mastered[item.id]) return "mastered";
  const count = progress.practiced[item.id] ?? 0;
  if (count === 0) return "new";
  if (count >= 3) return "needs_review";
  if (count >= 1) return "almost_mastered";
  return "new";
}

export function reviewTierLabel(tier: ReviewTier): string | null {
  switch (tier) {
    case "needs_review":
      return "Needs Review";
    case "almost_mastered":
      return "Almost Mastered";
    case "mastered":
      return "Mastered";
    default:
      return null;
  }
}

function reviewPriority(
  item: DisplayPhonicsItem,
  progress: PhonicsProgressMap,
  weakSounds: string[],
): number {
  if (progress.mastered[item.id]) return -1000;
  const tier = classifyReviewTier(item, progress);
  let score = 0;
  if (tier === "needs_review") score += 100;
  if (tier === "almost_mastered") score += 60;
  if (tier === "new") score += 20;
  score += progress.practiced[item.id] ?? 0;

  for (const sound of weakSounds) {
    if (itemsMatchingWeakSound(sound, [item]).length > 0) score += 40;
  }
  return score;
}

export function sortItemsForSmartReview(
  items: DisplayPhonicsItem[],
  progress: PhonicsProgressMap,
  weakSounds: string[],
  mode: AdaptiveDifficulty,
): DisplayPhonicsItem[] {
  const sorted = [...items].sort(
    (a, b) =>
      reviewPriority(b, progress, weakSounds) - reviewPriority(a, progress, weakSounds),
  );

  if (mode === "challenge") {
    return sorted.sort((a, b) => {
      const aNew = classifyReviewTier(a, progress) === "new" ? 1 : 0;
      const bNew = classifyReviewTier(b, progress) === "new" ? 1 : 0;
      return bNew - aNew;
    });
  }
  if (mode === "review") {
    return sorted;
  }
  return sorted;
}

export function computeReadingConfidenceScore(params: {
  masteryScore: number;
  lastTestScore: number | null;
  streak: number;
  momentum: WeeklyMomentum;
  masteredCount: number;
  practicedCount: number;
}): number {
  const accuracy = params.lastTestScore ?? params.momentum.accuracyPct;
  const masteryRatio =
    params.practicedCount > 0
      ? Math.round((params.masteredCount / params.practicedCount) * 100)
      : params.masteryScore;
  const consistency = Math.min(
    100,
    Math.round((Math.min(params.streak, 14) / 14) * 60 + params.momentum.practiceDays * 6),
  );
  const quiz = params.lastTestScore ?? accuracy;

  const raw =
    accuracy * 0.3 +
    params.masteryScore * 0.25 +
    masteryRatio * 0.15 +
    consistency * 0.15 +
    quiz * 0.15;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function buildPredictiveMilestones(params: {
  activeStage: PhonicsJourneyStage;
  nextStage: PhonicsJourneyStage | null;
  masteryScore: number;
  practiceDaysPerWeek: number;
}): PredictiveMilestone[] {
  const forecasts: PredictiveMilestone[] = [];
  const sessionsPerWeek = Math.max(1, params.practiceDaysPerWeek);
  const withinRemaining = Math.max(0, (100 - params.masteryScore) / 100);
  const sessionsToNext = Math.max(
    1,
    Math.ceil(withinRemaining * SESSIONS_PER_STAGE_EXPORT),
  );
  const daysToNext = Math.max(1, Math.ceil((sessionsToNext / sessionsPerWeek) * 7));

  if (params.nextStage) {
    forecasts.push({
      stageName: params.nextStage.milestoneName,
      forecast:
        sessionsToNext <= 3
          ? `${params.nextStage.milestoneName} in ${sessionsToNext} session${sessionsToNext !== 1 ? "s" : ""}`
          : `${params.nextStage.milestoneName} in ~${daysToNext} day${daysToNext !== 1 ? "s" : ""}`,
    });
  }

  const storyStage = PHONICS_JOURNEY_STAGES.find((s) => s.id === "story_reading");
  if (storyStage && params.activeStage.order < storyStage.order) {
    const stagesLeft = storyStage.order - params.activeStage.order;
    const storySessions = Math.ceil(
      stagesLeft * SESSIONS_PER_STAGE_EXPORT * 0.7 + withinRemaining * SESSIONS_PER_STAGE_EXPORT,
    );
    const storyDays = Math.max(1, Math.ceil((storySessions / sessionsPerWeek) * 7));
    forecasts.push({
      stageName: "Story Reading",
      forecast: `Story Reading in ~${storyDays} day${storyDays !== 1 ? "s" : ""}`,
    });
  }

  return forecasts.slice(0, 2);
}

export function resolveCoachMessage(params: {
  childName: string;
  weakProfile: WeakSoundsProfile;
  missionComplete: boolean;
  quizComplete: boolean;
  masteredToday: number;
  lastTestScore: number | null;
  priorTestScore: number | null;
  activeStage: PhonicsJourneyStage;
}): string {
  const { weakProfile, missionComplete, quizComplete, masteredToday, lastTestScore, priorTestScore } =
    params;

  if (missionComplete && quizComplete) {
    return "Today's reading mission is complete — excellent consistency.";
  }
  if (weakProfile.primary && !missionComplete) {
    return `Let's review ${weakProfile.primary} sounds today.`;
  }
  if (masteredToday >= 2) {
    return `You've mastered ${masteredToday} words today — great progress.`;
  }
  if (
    lastTestScore != null &&
    priorTestScore != null &&
    lastTestScore > priorTestScore + 3
  ) {
    return "Reading accuracy is improving consistently.";
  }
  if (weakProfile.sounds.length >= 2) {
    const recent = weakProfile.sounds.slice(0, 2).join(" and ");
    return `${recent} words are getting stronger — keep going.`;
  }
  if (lastTestScore != null && lastTestScore >= 85) {
    return "Quick Check scores look strong — ready for the next challenge.";
  }
  return `${params.childName} is building ${params.activeStage.milestoneName} skills — one session at a time.`;
}

export function buildPersonalizedParentInsight(params: {
  childName: string;
  weakProfile: WeakSoundsProfile;
  momentum: WeeklyMomentum;
  weeklyBaseline: PhonicsHabitState["weekly"];
  lastTestScore: number | null;
  activeStage: PhonicsJourneyStage;
  masteredCount: number;
  practicedCount: number;
  learningVelocity: LearningVelocity;
}): string {
  const { momentum, weeklyBaseline, lastTestScore, activeStage, learningVelocity } = params;
  const accuracyDelta =
    weeklyBaseline.accuracyPct > 0 && momentum.accuracyPct > 0
      ? momentum.accuracyPct - weeklyBaseline.accuracyPct
      : null;

  if (accuracyDelta != null && accuracyDelta >= 3) {
    return `This week accuracy improved from ${weeklyBaseline.accuracyPct}% to ${momentum.accuracyPct}%.`;
  }

  if (activeStage.id === "blending" && momentum.wordsMastered >= 3) {
    return "Blending skills are improving faster than sound recognition.";
  }

  const independentPct =
    params.practicedCount > 0
      ? Math.round((params.masteredCount / params.practicedCount) * 100)
      : 0;
  if (independentPct >= 25 && params.masteredCount >= 5) {
    return `Your child now reads ${independentPct}% more words independently.`;
  }

  if (params.weakProfile.primary && lastTestScore != null && lastTestScore < 75) {
    return `${params.weakProfile.primary} sounds are the focus this week — extra practice is paying off.`;
  }

  if (learningVelocity.label === "Faster than last week") {
    return `${params.childName} is picking up pace — ${momentum.wordsMastered} words mastered this week.`;
  }

  if (lastTestScore != null && lastTestScore >= 80) {
    return `Quick Check at ${lastTestScore}% — reading accuracy is on track for ${activeStage.milestoneName}.`;
  }

  return `${params.childName} is progressing through ${activeStage.milestoneName} — ${learningVelocity.detail.toLowerCase()}.`;
}

export function detectEngagementRisk(params: {
  streak: number;
  daysSinceActive: number;
  momentum: WeeklyMomentum;
  weeklyBaseline: PhonicsHabitState["weekly"];
  lastTestScore: number | null;
  adaptiveState: PhonicsAdaptiveState;
}): EngagementRisk | null {
  const actions = [
    { label: "Quick Check", scrollTarget: "phonics-daily-quiz" },
    { label: "Review mastered words", scrollTarget: "phonics-practice-sounds" },
    { label: "Continue journey", scrollTarget: "phonics-today-mission" },
  ];

  const accuracyDrop =
    params.weeklyBaseline.accuracyPct > 0 &&
    params.momentum.accuracyPct > 0 &&
    params.momentum.accuracyPct < params.weeklyBaseline.accuracyPct - 8;

  const practiceDrop =
    params.weeklyBaseline.practiceDays >= 3 &&
    params.momentum.practiceDays < params.weeklyBaseline.practiceDays - 2;

  if (params.daysSinceActive >= 2 && params.streak === 0) {
    return {
      atRisk: true,
      title: "Quick Restart Plan",
      message: "A short session today rebuilds momentum — no pressure, just pick one step.",
      actions,
    };
  }

  if (accuracyDrop) {
    return {
      atRisk: true,
      title: "Suggested Focus",
      message: "Accuracy dipped slightly — a quick review session usually turns it around.",
      actions: actions.slice(0, 2),
    };
  }

  if (practiceDrop) {
    return {
      atRisk: true,
      title: "Suggested Focus",
      message: "Practice frequency slowed — even 5 minutes keeps skills sharp.",
      actions,
    };
  }

  if (
    params.adaptiveState.lastRecordedTestScore != null &&
    params.lastTestScore != null &&
    params.lastTestScore < params.adaptiveState.lastRecordedTestScore - 15
  ) {
    return {
      atRisk: true,
      title: "Suggested Focus",
      message: "Let's revisit familiar sounds before trying new ones — success builds confidence.",
      actions: actions.slice(0, 2),
    };
  }

  return null;
}

export function resolveAdaptiveDifficulty(
  masteryScore: number,
  lastTestScore: number | null,
): AdaptiveDifficulty {
  const quiz = lastTestScore ?? masteryScore;
  if (masteryScore >= 75 && quiz >= 85) return "challenge";
  if (masteryScore < 45 || quiz < 60) return "review";
  return "balanced";
}

export function buildWeeklyAiSummary(params: {
  momentum: WeeklyMomentum;
  weeklyBaseline: PhonicsHabitState["weekly"];
  weakProfile: WeakSoundsProfile;
  learningVelocity: LearningVelocity;
}): string {
  const { momentum, weeklyBaseline, weakProfile, learningVelocity } = params;
  const accuracyDelta =
    weeklyBaseline.accuracyPct > 0 && momentum.accuracyPct > 0
      ? momentum.accuracyPct - weeklyBaseline.accuracyPct
      : null;

  const parts: string[] = [];
  parts.push(
    `This week: ${momentum.practiceDays} practice session${momentum.practiceDays !== 1 ? "s" : ""}, ${momentum.wordsMastered} word${momentum.wordsMastered !== 1 ? "s" : ""} mastered`,
  );
  if (accuracyDelta != null && accuracyDelta !== 0) {
    parts.push(`accuracy ${accuracyDelta > 0 ? "improved" : "changed"} ${Math.abs(accuracyDelta)}%`);
  } else if (momentum.accuracyPct > 0) {
    parts.push(`${momentum.accuracyPct}% accuracy`);
  }
  if (weakProfile.primary) {
    const strong = accuracyDelta != null && accuracyDelta > 0;
    parts.push(
      strong
        ? `${weakProfile.primary} sounds are getting stronger`
        : `recommended focus: ${weakProfile.primary} sounds`,
    );
  }
  parts.push(learningVelocity.detail);

  return parts.join(", ") + ".";
}

export function resolveLearningVelocity(
  momentum: WeeklyMomentum,
  weeklyBaseline: PhonicsHabitState["weekly"],
  adaptiveState: PhonicsAdaptiveState,
): LearningVelocity {
  const masteredGain = momentum.wordsMastered - adaptiveState.priorWeekMastered;
  const accuracyGain =
    weeklyBaseline.accuracyPct > 0 && momentum.accuracyPct > 0
      ? momentum.accuracyPct - weeklyBaseline.accuracyPct
      : momentum.accuracyPct - adaptiveState.priorWeekAccuracy;

  if (masteredGain >= 3 || accuracyGain >= 5) {
    return {
      label: "Faster than last week",
      detail: "Learning velocity is ahead of last week",
    };
  }
  if (masteredGain <= 0 && accuracyGain < -5) {
    return {
      label: "Needs additional practice",
      detail: "A few extra sessions will get things moving again",
    };
  }
  return {
    label: "Steady progress",
    detail: "Consistent week-over-week improvement",
  };
}

export function buildMilestoneActionPlan(params: {
  nextStage: PhonicsJourneyStage | null;
  masteryScore: number;
  masteredCount: number;
  quizComplete: boolean;
  quickChecksThisWeek: number;
}): MilestoneActionPlan | null {
  if (!params.nextStage) return null;

  const wordsNeeded = Math.max(0, Math.ceil((85 - params.masteryScore) / 8));
  const checksNeeded = Math.max(0, 2 - params.quickChecksThisWeek);

  return {
    stageName: params.nextStage.milestoneName,
    items: [
      {
        label: `${wordsNeeded} more word${wordsNeeded !== 1 ? "s" : ""}`,
        done: wordsNeeded === 0,
      },
      {
        label: `${checksNeeded} Quick Check${checksNeeded !== 1 ? "s" : ""}`,
        done: checksNeeded === 0 || params.quizComplete,
      },
      {
        label: "1 reading mission",
        done: params.masteryScore >= 70,
      },
    ],
  };
}

export function syncAdaptiveWeeklySnapshot(
  childId: number,
  momentum: WeeklyMomentum,
  lastTestScore: number | null,
): PhonicsAdaptiveState {
  const state = loadPhonicsAdaptiveState(childId);
  const currentWeek = weekKey();

  if (state.priorWeekKey !== currentWeek) {
    const next: PhonicsAdaptiveState = {
      priorWeekKey: currentWeek,
      priorWeekMastered: momentum.wordsMastered,
      priorWeekAccuracy: momentum.accuracyPct,
      lastRecordedTestScore: lastTestScore ?? state.lastRecordedTestScore,
    };
    savePhonicsAdaptiveState(childId, next);
    return next;
  }

  if (lastTestScore != null && lastTestScore !== state.lastRecordedTestScore) {
    const next = { ...state, lastRecordedTestScore: lastTestScore };
    savePhonicsAdaptiveState(childId, next);
    return next;
  }

  return state;
}
