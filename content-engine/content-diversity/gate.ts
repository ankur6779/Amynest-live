/**
 * Content Diversity gate — mandatory before publish.
 * Reject if similarity to recent 10 > 40% or diversity score < 90.
 */

import type {
  CompositionCamera,
  CreativeCompositionPlan,
  EnvironmentId,
} from "../creative-composition/types.js";
import type { ContentPackage } from "../types/content-package.js";
import {
  diversifyCompositionPlan,
  type DiversifiedPlanExtras,
} from "./diversify-plan.js";
import {
  applyDiversityMetadata,
  diversifyMetadata,
} from "./diversify-metadata.js";
import { buildDiversityFingerprint } from "./fingerprint.js";
import { writeDiversityReportFromGate } from "./report.js";
import { maxSimilarityToRecent } from "./similarity.js";
import {
  DEFAULT_DIVERSITY_STORE_PATH,
  recentFingerprints,
  rememberFingerprint,
} from "./store.js";
import { detectTopicBucket } from "./topic.js";
import type { AmyPoseId } from "./types.js";
import {
  DIVERSITY_TARGET_SCORE,
  MAX_SIMILARITY_TO_RECENT,
  type DiversityGateResult,
} from "./types.js";

export interface RunContentDiversityInput {
  content: ContentPackage;
  plan: CreativeCompositionPlan;
  goldenScriptId?: string;
  outputDir?: string;
  storePath?: string;
  /** When true, remember fingerprint after PASS (call after successful upload). */
  persistOnPass?: boolean;
}

export interface RunContentDiversityResult extends DiversityGateResult {
  plan: CreativeCompositionPlan;
  content: ContentPackage;
  extras: DiversifiedPlanExtras;
}

/** Kill-switch: AMYNEST_CONTENT_DIVERSITY=0. Default on. */
export function isContentDiversityEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_CONTENT_DIVERSITY !== "0";
}

function extrasFromPlan(
  content: ContentPackage,
  plan: CreativeCompositionPlan,
): DiversifiedPlanExtras {
  const locations = plan.shots.map((s) => s.environment);
  const cameras = plan.shots.map((s) => s.camera);
  const amyPoses = plan.shots
    .map((s) => {
      const m = /pose=([a-z-]+)/.exec(s.notes);
      return (m?.[1] ?? "") as AmyPoseId;
    })
    .filter(Boolean);
  const featureProps = plan.shots
    .map((s) => {
      const m = /prop=([^;]+)/.exec(s.notes);
      return m?.[1]?.trim() ?? "";
    })
    .filter((p) => p && p !== "none");
  return {
    topicBucket: detectTopicBucket(content),
    locations,
    cameras,
    amyPoses,
    featureProps: featureProps.length
      ? featureProps
      : diversifyMetadata(content).featureProps,
  };
}

/**
 * Score diversified plan + unique metadata against recent Shorts; write report.
 * Regenerates planning once if similarity > 40%.
 */
export function runContentDiversityGate(
  input: RunContentDiversityInput,
): RunContentDiversityResult {
  const metadata = diversifyMetadata(input.content);
  const content = applyDiversityMetadata(input.content, metadata);

  if (!isContentDiversityEnabled()) {
    const extras = extrasFromPlan(content, input.plan);
    const fingerprint = buildDiversityFingerprint({
      content,
      plan: input.plan,
      extras,
      metadata,
      goldenScriptId: input.goldenScriptId,
    });
    return {
      ok: true,
      diversityScore: 100,
      similarityToRecent: 0,
      breakdown: {
        scenes: 0,
        backgrounds: 0,
        cameras: 0,
        characterPoses: 0,
        thumbnail: 0,
        title: 0,
        description: 0,
        tags: 0,
        hashtags: 0,
        cta: 0,
        overall: 0,
      },
      fingerprint,
      metadata,
      reasons: ["Content diversity disabled (AMYNEST_CONTENT_DIVERSITY=0)"],
      plan: input.plan,
      content,
      extras,
    };
  }

  const storePath = input.storePath ?? DEFAULT_DIVERSITY_STORE_PATH;
  const recent = recentFingerprints(storePath);
  const avoidLocations = [
    ...new Set(recent.flatMap((r) => r.locations).filter((l) => l !== "cta-stage")),
  ] as EnvironmentId[];
  const avoidCameras = [
    ...new Set(recent.slice(0, 5).flatMap((r) => r.cameras)),
  ];
  const recentOpenings = recent
    .map((r) => r.locations.find((l) => l !== "cta-stage"))
    .filter(Boolean) as string[];

  let plan = input.plan;
  let extras = extrasFromPlan(content, plan);
  // Always re-plan against last 20 so we never inherit a template study-desk loop.
  {
    const d = diversifyCompositionPlan(
      content,
      input.plan,
      avoidLocations,
      avoidCameras,
    );
    plan = d.plan;
    extras = d.extras;
  }

  let fingerprint = buildDiversityFingerprint({
    content,
    plan,
    extras,
    metadata,
    goldenScriptId: input.goldenScriptId,
  });
  let sim = maxSimilarityToRecent(fingerprint, recent);

  const opening = extras.locations.find((l) => l !== "cta-stage");
  const openingReuse =
    Boolean(opening) && recentOpenings.slice(0, 10).includes(opening!);

  if (sim.similarity > MAX_SIMILARITY_TO_RECENT || openingReuse) {
    const peerLocs = recent.find((r) => r.id === sim.peerId)?.locations ?? [];
    const avoid = [
      ...avoidLocations,
      ...peerLocs,
      ...(opening ? [opening] : []),
    ] as EnvironmentId[];
    const regenerated = diversifyCompositionPlan(
      content,
      input.plan,
      avoid,
      avoidCameras,
    );
    plan = regenerated.plan;
    extras = regenerated.extras;
    // Nudge thumbnail hero uniqueness via alternateTitles salt
    const saltedMeta = diversifyMetadata({
      ...content,
      alternateTitles: [
        ...(content.alternateTitles ?? []),
        `diversity-${Date.now()}`,
      ],
    });
    Object.assign(metadata, saltedMeta);
    fingerprint = buildDiversityFingerprint({
      content: applyDiversityMetadata(input.content, metadata),
      plan,
      extras,
      metadata,
      goldenScriptId: input.goldenScriptId,
    });
    sim = maxSimilarityToRecent(fingerprint, recent);
  }

  const locationSet = new Set(extras.locations.filter((l) => l !== "cta-stage"));
  const cameraSet = new Set(extras.cameras as CompositionCamera[]);
  const poseSet = new Set(extras.amyPoses);
  // Score blends peer uniqueness with within-Short cinematic variety.
  // Pure (1 - similarity)*100 cannot hit >90 while allowing ≤40% similarity.
  const varietyScore = Math.min(
    100,
    locationSet.size * 20 +
      cameraSet.size * 15 +
      poseSet.size * 10 +
      (1 - sim.breakdown.thumbnail) * 15 +
      (1 - sim.breakdown.title) * 10,
  );
  const diversityScore = Math.max(
    0,
    Math.min(100, (1 - sim.similarity) * 55 + varietyScore * 0.45),
  );
  const reasons: string[] = [];
  if (sim.similarity > MAX_SIMILARITY_TO_RECENT) {
    reasons.push(
      `Similarity ${(sim.similarity * 100).toFixed(1)}% to recent Short (${sim.peerId ?? "n/a"}) exceeds ${MAX_SIMILARITY_TO_RECENT * 100}% — regenerate planning`,
    );
  }
  if (diversityScore < DIVERSITY_TARGET_SCORE) {
    reasons.push(
      `Diversity score ${diversityScore.toFixed(1)} < ${DIVERSITY_TARGET_SCORE}`,
    );
  }
  const finalOpening = extras.locations.find((l) => l !== "cta-stage");
  const finalOpeningReuse =
    Boolean(finalOpening) &&
    recentOpenings.slice(0, 10).includes(finalOpening!);

  if (locationSet.size < 2) {
    reasons.push("Fewer than 2 unique living locations in the plan");
  }
  if (cameraSet.size < 3) {
    reasons.push("Fewer than 3 unique camera angles");
  }
  if (finalOpeningReuse) {
    reasons.push(
      `Opening location "${finalOpening}" reused from recent productions — reject template cold open`,
    );
  }
  // Within-short: living shots must not all share one room
  const livingLocs = extras.locations.filter((l) => l !== "cta-stage");
  if (livingLocs.length >= 3 && new Set(livingLocs).size < 2) {
    reasons.push("Same room reused across living beats — template scene");
  }
  if (!reasons.some((r) => r.includes("exceeds") || r.includes("<") || r.includes("reused") || r.includes("Fewer") || r.includes("Same room"))) {
    reasons.unshift(
      "Locations, cameras, poses, and metadata cleared similarity gate vs recent 20",
    );
  }

  const hardFail =
    sim.similarity > MAX_SIMILARITY_TO_RECENT ||
    diversityScore < DIVERSITY_TARGET_SCORE ||
    locationSet.size < 2 ||
    cameraSet.size < 3 ||
    finalOpeningReuse;
  const ok = !hardFail;

  const diversifiedContent = applyDiversityMetadata(input.content, metadata);
  const result: RunContentDiversityResult = {
    ok,
    diversityScore,
    similarityToRecent: sim.similarity,
    maxSimilarityPeerId: sim.peerId,
    breakdown: sim.breakdown,
    fingerprint,
    metadata,
    reasons,
    plan,
    content: diversifiedContent,
    extras,
  };

  if (input.outputDir) {
    writeDiversityReportFromGate(
      result,
      input.outputDir,
      input.goldenScriptId,
    );
  }

  if (ok && input.persistOnPass) {
    rememberFingerprint(fingerprint, storePath);
  }

  return result;
}

export function persistDiversityFingerprint(
  fingerprint: Parameters<typeof rememberFingerprint>[0],
  storePath: string = DEFAULT_DIVERSITY_STORE_PATH,
): void {
  rememberFingerprint(fingerprint, storePath);
}
