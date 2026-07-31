/**
 * A/B/C thumbnail variants — pick highest predicted CTR.
 */

import type { ContentPackage } from "../types/content-package.js";
import { generateThumbnailAssets } from "./generate.js";
import {
  assertHeadlineSafe,
  pickThumbnailPartner,
  resolveThumbnailHeadline,
} from "./headlines.js";
import { measureThumbnailMetrics, predictCtrPercent } from "./metrics.js";
import { gateThumbnailQuality } from "./quality.js";
import type {
  InteractionPose,
  ThumbnailVariantFocus,
  ThumbnailVariantId,
  ThumbnailVariantPlan,
} from "./types.js";

const VARIANT_SPECS: Array<{
  id: ThumbnailVariantId;
  focus: ThumbnailVariantFocus;
  interaction: InteractionPose;
  headlineBias?: string;
}> = [
  {
    id: "A",
    focus: "emotion-first",
    interaction: "encouraging",
  },
  {
    id: "B",
    focus: "character-first",
    interaction: "helping",
  },
  {
    id: "C",
    focus: "feature-first",
    interaction: "pointing",
  },
];

function headlineForVariant(
  content: ContentPackage,
  focus: ThumbnailVariantFocus,
  override?: string,
): string {
  if (override?.trim()) return assertHeadlineSafe(override);
  const base = resolveThumbnailHeadline(content);
  if (focus === "feature-first") {
    const hay = `${content.topic.title} ${content.hook}`.toLowerCase();
    if (/routine|habit/.test(hay)) return "Routine Magic";
    if (/read|story|book/.test(hay)) return "Reading Time";
    if (/health/.test(hay)) return "Healthy Habits";
  }
  if (focus === "emotion-first") {
    const hay = `${content.hook} ${content.title}`.toLowerCase();
    if (/speech|speak/.test(hay)) return "Speak Better";
    if (/happy|joy|smile|proud/.test(hay)) return "Happy Reading";
  }
  return assertHeadlineSafe(base);
}

export function generateThumbnailVariants(input: {
  contentPackage: ContentPackage;
  outputDir: string;
  headlineOverride?: string;
}): ThumbnailVariantPlan[] {
  const partner = pickThumbnailPartner(input.contentPackage);
  const variants: ThumbnailVariantPlan[] = [];

  for (const spec of VARIANT_SPECS) {
    const headline = headlineForVariant(
      input.contentPackage,
      spec.focus,
      input.headlineOverride,
    );
    const assets = generateThumbnailAssets({
      outputDir: input.outputDir,
      headline,
      partner,
      basename: `variant-${spec.id}`,
      focus: spec.focus,
      interaction: spec.interaction,
    });
    const metrics = measureThumbnailMetrics({
      jpgPath: assets.jpgPath,
      headline,
    });
    const quality = gateThumbnailQuality({
      jpgPath: assets.jpgPath,
      headline,
    });
    variants.push({
      id: spec.id,
      focus: spec.focus,
      headline,
      interaction: spec.interaction,
      assets,
      metrics,
      predictedCtr: predictCtrPercent(metrics),
      quality,
    });
  }

  return variants;
}

export function chooseBestVariant(
  variants: ThumbnailVariantPlan[],
): ThumbnailVariantPlan {
  if (variants.length === 0) {
    throw new Error("No thumbnail variants to choose from");
  }
  return [...variants].sort((a, b) => {
    if (b.predictedCtr !== a.predictedCtr) return b.predictedCtr - a.predictedCtr;
    return b.metrics.mobilePreview120 - a.metrics.mobilePreview120;
  })[0]!;
}

/** Re-render chosen variant as canonical thumbnail.* (discoverable by resolveThumbnail). */
export function materializeChosenVariant(input: {
  chosen: ThumbnailVariantPlan;
  outputDir: string;
  partner: "amy-girl" | "amy-boy";
}): ThumbnailVariantPlan["assets"] {
  return generateThumbnailAssets({
    outputDir: input.outputDir,
    headline: input.chosen.headline,
    partner: input.partner,
    basename: "thumbnail",
    focus: input.chosen.focus,
    interaction: input.chosen.interaction,
  });
}
