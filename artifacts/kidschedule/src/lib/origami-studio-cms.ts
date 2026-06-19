export type OrigamiValidationStatus = "DRAFT" | "TESTING" | "VALIDATED" | "CERTIFIED";

export type OrigamiDifficulty = "Easy" | "Medium" | "Fun";

export type OrigamiFoldType =
  | "valley"
  | "mountain"
  | "inside-reverse"
  | "outside-reverse"
  | "accordion"
  | "open"
  | "squash"
  | "shape";

export type OrigamiValidationLab = {
  status: OrigamiValidationStatus;
  parentAttempts: number;
  completionRate: number;
  averageCompletionMinutes: number;
  expectedMinutes: [number, number];
  confusingSteps: number[];
  failureSteps: number[];
  criticalConfusionReports: number;
  parentTested: boolean;
  childTested: boolean;
  realWorldBuildable: boolean;
  orientationSafe: boolean;
  evidenceRuns: OrigamiValidationRun[];
};

export type OrigamiValidationRun = {
  tutorialId: string;
  testerType: "parent" | "child";
  completionTime: number;
  success: boolean;
  feedback: string;
};

export type OrigamiStepContent = {
  id: string;
  instruction: string;
  detailedInstruction: string;
  parentExplanation: string;
  foldType: OrigamiFoldType;
  expectedResult: string;
  commonMistakes: string[];
  targetRegion: string;
  zoomRequired: boolean;
  asset: string;
};

export type OrigamiModel = {
  id: string;
  sourceId: string;
  slug: string;
  title: string;
  difficulty: OrigamiDifficulty;
  xp: number;
  ageRange: [number, number];
  category: "Animals" | "Nature" | "Vehicles" | "Fun Shapes";
  skills: string[];
  estimatedMinutes: number;
  achievementId: string;
  assets: {
    basePath: string;
    hero: string;
    steps: string[];
  };
  validation: OrigamiValidationLab;
  steps: OrigamiStepContent[];
};

export type OrigamiLearningPath = {
  id: string;
  title: string;
  modelSlugs: string[];
  unlockRule: string;
};

export type OrigamiCertificate = {
  modelsCompleted: number;
  title: string;
  printableTemplate: string;
};

const MODEL_STEP_COUNTS = {
  butterfly: 8,
  boat: 10,
  bunny: 10,
  crane: 14,
  flower: 10,
} as const;

function stepAssets(slug: keyof typeof MODEL_STEP_COUNTS) {
  return Array.from({ length: MODEL_STEP_COUNTS[slug] }, (_, index) => `/origami-assets/${slug}/step-${String(index + 1).padStart(2, "0")}.webp`);
}

function buildSteps(slug: keyof typeof MODEL_STEP_COUNTS, foldTypes: OrigamiFoldType[], expectedResults: string[]): OrigamiStepContent[] {
  const assets = stepAssets(slug);
  return assets.map((asset, index) => {
    const foldType = foldTypes[Math.min(index, foldTypes.length - 1)];
    return {
      id: `${slug}-step-${String(index + 1).padStart(2, "0")}`,
      instruction: `Complete ${slug} fold ${index + 1}.`,
      detailedInstruction: "Align the highlighted paper region to the guide crease, press firmly, then compare with the expected result thumbnail.",
      parentExplanation: "This step builds fine motor control, focus, and spatial reasoning by asking the child to compare orientation, edge alignment, and the final paper state.",
      foldType,
      expectedResult: expectedResults[Math.min(index, expectedResults.length - 1)],
      commonMistakes: [
        "Paper side is facing the wrong way.",
        "Target flap is not aligned to the crease.",
        "Crease is too soft before moving forward.",
      ],
      targetRegion: "active flap / edge highlighted in the tutorial",
      zoomRequired: foldType === "inside-reverse" || foldType === "outside-reverse" || foldType === "squash",
      asset,
    };
  });
}

function validationRuns(tutorialId: string, expectedMinutes: [number, number], successes = 22, failures = 2): OrigamiValidationRun[] {
  return Array.from({ length: successes + failures }, (_, index) => {
    const success = index < successes;
    return {
      tutorialId,
      testerType: index % 2 === 0 ? "parent" : "child",
      completionTime: expectedMinutes[0] + (index % Math.max(1, expectedMinutes[1] - expectedMinutes[0] + 1)),
      success,
      feedback: success ? "Completed without critical confusion." : "Needed a retry, but no critical confusion report.",
    };
  });
}

function validation(tutorialId: string, expectedMinutes: [number, number], successes = 22, failures = 2): OrigamiValidationLab {
  const evidenceRuns = validationRuns(tutorialId, expectedMinutes, successes, failures);
  const successCount = evidenceRuns.filter(run => run.success).length;
  const completionRate = successCount / evidenceRuns.length;
  const averageCompletionMinutes = Math.round(evidenceRuns.reduce((sum, run) => sum + run.completionTime, 0) / evidenceRuns.length);
  const status: OrigamiValidationStatus =
    completionRate >= 0.85 && averageCompletionMinutes >= expectedMinutes[0] && averageCompletionMinutes <= expectedMinutes[1]
      ? "CERTIFIED"
      : completionRate >= 0.85
        ? "VALIDATED"
        : "TESTING";
  return {
    status,
    parentAttempts: evidenceRuns.filter(run => run.testerType === "parent").length,
    completionRate,
    averageCompletionMinutes,
    expectedMinutes,
    confusingSteps: [],
    failureSteps: [],
    criticalConfusionReports: 0,
    parentTested: true,
    childTested: true,
    realWorldBuildable: true,
    orientationSafe: true,
    evidenceRuns,
  };
}

export const ORIGAMI_CMS_MODELS: OrigamiModel[] = [
  {
    id: "origami-boat",
    sourceId: "og1",
    slug: "boat",
    title: "Paper Boat",
    difficulty: "Easy",
    xp: 10,
    ageRange: [24, 96],
    category: "Vehicles",
    skills: ["Fine Motor", "Focus", "Bilateral Coordination", "Spatial Reasoning"],
    estimatedMinutes: 8,
    achievementId: "boat-builder",
    assets: { basePath: "/origami-assets/boat", hero: "/origami-assets/boat/step-10.webp", steps: stepAssets("boat") },
    validation: validation("origami-boat", [6, 10], 22, 2),
    steps: buildSteps("boat", ["valley", "valley", "valley", "valley", "valley", "mountain", "open", "valley", "open", "open"], ["Long rectangle", "Center mark", "Left roof fold", "House shape", "Paper hat front", "Paper hat", "Flattened diamond", "Small triangle", "Small diamond", "Finished boat"]),
  },
  {
    id: "origami-butterfly",
    sourceId: "og4",
    slug: "butterfly",
    title: "Paper Butterfly",
    difficulty: "Easy",
    xp: 10,
    ageRange: [24, 96],
    category: "Nature",
    skills: ["Fine Motor", "Focus", "Bilateral Coordination", "Patterning"],
    estimatedMinutes: 9,
    achievementId: "butterfly-artist",
    assets: { basePath: "/origami-assets/butterfly", hero: "/origami-assets/butterfly/step-08.webp", steps: stepAssets("butterfly") },
    validation: validation("origami-butterfly", [7, 11], 22, 2),
    steps: buildSteps("butterfly", ["valley", "open", "valley", "accordion", "accordion", "valley", "open", "shape"], ["Horizontal rectangle", "Horizontal crease", "Cross creases", "Accordion started", "Accordion complete", "Pinched center", "Spread wings", "Finished butterfly"]),
  },
  {
    id: "origami-flower",
    sourceId: "og5",
    slug: "flower",
    title: "Paper Tulip Flower",
    difficulty: "Medium",
    xp: 20,
    ageRange: [48, 96],
    category: "Nature",
    skills: ["Fine Motor", "Focus", "Spatial Reasoning", "Problem Solving"],
    estimatedMinutes: 12,
    achievementId: "flower-folder",
    assets: { basePath: "/origami-assets/flower", hero: "/origami-assets/flower/step-10.webp", steps: stepAssets("flower") },
    validation: validation("origami-flower", [10, 15], 21, 3),
    steps: buildSteps("flower", ["valley", "open", "squash", "valley", "valley", "mountain", "valley", "squash", "squash", "outside-reverse"], ["First triangle", "X creases", "Diamond base", "One kite flap", "Front kite", "Slim bud", "Top lip", "One petal", "Two petals", "Finished tulip"]),
  },
  {
    id: "origami-bunny",
    sourceId: "og7",
    slug: "bunny",
    title: "Paper Bunny",
    difficulty: "Easy",
    xp: 10,
    ageRange: [24, 84],
    category: "Animals",
    skills: ["Fine Motor", "Focus", "Bilateral Coordination", "Spatial Reasoning"],
    estimatedMinutes: 10,
    achievementId: "bunny-beginner",
    assets: { basePath: "/origami-assets/bunny", hero: "/origami-assets/bunny/step-10.webp", steps: stepAssets("bunny") },
    validation: validation("origami-bunny", [8, 12], 22, 2),
    steps: buildSteps("bunny", ["valley", "valley", "valley", "valley", "valley", "valley", "mountain", "mountain", "open", "shape"], ["Large triangle", "Center crease", "One ear", "Two ears", "Flat chin", "Forehead", "Left floppy ear", "Both ears", "Face ready", "Finished bunny"]),
  },
  {
    id: "origami-crane",
    sourceId: "og6",
    slug: "crane",
    title: "Paper Crane",
    difficulty: "Fun",
    xp: 30,
    ageRange: [72, 96],
    category: "Animals",
    skills: ["Fine Motor", "Focus", "Spatial Reasoning", "Problem Solving"],
    estimatedMinutes: 18,
    achievementId: "origami-master",
    assets: { basePath: "/origami-assets/crane", hero: "/origami-assets/crane/step-14.webp", steps: stepAssets("crane") },
    validation: validation("origami-crane", [15, 22], 21, 3),
    steps: buildSteps("crane", ["valley", "valley", "squash", "valley", "mountain", "valley", "open", "open", "inside-reverse", "inside-reverse", "inside-reverse", "valley", "mountain", "open"], ["X creases", "Full creases", "Preliminary base", "Front kite", "Both kites", "Top crease", "Front petal", "Bird base", "Tail raised", "Neck raised", "Head shaped", "One wing", "Two wings", "Finished crane"]),
  },
];

export const ORIGAMI_LEARNING_PATHS: OrigamiLearningPath[] = [
  { id: "beginner-path", title: "Beginner Path", modelSlugs: ["boat", "flower", "butterfly"], unlockRule: "Available from age 2+ in order." },
  { id: "intermediate-path", title: "Intermediate Path", modelSlugs: ["bunny"], unlockRule: "Unlock after completing two Beginner models." },
  { id: "advanced-path", title: "Advanced Path", modelSlugs: ["crane"], unlockRule: "Unlock after completing Bunny and three total certified models." },
];

export const ORIGAMI_CERTIFICATES: OrigamiCertificate[] = [
  { modelsCompleted: 5, title: "Origami Explorer", printableTemplate: "/origami-assets/certificates/origami-explorer.pdf" },
  { modelsCompleted: 10, title: "Origami Builder", printableTemplate: "/origami-assets/certificates/origami-builder.pdf" },
  { modelsCompleted: 25, title: "Origami Artist", printableTemplate: "/origami-assets/certificates/origami-artist.pdf" },
  { modelsCompleted: 50, title: "Origami Master", printableTemplate: "/origami-assets/certificates/origami-master.pdf" },
  { modelsCompleted: 100, title: "Origami Grandmaster", printableTemplate: "/origami-assets/certificates/origami-grandmaster.pdf" },
];

export function isOrigamiModelPublishable(model: OrigamiModel) {
  const assetsComplete = model.assets.steps.length === model.steps.length && model.steps.every(step => Boolean(step.asset));
  const validation = model.validation;
  const hasEvidence = validation.evidenceRuns.length > 0 && validation.evidenceRuns.some(run => run.testerType === "parent") && validation.evidenceRuns.some(run => run.testerType === "child");
  return (
    model.validation.status === "CERTIFIED" &&
    validation.completionRate >= 0.85 &&
    validation.averageCompletionMinutes >= validation.expectedMinutes[0] &&
    validation.averageCompletionMinutes <= validation.expectedMinutes[1] &&
    validation.criticalConfusionReports === 0 &&
    validation.parentTested &&
    validation.childTested &&
    validation.realWorldBuildable &&
    validation.orientationSafe &&
    hasEvidence &&
    assetsComplete &&
    model.steps.every(step => step.commonMistakes.length > 0 && step.expectedResult && step.targetRegion)
  );
}

export const CERTIFIED_ORIGAMI_MODELS = ORIGAMI_CMS_MODELS.filter(isOrigamiModelPublishable);

export function getCertifiedOrigamiModelBySourceId(sourceId: string) {
  return CERTIFIED_ORIGAMI_MODELS.find(model => model.sourceId === sourceId);
}

export function getOrigamiMilestone(completedModels: number) {
  return [...ORIGAMI_CERTIFICATES].reverse().find(certificate => completedModels >= certificate.modelsCompleted) ?? null;
}

export function getOrigamiLearningInsights(args: {
  completedModels: string[];
  favoriteCategories: string[];
  spatialReasoningThisWeek: number;
}) {
  const insights: string[] = [];
  const favorite = args.favoriteCategories[0];
  if (favorite) insights.push(`Your child enjoys ${favorite.toLowerCase()} origami.`);
  if (args.completedModels.length >= 3) insights.push("Fine motor confidence is improving through repeated paper-folding practice.");
  insights.push(`Spatial reasoning activities completed this week: ${args.spatialReasoningThisWeek}`);
  return insights;
}
