/**
 * AmyNest Philosophy — Company DNA
 *
 * Visual systems are frozen. This module is the permanent voice contract.
 * Every feature, notification, premium surface, and memory must satisfy
 * these principles or it does not ship.
 *
 * Emotional states allowed in product language (only four):
 *   Notice · Guide · Remember · Support
 *
 * Forbidden product emotions:
 *   score · judge · push · artificial celebrate · FOMO · urgency · guilt
 *
 * Question Tax Law (Founder absolute):
 *   Every additional question is a tax.
 *   Every tap must earn its existence.
 *   Infer safely → never ask.
 *   If must ask → immediately show why the answer mattered.
 *   Parents leave smarter after every answer — never more tired.
 *
 * Manufacturing Law — Six Reviews (Founder absolute):
 *   Founder · Parent · Apple Craft · Engineering · Database · Growth
 *   All six must PASS or the feature is not COMPLETE.
 *
 * Reuse Before Rewrite (Founder absolute):
 *   If it exists in the codebase — discover, reuse, or refactor.
 *   New implementation only when architecture cannot support the use case.
 *
 * Today Home Law (Founder absolute):
 *   If the parent has to decide what to do next, Today Home has failed.
 *   If Today Home has to decide what to do next, AmyNest has succeeded.
 *
 * Today Home ↔ Parent Hub Boundary (Founder absolute):
 *   If the answer can be completed today, it belongs to Today Home.
 *   If the answer changes how the parent thinks, it belongs to Parent Hub.
 *   Never confuse action with understanding.
 */

/** The Five Immutable Principles of AmyNest */
export const AMYNEST_PRINCIPLES = [
  {
    id: "understand",
    belief: "We help parents know the next right thing — never more than they need.",
  },
  {
    id: "trust-first",
    belief: "Trust precedes every request. Value before account, permission, or premium.",
  },
  {
    id: "remember-kindly",
    belief: "We remember only what parents shared, completed, or saved — never surveillance.",
  },
  {
    id: "life-continues",
    belief: "Returns continue life. Never restart, interrupt, or demand attention.",
  },
  {
    id: "calm-companionship",
    belief: "AmyNest supports exhausted parents with relief and restraint — never pressure.",
  },
] as const;

export type AmyNestPrincipleId = (typeof AMYNEST_PRINCIPLES)[number]["id"];

export type AmyNestEmotionalState = "notice" | "guide" | "remember" | "support";

/** Patterns that contradict AmyNest voice — for audits and tests. */
export const FORBIDDEN_VOICE_PATTERNS: RegExp[] = [
  /\bunlock\b/i,
  /\bbuy now\b/i,
  /\blimited time\b/i,
  /\bending soon\b/i,
  /\bdon't miss\b/i,
  /\bmiss you\b/i,
  /\bwe've missed you\b/i,
  /\bprotect your .{0,20}streak\b/i,
  /\byou missed yesterday\b/i,
  /\bkeep going!\b/i,
  /\bbonus stars\b/i,
  /\bi'?ve been thinking about\b/i,
  /\bspecially for you\b/i,
  /\bjoin thousands\b/i,
  /\bone step away\b/i,
  /\bact now\b/i,
];

export function violatesAmyNestVoice(text: string): boolean {
  return FORBIDDEN_VOICE_PATTERNS.some((re) => re.test(text));
}

/** Premium voice — relief, never interruption. */
export const PREMIUM_VOICE = {
  invitation: "We can support you further whenever you're ready.",
  continueCta: "Continue with AmyNest",
  includesLabel: "What Premium includes",
} as const;

/**
 * The Question Tax Law — Founder absolute.
 * Governs every form, discovery beat, preference, and onboarding ask.
 */
export const QUESTION_TAX_LAW = {
  id: "question-tax",
  axioms: [
    "Every additional question is a tax.",
    "Every tap must earn its existence.",
    "If the product can infer safely, never ask.",
    "If the product must ask, immediately demonstrate why the answer mattered.",
    "Parents should feel smarter after every answer, never more tired.",
  ],
} as const;

export type QuestionTaxGateInput = {
  /** True when age, context, continuity, or prior answers already suffice. */
  canInferSafely: boolean;
  /** True when this tap produces visible value — not paperwork. */
  tapEarnsExistence: boolean;
  /** True when the UI will instantly show why the answer mattered. */
  willDemonstrateWhyImmediately: boolean;
};

export type QuestionTaxGateResult = {
  allowed: boolean;
  reason: string;
};

/**
 * Gate for any new parent question.
 * If inference is safe → refuse to ask.
 * If asking → the tap must earn existence AND prove value immediately.
 */
export function mayAskParentQuestion(input: QuestionTaxGateInput): QuestionTaxGateResult {
  if (input.canInferSafely) {
    return { allowed: false, reason: "Infer safely — never ask." };
  }
  if (!input.tapEarnsExistence) {
    return { allowed: false, reason: "Tap does not earn its existence." };
  }
  if (!input.willDemonstrateWhyImmediately) {
    return {
      allowed: false,
      reason: "Must immediately demonstrate why the answer mattered.",
    };
  }
  return {
    allowed: true,
    reason: "Ask once — then prove the answer mattered.",
  };
}

/** After an answer: did the parent leave smarter, not more tired? */
export function answerLeftParentSmarter(opts: {
  demonstratedWhy: boolean;
  addedCognitiveLoadWithoutValue: boolean;
}): boolean {
  if (opts.addedCognitiveLoadWithoutValue) return false;
  return opts.demonstratedWhy;
}

/**
 * Manufacturing Law — Six Reviews.
 * A feature is COMPLETE only if every review passes.
 */
export const MANUFACTURING_SIX_REVIEWS = [
  {
    id: "founder",
    name: "Founder Review",
    proves: "Mission fit, emotional truth, AmyNest-only craft, freeze obedience.",
  },
  {
    id: "parent",
    name: "Parent Review",
    proves: "Tired parent feels lighter, smarter, more confident — never more tired.",
  },
  {
    id: "apple-craft",
    name: "Apple Craft Review",
    proves: "Proportion, restraint, materials, motion, photography — no SaaS/HTML feeling.",
  },
  {
    id: "engineering",
    name: "Engineering Review",
    proves: "Build/tests, no regressions, flags, accessibility, offline, deep links.",
  },
  {
    id: "database",
    name: "Database Review",
    proves: "Schema reuse, justified migrations, ownership/FKs/indexes, existing users safe.",
  },
  {
    id: "growth",
    name: "Growth Review",
    proves: "Conversion/activation/retention/trust hold or improve — analytics intact.",
  },
] as const;

export type ManufacturingReviewId = (typeof MANUFACTURING_SIX_REVIEWS)[number]["id"];

export const MANUFACTURING_AUTO_FAIL = [
  "Beautiful but unstable",
  "Technically perfect but emotionally weak",
  "Good UX but poor conversion",
  "Good conversion but broken trust",
] as const;

export type ManufacturingReviewVerdict = Record<ManufacturingReviewId, boolean>;

/** COMPLETE only when all six reviews are true. Partial credit does not ship. */
export function isManufacturingComplete(verdicts: ManufacturingReviewVerdict): boolean {
  return MANUFACTURING_SIX_REVIEWS.every((review) => verdicts[review.id] === true);
}

/**
 * Reuse Before Rewrite — Founder absolute.
 * Discover existing capability first. Greenfield only when architecture cannot support the use case.
 */
export const REUSE_BEFORE_REWRITE_LAW = {
  id: "reuse-before-rewrite",
  axioms: [
    "If functionality already exists in the codebase, discover it first.",
    "Reuse or safely refactor what exists.",
    "Create a new implementation only when existing architecture cannot support the use case.",
  ],
} as const;

export type ReuseBeforeRewriteInput = {
  /** True after searching the codebase for an existing capability. */
  existingCapabilityDiscovered: boolean;
  /** True when an existing module/API/schema/UI can be reused or safely extended. */
  existingArchitectureSupportsUseCase: boolean;
};

export type ReuseBeforeRewriteResult = {
  allowedNewImplementation: boolean;
  action: "reuse-or-refactor" | "create-new" | "discover-first";
  reason: string;
};

/** Gate before writing a parallel implementation. */
export function mayCreateNewImplementation(
  input: ReuseBeforeRewriteInput,
): ReuseBeforeRewriteResult {
  if (!input.existingCapabilityDiscovered) {
    return {
      allowedNewImplementation: false,
      action: "discover-first",
      reason: "Discover existing functionality in the codebase before building new.",
    };
  }
  if (input.existingArchitectureSupportsUseCase) {
    return {
      allowedNewImplementation: false,
      action: "reuse-or-refactor",
      reason: "Reuse or safely refactor the existing implementation.",
    };
  }
  return {
    allowedNewImplementation: true,
    action: "create-new",
    reason: "Existing architecture cannot support the use case — new implementation justified.",
  };
}

/**
 * Today Home Law — Founder absolute.
 * Home succeeds only when the product decides the next right thing.
 */
export const TODAY_HOME_LAW = {
  id: "today-home",
  axioms: [
    "If the parent has to decide what to do next, Today Home has failed.",
    "If Today Home has to decide what to do next, AmyNest has succeeded.",
  ],
} as const;

export type TodayHomeLawInput = {
  /** True when the parent must choose among competing next actions. */
  parentMustDecideWhatToDoNext: boolean;
  /** True when Home names one clear next right thing for this child today. */
  productDecidesWhatToDoNext: boolean;
};

export type TodayHomeLawResult = {
  passed: boolean;
  reason: string;
};

/**
 * Gate for Today Home composition.
 * Competing choices for the parent = FAIL.
 * One product-decided next right thing = PASS.
 */
export function passesTodayHomeLaw(input: TodayHomeLawInput): TodayHomeLawResult {
  if (input.parentMustDecideWhatToDoNext) {
    return {
      passed: false,
      reason: "If the parent has to decide what to do next, Today Home has failed.",
    };
  }
  if (!input.productDecidesWhatToDoNext) {
    return {
      passed: false,
      reason: "Today Home must decide the next right thing — silence is failure.",
    };
  }
  return {
    passed: true,
    reason: "If Today Home has to decide what to do next, AmyNest has succeeded.",
  };
}

/**
 * Today Home ↔ Parent Hub Boundary — Founder absolute.
 * Action completes today → Home. Understanding changes thinking → Hub.
 */
export const TODAY_HOME_HUB_BOUNDARY_LAW = {
  id: "today-home-hub-boundary",
  axioms: [
    "If the answer can be completed today, it belongs to Today Home.",
    "If the answer changes how the parent thinks, it belongs to Parent Hub.",
    "Never confuse action with understanding.",
  ],
} as const;

export type HomeHubBoundaryInput = {
  /** True when the parent can finish the answer as an action today. */
  answerCanBeCompletedToday: boolean;
  /** True when the value is a change in how the parent thinks / sees the child. */
  answerChangesHowParentThinks: boolean;
};

export type HomeHubBoundaryResult = {
  surface: "today-home" | "parent-hub" | "ambiguous" | "neither";
  reason: string;
};

/**
 * Gate before placing a capability on Home or Hub.
 * Action ≠ understanding. Dual claims without split = ambiguous FAIL.
 */
export function resolveHomeHubBoundary(
  input: HomeHubBoundaryInput,
): HomeHubBoundaryResult {
  if (input.answerCanBeCompletedToday && input.answerChangesHowParentThinks) {
    return {
      surface: "ambiguous",
      reason:
        "Never confuse action with understanding — split action onto Today Home and understanding onto Parent Hub.",
    };
  }
  if (input.answerCanBeCompletedToday) {
    return {
      surface: "today-home",
      reason: "If the answer can be completed today, it belongs to Today Home.",
    };
  }
  if (input.answerChangesHowParentThinks) {
    return {
      surface: "parent-hub",
      reason: "If the answer changes how the parent thinks, it belongs to Parent Hub.",
    };
  }
  return {
    surface: "neither",
    reason: "Neither completable today nor a change in thinking — do not force onto Home or Hub.",
  };
}

/** Notification litmus — every push must make a tired parent feel lighter. */
export function notificationFeelsLighter(body: string): boolean {
  if (!body.trim()) return false;
  if (violatesAmyNestVoice(body)) return false;
  return true;
}
