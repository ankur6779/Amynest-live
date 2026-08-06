import { createHash } from "node:crypto";
import type { CreativeCompositionPlan } from "../creative-composition/types.js";
import type { ContentPackage } from "../types/content-package.js";
import type { DiversifiedPlanExtras } from "./diversify-plan.js";
import type { DiversityFingerprint, DiversityMetadataPlan } from "./types.js";

export function buildDiversityFingerprint(input: {
  content: ContentPackage;
  plan: CreativeCompositionPlan;
  extras: DiversifiedPlanExtras;
  metadata: DiversityMetadataPlan;
  goldenScriptId?: string;
  videoId?: string;
}): DiversityFingerprint {
  const id = createHash("sha256")
    .update(
      [
        input.content.topic.id,
        input.content.title,
        input.extras.locations.join(","),
        input.extras.cameras.join(","),
        input.metadata.title,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    id: `div_${id}`,
    goldenScriptId: input.goldenScriptId,
    videoId: input.videoId,
    createdAt: new Date().toISOString(),
    topicBucket: input.extras.topicBucket,
    locations: input.extras.locations,
    cameras: input.extras.cameras,
    amyPoses: input.extras.amyPoses,
    featureProps: input.extras.featureProps,
    title: input.metadata.title,
    descriptionSeed: input.metadata.description.slice(0, 280),
    hashtags: input.metadata.hashtags,
    playlist: input.metadata.playlistName,
    thumbnailHero: input.metadata.thumbnailHero,
    ctaWording: input.metadata.ctaWording,
  };
}
