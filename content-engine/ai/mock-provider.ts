import type { GeneratedScriptPayload } from "../types/content-package.js";
import { ContentEngineError } from "./errors.js";
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIHealthStatus,
  AIProvider,
} from "./provider.js";

export interface MockProviderOptions {
  /** Force generate() to throw (for retry/fallback tests). */
  failTimes?: number;
  /** Inject unsafe text once for moderation tests. */
  injectUnsafeOnce?: boolean;
  latencyMs?: number;
}

/**
 * Deterministic, offline AI provider for tests and local generation.
 * Produces valid structured JSON from request metadata / prompts.
 */
export class MockProvider implements AIProvider {
  readonly id = "mock";
  private failuresRemaining: number;
  private injectUnsafeOnce: boolean;
  private readonly latencyMs: number;

  constructor(options: MockProviderOptions = {}) {
    this.failuresRemaining = options.failTimes ?? 0;
    this.injectUnsafeOnce = options.injectUnsafeOnce ?? false;
    this.latencyMs = options.latencyMs ?? 1;
  }

  supportsStreaming(): boolean {
    return false;
  }

  supportsImages(): boolean {
    return false;
  }

  supportsJSON(): boolean {
    return true;
  }

  async health(): Promise<AIHealthStatus> {
    return {
      ok: true,
      message: "MockProvider ready",
      checkedAt: new Date().toISOString(),
    };
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    const started = Date.now();
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new ContentEngineError(
        "PROVIDER_UNAVAILABLE",
        "MockProvider forced failure",
        { recoverable: true },
      );
    }

    const title = request.metadata?.title ?? extractField(request.userPrompt, "title") ?? "Parenting Tip";
    const category = request.metadata?.category ?? "Parenting";
    const ageGroup = request.metadata?.ageGroup ?? "all";
    const cta =
      request.metadata?.cta ??
      "Try AmyNest AI free — calmer routines start today";
    const language = request.metadata?.language ?? "en";
    const duration = Number(request.metadata?.duration ?? "30");

    let payload = buildDeterministicPayload({
      title,
      category,
      ageGroup,
      cta,
      language,
      duration,
    });

    if (this.injectUnsafeOnce) {
      this.injectUnsafeOnce = false;
      payload = {
        ...payload,
        story: `${payload.story} This miracle cure will heal autism overnight.`,
        voiceScript: `${payload.voiceScript} Guarantee medical results instantly.`,
      };
    }

    if (request.responseFormat === "text") {
      return {
        text: payload.voiceScript,
        provider: this.id,
        model: "mock-v1",
        usage: estimateUsage(payload.voiceScript),
        latencyMs: Math.max(this.latencyMs, Date.now() - started),
      };
    }

    const text = JSON.stringify(payload);
    return {
      text,
      provider: this.id,
      model: "mock-v1",
      usage: estimateUsage(text),
      latencyMs: Math.max(this.latencyMs, Date.now() - started),
      raw: payload,
    };
  }
}

function extractField(prompt: string, key: string): string | undefined {
  const re = new RegExp(`${key}\\s*[:=]\\s*"([^"]+)"`, "i");
  return re.exec(prompt)?.[1];
}

function estimateUsage(text: string): AIGenerateResult["usage"] {
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  return {
    promptTokens: Math.ceil(tokens * 0.4),
    completionTokens: Math.ceil(tokens * 0.6),
    totalTokens: tokens,
  };
}

function buildDeterministicPayload(input: {
  title: string;
  category: string;
  ageGroup: string;
  cta: string;
  language: string;
  duration: number;
}): GeneratedScriptPayload {
  const hook = `Most parents don't know this: ${input.title.toLowerCase()} starts with one small change.`;
  const openingQuestion = `What if today felt a little calmer around ${input.category.toLowerCase()}?`;
  const story = `Many families want progress with ${input.title.toLowerCase()}, but busy days scatter focus. Tiny consistent steps beat perfect plans. AmyNest AI turns that into a calm daily practice parents and kids can enjoy together.`;
  const keyPoints = [
    "Start with one clear, kind cue.",
    "Keep the routine short and repeatable.",
    "Celebrate progress, not perfection.",
    "Use AmyNest to stay consistent daily.",
  ];
  const voiceScript = [
    hook,
    openingQuestion,
    "Here is a simple approach you can try tonight.",
    keyPoints[0],
    keyPoints[1],
    keyPoints[2],
    input.cta,
  ].join(" ");

  const sceneScript = [
    "SCENE 1 | warm home | parent soft smile | HOOK text on screen",
    "SCENE 2 | child + parent connection | OPENING QUESTION overlay",
    "SCENE 3 | three tip cards animate in | KEY POINTS",
    "SCENE 4 | AmyNest app UI glimpse | CTA end card",
  ].join("\n");

  const primary = `${input.title} | AmyNest AI`;
  const short = truncate(input.title, 42);
  const highCtr = `${input.title}? Try This Gentle Fix`;
  const searchOptimized = `${input.title} Tips for Parents | AmyNest`;

  return {
    hook,
    openingQuestion,
    story,
    keyPoints,
    cta: input.cta,
    voiceScript: fitDuration(voiceScript, input.duration),
    sceneScript,
    titles: {
      primary,
      alternates: [
        `${input.title} — A Calm Parent Guide`,
        `Gentle ${input.category} Tips You Can Use Today`,
        `${input.title} Without the Stress`,
        `Practical ${input.category} Advice for Busy Parents`,
        `How Families Handle ${input.title}`,
      ],
      short,
      highCtr,
      searchOptimized,
    },
    description: {
      seo: `${input.title}. Practical ${input.category.toLowerCase()} guidance for ${input.ageGroup} families. Warm, actionable tips from AmyNest AI.`,
      appPromotion:
        "AmyNest AI helps families worldwide with routines, speech practice, sleep support, and Amy Astro guidance — all in one calm parenting app.",
      playStoreCta: "Download AmyNest AI on Google Play: https://play.google.com/store/apps/details?id=com.amynest.app",
      website: "Website: https://www.amynest.in",
      socialLinks: "Follow AmyNest: Instagram @amynest | YouTube @AmyNestAI",
      disclaimer:
        "Educational parenting content only. Not medical, clinical, or diagnostic advice. Consult a qualified professional for health concerns.",
    },
    hashtags: [
      "AmyNest",
      "Parenting",
      "ParentingTips",
      "Kids",
      "MomLife",
      "DadLife",
      "GlobalParenting",
      "ToddlerLife",
      "PositiveParenting",
      "FamilyRoutine",
      "ChildDevelopment",
      "AmyAstro",
      "SpeechCoach",
      "GentleParenting",
      "Shorts",
      slugTag(input.category),
      slugTag(input.title),
      "SmartParenting",
      "KidsLearning",
      "CalmParenting",
    ],
    keywords: [
      input.title.toLowerCase(),
      input.category.toLowerCase(),
      "amynest",
      "parenting tips",
      "kids routine",
      languageKeyword(input.language),
    ],
  };
}

function languageKeyword(language: string): string {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("hi")) return "hindi parenting";
  if (normalized.includes("hinglish")) return "hinglish parenting";
  return "english parenting";
}

function slugTag(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, "");
  return cleaned.slice(0, 24) || "AmyNestTips";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function fitDuration(script: string, durationSeconds: number): string {
  const words = script.split(/\s+/).filter(Boolean);
  // ~2.5 words/sec for calm narration
  const targetWords = Math.max(28, Math.min(90, Math.round(durationSeconds * 2.5)));
  if (words.length <= targetWords) return words.join(" ");
  return words.slice(0, targetWords).join(" ");
}
