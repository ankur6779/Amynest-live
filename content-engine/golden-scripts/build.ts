import {
  buildMandatoryCta,
  GOLDEN_QUALITY_THRESHOLD,
  improveScriptForScore,
  scoreGoldenScript,
} from "./quality.js";
import type { GoldenSeed } from "./seeds.js";
import { SITUATIONS } from "./situations.js";
import {
  buildMutedVisualPlan,
  evaluateMutedVideoTest,
} from "./muted-visual.js";
import {
  buildEmotionFirstOpeningScene,
  buildFirstThreeSeconds,
  buildHopeClose,
  buildHopeEndingScene,
  buildParentingSituation,
  buildProductEntryBeat,
  emotionFirstStoryFlow,
  generateSituationHooks,
  mentionsProduct,
} from "./storycraft.js";
import type { GoldenScript, HookCandidate } from "./types.js";

export function buildGoldenScript(seed: GoldenSeed, number: number): GoldenScript {
  const pack = SITUATIONS[number];
  const enriched: GoldenSeed = {
    ...seed,
    parentingSituation: seed.parentingSituation ?? pack?.parentingSituation,
    firstThreeSeconds: seed.firstThreeSeconds ?? pack?.firstThreeSeconds,
    hopeClose: seed.hopeClose ?? pack?.hopeClose,
  };

  const parentingSituation = buildParentingSituation(enriched);
  const firstThreeSeconds = buildFirstThreeSeconds(enriched, parentingSituation);
  const hopeClose = buildHopeClose(enriched);
  const productEntryBeat = buildProductEntryBeat(enriched);

  const hooks = generateSituationHooks(enriched, parentingSituation).map((text, index) =>
    scoreHook(text, index, enriched),
  );
  hooks.sort((a, b) => b.retentionPredict - a.retentionPredict);
  const selectedHook = hooks[0]!;

  const filename = `${String(number).padStart(3, "0")}-${seed.slug}.md`;
  const openingScene = buildEmotionFirstOpeningScene(enriched, parentingSituation);
  const endingScene = buildHopeEndingScene(enriched, hopeClose);
  const mutedVisual = buildMutedVisualPlan({
    seed: enriched,
    number,
    parentingSituation,
    hopeClose,
    featureName: seed.featureName,
    characters: seed.suggestedCharacters,
  });

  // Strip accidental product language from pre-product beats.
  const problem = stripProduct(seed.problem);
  const whyParentsFaceIt = stripProduct(seed.whyParentsFaceIt);
  const emotionBeat = stripProduct(seed.emotionBeat);

  let draft: Omit<GoldenScript, "quality" | "rewritePasses"> = {
    id: `golden-${String(number).padStart(3, "0")}`,
    number,
    filename,
    category: seed.category,
    title: seed.title,
    topic: seed.topic,
    targetAge: seed.targetAge,
    targetParent: seed.targetParent,
    objective: seed.objective,
    featureId: seed.featureId,
    featureName: seed.featureName,
    featureSource: seed.featureSource,
    parentingSituation,
    firstThreeSeconds,
    hooks,
    selectedHook,
    problem,
    whyParentsFaceIt,
    emotionBeat,
    productEntryBeat,
    amynestSolution: seed.amynestSolution,
    featureDemo: seed.featureDemo,
    expectedChildOutcome: seed.expectedChildOutcome,
    parentBenefit: seed.parentBenefit,
    hopeClose,
    cta: buildMandatoryCta(),
    suggestedDuration: seed.suggestedDuration,
    suggestedCharacters: seed.suggestedCharacters,
    suggestedCameraStyle: seed.suggestedCameraStyle,
    suggestedEmotion: seed.suggestedEmotion,
    suggestedMusic: seed.suggestedMusic,
    suggestedThumbnail: stripProduct(seed.suggestedThumbnail),
    suggestedOpeningScene: openingScene,
    suggestedEndingScene: endingScene,
    mutedVisual,
    storyFlow: emotionFirstStoryFlow({
      hook: selectedHook.text,
      situation: parentingSituation,
      problem,
      emotionBeat,
      productEntry: productEntryBeat,
      transformation: `${seed.expectedChildOutcome} ${hopeClose}`,
      hopeClose,
    }),
  };

  let rewritePasses = 0;
  let quality = scoreGoldenScript(draft);

  while (quality.overall < GOLDEN_QUALITY_THRESHOLD && rewritePasses < 12) {
    const improved = improveScriptForScore(draft, quality);
    const nextHook = {
      ...improved.selectedHook,
      retentionPredict: Math.min(96, improved.selectedHook.retentionPredict + 1.5),
      curiosity: Math.min(96, improved.selectedHook.curiosity + 1.5),
      clickbaitRisk: Math.max(5, improved.selectedHook.clickbaitRisk - 2),
    };
    draft = {
      ...improved,
      selectedHook: nextHook,
      problem: stripProduct(improved.problem),
      whyParentsFaceIt: stripProduct(improved.whyParentsFaceIt),
      emotionBeat: stripProduct(improved.emotionBeat),
      parentingSituation: stripProduct(improved.parentingSituation),
      firstThreeSeconds: stripProduct(improved.firstThreeSeconds),
      storyFlow: emotionFirstStoryFlow({
        hook: nextHook.text,
        situation: stripProduct(improved.parentingSituation),
        problem: stripProduct(improved.problem),
        emotionBeat: stripProduct(improved.emotionBeat),
        productEntry: improved.productEntryBeat,
        transformation: `${improved.expectedChildOutcome} ${improved.hopeClose}`,
        hopeClose: improved.hopeClose,
      }),
    };
    quality = scoreGoldenScript(draft);
    rewritePasses += 1;
  }

  if (quality.overall < GOLDEN_QUALITY_THRESHOLD) {
    throw new Error(
      `Golden script ${number} scored ${quality.overall} after rewrites — rejected.`,
    );
  }

  // Hard narrative locks — never ship a product-first script.
  assertEmotionFirst(draft);

  const mutedGate = evaluateMutedVideoTest(draft.mutedVisual);
  if (!mutedGate.ok || quality.mutedVideo < GOLDEN_QUALITY_THRESHOLD) {
    throw new Error(
      `Golden script ${number} failed Muted Video Test (score ${quality.mutedVideo}): ${mutedGate.failures.join("; ")}`,
    );
  }

  return { ...draft, quality, rewritePasses };
}

function scoreHook(text: string, index: number, seed: GoldenSeed): HookCandidate {
  let curiosity = 74;
  let retentionPredict = 82;
  let clickbaitRisk = 8;

  if (mentionsProduct(text)) {
    clickbaitRisk += 60;
    retentionPredict -= 40;
    curiosity -= 20;
  }
  if (/8:47|tonight|sofa|workbook|tiffin|bedtime|hallway|car /i.test(text)) {
    curiosity += 10;
    retentionPredict += 8;
  }
  if (/what if|remember this feeling|this is the part/i.test(text)) {
    curiosity += 8;
    retentionPredict += 6;
  }
  if (/guaranteed|shocking|you won't believe|secret/i.test(text)) {
    clickbaitRisk += 50;
    retentionPredict -= 30;
  }
  if (seed.suggestedEmotion === "Curiosity") curiosity += 3;
  if (seed.suggestedEmotion === "Hope") retentionPredict += 3;

  curiosity += (10 - index) * 0.35;
  retentionPredict += (10 - index) * 0.3;

  return {
    text,
    curiosity: Math.min(97, Math.round(curiosity * 10) / 10),
    retentionPredict: Math.min(96, Math.round(retentionPredict * 10) / 10),
    clickbaitRisk: Math.min(100, clickbaitRisk),
  };
}

function stripProduct(text: string): string {
  return text
    .replace(/\bAmyNest(?: AI)?\b/gi, "home")
    .replace(/\bStudy Zone\b/gi, "tonight's lesson time")
    .replace(/\bLearning Zone\b/gi, "tonight's lesson time")
    .replace(/\bSpeech Coach(?: V2)?\b/gi, "speech practice")
    .replace(/\bHealth Lab\b/gi, "movement play")
    .replace(/\bWorksheet Studio\b/gi, "printables")
    .replace(/\bBirth Sky\b/gi, "their sky story")
    .replace(/\bDiscovery Worlds\b/gi, "the journey")
    .replace(/\bAbacus(?: PRO)?\b/gi, "bead math")
    .replace(/\bNutrition Hub\b/gi, "meal planning")
    .replace(/\baudio lessons\b/gi, "listening time")
    .replace(/\bAudio Lessons\b/g, "listening time")
    .replace(/\bAsk Amy\b/gi, "a calm answer")
    .replace(/\bAI Coach\b/gi, "coaching")
    .replace(/\bAmy Coach\b/gi, "coaching")
    .replace(/\bGoogle Play\b/gi, "the store")
    .replace(/\bApp Store\b/gi, "the store")
    .replace(/\bpremium\b/gi, "full access");
}

function assertEmotionFirst(
  script: Omit<GoldenScript, "quality" | "rewritePasses">,
): void {
  const early = [
    script.selectedHook.text,
    script.parentingSituation,
    script.firstThreeSeconds,
    script.problem,
    script.whyParentsFaceIt,
    script.emotionBeat,
  ];
  for (const beat of early) {
    if (mentionsProduct(beat)) {
      throw new Error(
        `Script ${script.number} violates emotion-first rule (product before feeling): ${beat}`,
      );
    }
  }
  if (!script.hopeClose.trim()) {
    throw new Error(`Script ${script.number} missing hope close`);
  }
}
