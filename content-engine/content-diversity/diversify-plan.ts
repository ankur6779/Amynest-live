/**
 * Rewrite cinematic shot plan from SCRIPT identity — never default study-desk loop.
 */

import type {
  CompositionCamera,
  CompositionShotPlan,
  CreativeCompositionPlan,
  EnvironmentId,
} from "../creative-composition/types.js";
import type { ContentPackage } from "../types/content-package.js";
import {
  AMY_POSE_LIBRARY,
  CAMERA_LIBRARY,
  FEATURE_PROPS,
  SCENE_LIBRARY,
  pickBySeed,
  pickUniqueBySeed,
} from "./scene-library.js";
import { detectTopicBucket, scriptSeed } from "./topic.js";
import type { AmyPoseId, DiversityTopicBucket } from "./types.js";

const POSE_LINE: Record<AmyPoseId, string> = {
  sitting: "sits naturally at child height",
  kneeling: "kneels beside the child at eye level",
  walking: "walks gently into frame beside the child",
  pointing: "points softly toward the learning cue",
  celebrating: "celebrates with a small joyful bounce",
  reading: "leans in to read together",
  "floating-beside": "floats softly beside the child as a mentor",
  drawing: "draws/guides with a gentle hand gesture",
  "high-five": "offers a warm high-five",
  helping: "helps with an open-palm supportive gesture",
  encouraging: "encourages with a soft nod and smile",
  listening: "listens quietly with attentive eyes",
  watching: "watches silently with warm pride",
  interacting: "interacts naturally in the shared activity",
};

const ROLE_CAMERA_PREFS: Record<string, CompositionCamera[]> = {
  hook: ["close-up", "hand-close-up", "wide", "child-pov", "reaction", "top-down"],
  "amy-host": ["tracking", "medium", "walking-follow", "eye-level", "push-in", "low-angle"],
  "amy-girl-learn": [
    "over-shoulder",
    "medium",
    "hand-close-up",
    "amy-pov",
    "top-down",
    "eye-level",
  ],
  "amy-boy-celebrate": [
    "orbit-soft",
    "wide",
    "reaction",
    "pull-out",
    "low-angle",
    "tracking",
  ],
  cta: ["dolly", "push-in", "medium", "eye-level"],
};

export interface DiversifiedPlanExtras {
  topicBucket: DiversityTopicBucket;
  locations: EnvironmentId[];
  cameras: CompositionCamera[];
  amyPoses: AmyPoseId[];
  featureProps: string[];
}

export function diversifyCompositionPlan(
  content: ContentPackage,
  plan: CreativeCompositionPlan,
  avoidLocations: string[] = [],
): { plan: CreativeCompositionPlan; extras: DiversifiedPlanExtras } {
  const bucket = detectTopicBucket(content);
  const seed = scriptSeed(content);
  const library = SCENE_LIBRARY[bucket] ?? SCENE_LIBRARY.parenting;
  const preferred = library.filter((l) => !avoidLocations.includes(l));
  const pool = preferred.length >= 3 ? preferred : library;

  const livingShots = plan.shots.filter((s) => s.role !== "cta");
  const locations = pickUniqueBySeed(pool, seed, livingShots.length, "loc");
  const featureProps = pickUniqueBySeed(
    FEATURE_PROPS[bucket] ?? FEATURE_PROPS.learning,
    seed,
    3,
    "props",
  );
  const amyPoses: AmyPoseId[] = [];
  const cameras: CompositionCamera[] = [];

  const shots = plan.shots.map((shot, index) => {
    if (shot.role === "cta") {
      cameras.push(shot.camera);
      return {
        ...shot,
        environment: "cta-stage" as EnvironmentId,
        camera: pickBySeed(
          ROLE_CAMERA_PREFS.cta ?? CAMERA_LIBRARY,
          seed,
          "cam-cta",
        ),
        performance: rewritePerformance(shot, {
          pose: "encouraging",
          prop: "none",
          bucket,
          avoidTablet: true,
        }),
        notes: `${shot.notes} | diversity:cta-stage`,
        interaction:
          "Same mentor from this unique story world — warm invite, never hard sell",
      };
    }

    const env = locations[index] ?? pickBySeed(pool, seed, `loc-${index}`);
    const camPool = ROLE_CAMERA_PREFS[shot.role] ?? CAMERA_LIBRARY;
    const camera = pickBySeed(camPool, seed, `cam-${shot.id}`);
    const pose = pickBySeed(AMY_POSE_LIBRARY, seed, `pose-${shot.id}`);
    const prop =
      featureProps[index % featureProps.length] ?? featureProps[0] ?? "lesson cue";
    amyPoses.push(pose);
    cameras.push(camera);

    return {
      ...shot,
      environment: env,
      camera,
      performance: rewritePerformance(shot, {
        pose,
        prop,
        bucket,
        avoidTablet: !shouldAllowDeviceUi(bucket, shot.role),
      }),
      interaction: rewriteInteraction(shot, env, pose, prop),
      notes: `${shot.notes} | diversity:loc=${env};cam=${camera};pose=${pose};prop=${prop}`,
      emotionBeat: shot.emotionBeat,
    } satisfies CompositionShotPlan;
  });

  return {
    plan: {
      ...plan,
      shots,
      rulesApplied: [
        ...plan.rulesApplied,
        "content-diversity-script-locations",
        "content-diversity-camera-rotation",
        "content-diversity-amy-poses",
        "content-diversity-feature-props",
        `content-diversity-bucket:${bucket}`,
      ],
    },
    extras: {
      topicBucket: bucket,
      locations: shots.map((s) => s.environment),
      cameras,
      amyPoses,
      featureProps,
    },
  };
}

function shouldAllowDeviceUi(
  bucket: DiversityTopicBucket,
  role: CompositionShotPlan["role"],
): boolean {
  if (role !== "amy-girl-learn" && role !== "amy-host") return false;
  // Only learning/phonics/speech may briefly show device UI — never for health/astro/games by default.
  return bucket === "learning" || bucket === "phonics" || bucket === "speech";
}

function rewritePerformance(
  shot: CompositionShotPlan,
  opts: {
    pose: AmyPoseId;
    prop: string;
    bucket: DiversityTopicBucket;
    avoidTablet: boolean;
  },
): string {
  const poseLine = POSE_LINE[opts.pose];
  const propLine =
    opts.prop === "none"
      ? "no product UI chrome"
      : `real feature prop in scene: ${opts.prop}`;
  const noTablet = opts.avoidTablet
    ? "Do NOT default to a Study Zone tablet UI — show the script feature prop instead."
    : "If a device appears, keep UI on-device ≤2s and relevant to this feature only.";

  if (shot.character === "amy-ai") {
    return [
      `${poseLine} as a warm mentor inside this unique ${opts.bucket} world`,
      propLine,
      "natural blinks, micro-motion, mentor smile — never announcer sticker",
      noTablet,
      shot.performance.replace(/tablet|Study Zone/gi, opts.prop === "none" ? "cue" : opts.prop),
    ].join("; ");
  }

  if (shot.character === "amy-girl") {
    return [
      `Amy Girl ${opts.pose === "listening" ? "listens and learns" : "engages"} with ${opts.prop}`,
      "real-child micro-acting: blinks, small breath, genuine eyes",
      noTablet,
      shot.performance
        .replace(/tablet showing[^,]*/gi, opts.prop)
        .replace(/Study Zone[^,]*/gi, opts.prop),
    ].join("; ");
  }

  return [
    `Amy Boy celebrates discovery with ${opts.prop} energy`,
    "living playful child motion — jump, smile, share the win",
    shot.performance,
  ].join("; ");
}

function rewriteInteraction(
  shot: CompositionShotPlan,
  env: EnvironmentId,
  pose: AmyPoseId,
  prop: string,
): string {
  return [
    `In ${env.replace(/-/g, " ")}`,
    `Amy ${pose.replace(/-/g, " ")}`,
    `around ${prop}`,
    shot.interaction ?? "natural relationship blocking",
  ].join(" — ");
}
