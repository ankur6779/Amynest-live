/**
 * Prompt optimizer — turn winning DNA into future prompt priorities.
 */

import type {
  CameraStyleDna,
  CorrelationInsight,
  CtaVariant,
  HookStyle,
  KnowledgeEntry,
  MusicStyle,
  PromptOptimizationHints,
} from "../types.js";

export function buildPromptOptimizationHints(input: {
  correlations: CorrelationInsight[];
  knowledge: KnowledgeEntry[];
}): PromptOptimizationHints {
  const preferHookStyles = pickStyles(
    input,
    "hookStyle",
    "winning-hook",
    ["emotional", "question", "story", "educational", "bold-claim"] as HookStyle[],
  );
  const preferEmotions = unique([
    ...winnersFor(input.correlations, "emotion"),
    ...input.knowledge
      .filter((k) => k.kind === "winning-emotion")
      .slice(0, 5)
      .map((k) => k.value),
  ]);
  const preferCtaVariants = pickStyles(
    input,
    "ctaVariant",
    "winning-cta",
    ["soft", "habit", "direct", "app-demo"] as CtaVariant[],
  );
  const preferDurations = winnersFor(input.correlations, "duration")
    .map((v) => Number(String(v).replace(/s$/i, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 3);
  const preferPublishHours = winnersFor(input.correlations, "publishHour")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .slice(0, 3);
  const preferMusicStyles = pickStyles(
    input,
    "musicStyle",
    "winning-music",
    ["warm-ambient", "uplifting", "calm-piano", "playful", "cosmic-soft"] as MusicStyle[],
  );
  const preferCameraStyles = pickStyles(
    input,
    "cameraStyle",
    "winning-camera",
    ["push-in", "hold", "orbit", "pull-out", "static", "mixed"] as CameraStyleDna[],
  );
  const preferCharacters = unique(
    winnersFor(input.correlations, "characters").flatMap((c) => c.split("+")),
  );

  const priorityBoosts: PromptOptimizationHints["priorityBoosts"] = [];
  for (const corr of input.correlations.slice(0, 8)) {
    priorityBoosts.push({
      pattern: `${corr.dimension}:${corr.winner}`,
      boost: Math.min(20, Math.round(corr.lift)),
      reason: corr.rationale,
    });
  }

  const systemPromptAddendum = [
    "CONTINUOUS LEARNING — apply proven audience patterns:",
    preferHookStyles[0]
      ? `- Prefer ${preferHookStyles[0]} hooks (evidence-backed).`
      : "- Keep emotion-first hooks.",
    preferEmotions[0]
      ? `- Lead with ${preferEmotions[0]} emotional tone.`
      : "- Keep warm hopeful tone.",
    preferDurations[0]
      ? `- Target ~${preferDurations[0]}s when story allows.`
      : "- Prefer concise Shorts pacing.",
    preferCtaVariants[0]
      ? `- Use ${preferCtaVariants[0]} CTA style after hope.`
      : "- Soft CTA after hope.",
    preferPublishHours[0] != null
      ? `- Prefer publish around ${String(preferPublishHours[0]).padStart(2, "0")}:00 UTC when scheduling.`
      : "- Respect editorial calendar publish slots.",
    "- Never invent features; keep AmyNest brand locks.",
  ].join("\n");

  return {
    preferHookStyles: preferHookStyles.length
      ? preferHookStyles
      : (["emotional", "question"] as HookStyle[]),
    preferEmotions: preferEmotions.length ? preferEmotions : ["Hope", "Calm"],
    preferCtaVariants: preferCtaVariants.length
      ? preferCtaVariants
      : (["soft", "habit"] as CtaVariant[]),
    preferDurations: preferDurations.length ? preferDurations : [20, 22, 30],
    preferPublishHours: preferPublishHours.length ? preferPublishHours : [12, 18],
    preferMusicStyles: preferMusicStyles.length
      ? preferMusicStyles
      : (["warm-ambient"] as MusicStyle[]),
    preferCameraStyles: preferCameraStyles.length
      ? preferCameraStyles
      : (["push-in", "hold"] as CameraStyleDna[]),
    preferCharacters: preferCharacters.length ? preferCharacters : ["Amy AI"],
    systemPromptAddendum,
    priorityBoosts,
  };
}

function winnersFor(
  correlations: CorrelationInsight[],
  dimension: CorrelationInsight["dimension"],
): string[] {
  return correlations
    .filter((c) => c.dimension === dimension)
    .map((c) => c.winner);
}

function pickStyles<T extends string>(
  input: { correlations: CorrelationInsight[]; knowledge: KnowledgeEntry[] },
  dimension: CorrelationInsight["dimension"],
  knowledgeKind: KnowledgeEntry["kind"],
  allowed: T[],
): T[] {
  const fromCorr = winnersFor(input.correlations, dimension).filter((v): v is T =>
    (allowed as string[]).includes(v),
  );
  const fromKb = input.knowledge
    .filter((k) => k.kind === knowledgeKind)
    .map((k) => k.value)
    .filter((v): v is T => (allowed as string[]).includes(v));
  return unique([...fromCorr, ...fromKb]).slice(0, 4) as T[];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
