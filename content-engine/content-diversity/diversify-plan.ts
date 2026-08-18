/**
 * Rewrite cinematic shot plan from SCRIPT identity — never default study-desk loop.
 * Planning-only. Does not change providers, validators, or render pipeline.
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
  CONVERSATION_COVERAGE,
  FEATURE_PROPS,
  SCENE_LIBRARY,
  pickBySeed,
  pickUniqueBySeed,
} from "./scene-library.js";
import { detectTopicBucket, scriptSeed } from "./topic.js";
import type { AmyPoseId, DiversityTopicBucket } from "./types.js";

/**
 * Uneven 4|6 rhythm (Veo/KIE hard constraint).
 * Production Lock V4: celebrate + CTA always 6s for cinematic holds / complete endcard.
 * Pattern indices: [hook, host, learn, celebrate, cta]
 */
const RHYTHM_PATTERNS: Array<Array<4 | 6>> = [
  [4, 6, 4, 6, 6],
  [4, 4, 6, 6, 6],
  [6, 4, 4, 6, 6],
  [4, 6, 6, 6, 6],
  [6, 4, 6, 6, 6],
];

function cameraMotivationFor(
  camera: CompositionCamera,
  objective: string,
): string {
  switch (camera) {
    case "tracking":
    case "walking-follow":
      return `Camera follows because a character moves — motivated by: ${objective}`;
    case "pan-right":
    case "pan-left":
      return `Camera pans because someone points, looks, or enters — motivated by: ${objective}`;
    case "push-in":
    case "dolly":
    case "slow-zoom":
      return `Camera moves closer only as emotion/hug/invite lands — motivated by: ${objective}`;
    case "pull-out":
      return `Camera pulls out to reveal shared joy / space after the win — motivated by: ${objective}`;
    case "over-shoulder":
    case "two-shot":
    case "profile":
      return `Coverage rotates with dialogue partners — motivated by: ${objective}`;
    case "reaction":
    case "close-up":
      return `Cut/hold on reaction because a partner acts — motivated by: ${objective}`;
    case "handheld":
      return `Handheld breathes with living action — motivated by: ${objective}`;
    default:
      return `Camera serves the single objective — motivated by: ${objective}`;
  }
}

function defaultObjective(shot: CompositionShotPlan): string {
  if (shot.shotObjective) return shot.shotObjective;
  switch (shot.role) {
    case "hook":
      return shot.character === "amy-boy"
        ? "Boy searching / discovering alone"
        : "Girl searching / reading alone";
    case "amy-host":
      return "Amy teaching / guiding beside the child";
    case "amy-girl-learn":
      return "Girl discovering with Amy beside her";
    case "amy-boy-celebrate":
      return "Boy celebrating / family reacting with joy";
    case "cta":
      return "Amy inviting as companion from the story";
    default:
      return "One clear story beat";
  }
}

function defaultActionBeforeDialogue(shot: CompositionShotPlan): string {
  if (shot.actionBeforeDialogue) return shot.actionBeforeDialogue;
  if (shot.character === "amy-ai") {
    return "Walks, kneels, or sits beside the child and settles eye contact BEFORE any mouthing";
  }
  if (shot.speechMode === "speaking") {
    return "Already touching a prop, looking around, or fidgeting — THEN looks up and speaks";
  }
  return "Already engaged in a physical activity before any reaction peak or mouth motion";
}

const POSE_LINE: Record<AmyPoseId, string> = {
  sitting: "sits naturally at child height on a real chair/floor edge",
  kneeling: "kneels beside the child at eye level on the real floor",
  walking: "walks gently into frame with natural hover-steps beside the child",
  pointing: "points softly toward the learning cue with a clear hand gesture",
  celebrating: "celebrates with a small joyful bounce and open arms",
  reading: "leans in to read together over a real book or paper",
  "floating-beside": "hovers naturally beside the child like a living mentor companion",
  drawing: "guides with a gentle hand gesture toward paper or magnets",
  "high-five": "offers a warm high-five at child height",
  helping: "helps with an open-palm supportive gesture",
  encouraging: "encourages with a soft nod, blink, and smile",
  listening: "listens quietly with attentive eyes and still hands",
  watching: "watches silently with warm pride and micro-breath motion",
  interacting: "interacts naturally in the shared activity",
};

const ROLE_CAMERA_PREFS: Record<string, CompositionCamera[]> = {
  hook: [
    "wide",
    "close-up",
    "hand-close-up",
    "child-pov",
    "reaction",
    "top-down",
    "handheld",
    "high-angle",
    "profile",
  ],
  "amy-host": [
    "tracking",
    "medium",
    "walking-follow",
    "over-shoulder",
    "two-shot",
    "profile",
    "handheld",
    "wide",
    "low-angle",
  ],
  "amy-girl-learn": [
    "over-shoulder",
    "two-shot",
    "profile",
    "medium",
    "hand-close-up",
    "amy-pov",
    "reaction",
    "close-up",
    "handheld",
  ],
  "amy-boy-celebrate": [
    "orbit-soft",
    "wide",
    "reaction",
    "two-shot",
    "pull-out",
    "low-angle",
    "tracking",
    "handheld",
  ],
  cta: ["dolly", "medium", "eye-level", "low-angle", "two-shot"],
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
  avoidCameras: string[] = [],
): { plan: CreativeCompositionPlan; extras: DiversifiedPlanExtras } {
  const bucket = detectTopicBucket(content);
  const seed = scriptSeed(content);
  const library = SCENE_LIBRARY[bucket] ?? SCENE_LIBRARY.parenting;
  const preferred = library.filter((l) => !avoidLocations.includes(l));
  const pool = preferred.length >= 3 ? preferred : library;

  const livingShots = plan.shots.filter((s) => s.role !== "cta");
  const locations = pickUniqueBySeed(
    pool,
    seed,
    livingShots.length,
    "loc",
    avoidLocations as EnvironmentId[],
  );
  const featureProps = pickUniqueBySeed(
    FEATURE_PROPS[bucket] ?? FEATURE_PROPS.learning,
    seed,
    3,
    "props",
  );
  const amyPoses: AmyPoseId[] = [];
  const cameras: CompositionCamera[] = [];
  const usedCameras = new Set<string>();
  const usedPoses = new Set<string>();
  const rhythm = pickBySeed(RHYTHM_PATTERNS, seed, "rhythm");
  let livingIndex = 0;
  /** Production Lock V3: AmyNest UI max 2 appearances per Short. */
  let appUiSlots = 0;
  const MAX_APP_UI = 2;

  const shots = plan.shots.map((shot, index) => {
    const shotObjective = defaultObjective(shot);
    const actionBeforeDialogue = defaultActionBeforeDialogue(shot);
    // V4: celebrate + CTA locked to 6s for holds and complete endcard (never cut).
    const durationSeconds: 4 | 6 =
      shot.role === "cta" || shot.role === "amy-boy-celebrate"
        ? 6
        : (rhythm[index] ?? (shot.durationSeconds === 6 ? 6 : 4));
    const emotionFrom = shot.emotionFrom ?? "story continues";
    const emotionTo = shot.emotionTo ?? shot.emotionBeat ?? "warm progress";
    const emotionBeat =
      shot.emotionBeat ??
      `Emotional continuity: enter ${emotionFrom}, leave ${emotionTo} — never reset emotion`;

    if (shot.role === "cta") {
      const camera = pickBySeed(
        (ROLE_CAMERA_PREFS.cta ?? CAMERA_LIBRARY).filter(
          (c) => !avoidCameras.includes(c),
        ),
        seed,
        "cam-cta",
      );
      cameras.push(camera);
      const cameraMotivation = cameraMotivationFor(camera, shotObjective);
      return {
        ...shot,
        durationSeconds: 6,
        environment: "cta-stage" as EnvironmentId,
        camera,
        shotObjective,
        actionBeforeDialogue,
        cameraMotivation,
        emotionFrom,
        emotionTo,
        emotionBeat,
        allowAppUi: false,
        amyOnScreen: true,
        storyBeat: shot.storyBeat ?? "CTA epilogue",
        continuityBridge:
          shot.continuityBridge ??
          "EPILOGUE continuing from family smile — same Amy, never a disconnected ad scene",
        performance: rewritePerformance(shot, {
          pose: "encouraging",
          prop: "none",
          bucket,
          env: "cta-stage",
          avoidTablet: true,
          shotObjective,
          actionBeforeDialogue,
          cameraMotivation,
          emotionFrom,
          emotionTo,
          amyOnScreen: true,
        }),
        notes: `${shot.notes} | diversity:cta-stage;cam=${camera};obj=${shotObjective};emo=${emotionFrom}→${emotionTo};dur=6;production-lock-v5`,
        interaction:
          "CTA EPILOGUE: family smile energy → Amy waves → fade → logo → Download AmyNest AI → Play Store → App Store → amynest.in → HOLD → fade to black; never speak after fade begins",
      };
    }

    const env = locations[livingIndex] ?? pickBySeed(pool, seed, `loc-${index}`);
    livingIndex += 1;

    const dialogueBeat =
      shot.speechMode === "speaking" || shot.speechMode === "listening";
    const rolePrefs = ROLE_CAMERA_PREFS[shot.role] ?? CAMERA_LIBRARY;
    const coveragePool = dialogueBeat
      ? [
          ...CONVERSATION_COVERAGE.filter((c) => rolePrefs.includes(c)),
          ...rolePrefs,
        ]
      : rolePrefs;
    const camPool = coveragePool.filter(
      (c) => !usedCameras.has(c) && !avoidCameras.includes(c),
    );
    const camFallback = coveragePool.filter((c) => !usedCameras.has(c));
    let camera = pickBySeed(
      camPool.length ? camPool : camFallback.length ? camFallback : CAMERA_LIBRARY,
      seed,
      `cam-${shot.id}`,
    );
    usedCameras.add(camera);

    // Prefer lip-safe coverage when speaking — never obvious fake frontal mouthing.
    if (
      shot.speechMode === "speaking" &&
      (camera === "close-up" || camera === "eye-level")
    ) {
      camera = pickBySeed(
        (["over-shoulder", "profile", "two-shot", "medium", "reaction", "wide"] as CompositionCamera[]).filter(
          (c) => !avoidCameras.includes(c),
        ),
        seed,
        `speech-cam-${shot.id}`,
      );
      usedCameras.add(camera);
    }

    // V5: when Amy shares the frame with kids, prefer two-shot / OTS interaction coverage.
    const amyOnScreen = shot.amyOnScreen !== false && shot.role !== "hook"
      ? true
      : Boolean(shot.amyOnScreen);
    if (
      amyOnScreen &&
      shot.character !== "amy-ai" &&
      (camera === "close-up" || camera === "eye-level")
    ) {
      camera = pickBySeed(
        (["two-shot", "over-shoulder", "medium", "handheld"] as CompositionCamera[]).filter(
          (c) => !avoidCameras.includes(c),
        ),
        seed,
        `amy-presence-cam-${shot.id}`,
      );
      usedCameras.add(camera);
    }

    const posePool = AMY_POSE_LIBRARY.filter((p) => !usedPoses.has(p));
    // Prefer companion poses for Amy — never idle floating presenter energy.
    const companionPoses: AmyPoseId[] = [
      "kneeling",
      "sitting",
      "walking",
      "helping",
      "listening",
      "floating-beside",
      "encouraging",
      "interacting",
    ];
    const poseSource =
      shot.character === "amy-ai"
        ? posePool.filter((p) => companionPoses.includes(p))
        : posePool;
    const pose = pickBySeed(
      poseSource.length
        ? poseSource
        : shot.character === "amy-ai"
          ? companionPoses
          : posePool.length
            ? posePool
            : AMY_POSE_LIBRARY,
      seed,
      `pose-${shot.id}`,
    );
    usedPoses.add(pose);

    const prop =
      featureProps[index % featureProps.length] ?? featureProps[0] ?? "lesson cue";
    amyPoses.push(pose);
    cameras.push(camera);
    const cameraMotivation = cameraMotivationFor(camera, shotObjective);

    const bucketAllows = shouldAllowDeviceUi(bucket, shot.role);
    const planAllows = shot.allowAppUi === true;
    const allowAppUi =
      planAllows && bucketAllows && appUiSlots < MAX_APP_UI;
    if (allowAppUi) appUiSlots += 1;

    return {
      ...shot,
      durationSeconds,
      environment: env,
      camera,
      shotObjective,
      actionBeforeDialogue,
      cameraMotivation,
      emotionFrom,
      emotionTo,
      emotionBeat,
      allowAppUi,
      amyOnScreen,
      storyBeat: shot.storyBeat,
      continuityBridge: shot.continuityBridge,
      performance: rewritePerformance(shot, {
        pose,
        prop,
        bucket,
        env,
        avoidTablet: !allowAppUi,
        shotObjective,
        actionBeforeDialogue,
        cameraMotivation,
        emotionFrom,
        emotionTo,
        amyOnScreen,
      }),
      interaction: rewriteInteraction(shot, env, pose, prop, amyOnScreen),
      notes: `${shot.notes} | diversity:loc=${env};cam=${camera};pose=${pose};prop=${prop};obj=${shotObjective};emo=${emotionFrom}→${emotionTo};amy=${amyOnScreen ? "on" : "off"};app=${allowAppUi ? "ok" : "none"};dur=${durationSeconds};production-lock-v5`,
    } satisfies CompositionShotPlan;
  });

  // V5: stitch camera/emotion continuity bridges across the Short (orchestration only).
  const stitched = shots.map((shot, index) => {
    if (index === 0) return shot;
    const prev = shots[index - 1]!;
    const bridge = [
      shot.continuityBridge,
      `Continue from previous beat (${prev.role}): emotion "${prev.emotionTo}" → "${shot.emotionFrom}"; camera energy from ${prev.camera} into ${shot.camera} — never teleport; keep body/eye/hand logic continuous`,
    ]
      .filter(Boolean)
      .join(" | ");
    return {
      ...shot,
      continuityBridge: bridge,
      performance: `${shot.performance}; CONTINUOUS FILM BRIDGE: ${bridge}`,
    };
  });

  // Sync cameras list with final shot cameras
  const finalCameras = stitched.map((s) => s.camera);

  return {
    plan: {
      ...plan,
      totalDurationSeconds: stitched.reduce((a, s) => a + s.durationSeconds, 0),
      shots: stitched,
      rulesApplied: [
        ...plan.rulesApplied.filter((r) => !r.startsWith("content-diversity-")),
        "content-diversity-script-locations",
        "content-diversity-camera-rotation",
        "content-diversity-unique-cameras-per-short",
        "content-diversity-conversation-coverage",
        "content-diversity-amy-poses",
        "content-diversity-feature-props",
        "content-diversity-no-template-room",
        "content-diversity-story-drives-visuals",
        "content-diversity-shot-rhythm-4-6",
        "content-diversity-cinematic-realism-v2",
        "content-diversity-production-lock-v3",
        "content-diversity-production-lock-v4",
        "content-diversity-production-lock-v5",
        "content-diversity-continuous-film-bridges",
        "content-diversity-amy-screen-presence",
        "content-diversity-emotional-continuity",
        "content-diversity-app-max-2",
        "content-diversity-celebrate-cta-6s-holds",
        `content-diversity-bucket:${bucket}`,
      ],
    },
    extras: {
      topicBucket: bucket,
      locations: stitched.map((s) => s.environment),
      cameras: finalCameras,
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
  return bucket === "learning" || bucket === "phonics" || bucket === "speech";
}

function rewritePerformance(
  shot: CompositionShotPlan,
  opts: {
    pose: AmyPoseId;
    prop: string;
    bucket: DiversityTopicBucket;
    env: EnvironmentId;
    avoidTablet: boolean;
    shotObjective: string;
    actionBeforeDialogue: string;
    cameraMotivation: string;
    emotionFrom: string;
    emotionTo: string;
    amyOnScreen?: boolean;
  },
): string {
  const poseLine = POSE_LINE[opts.pose];
  const propLine =
    opts.prop === "none"
      ? "no product UI chrome — story first"
      : `story prop in this world: ${opts.prop}`;
  const noTablet = opts.avoidTablet
    ? "Do NOT show AmyNest app/tablet this beat — story first; never filler UI."
    : "AmyNest device UI allowed ONLY because it advances this beat; on-device ≤2s — never fullscreen mockup.";
  const world = opts.env.replace(/-/g, " ");
  const objective = `ONE visual objective only: ${opts.shotObjective}`;
  const actionFirst = `ACTION BEFORE DIALOGUE: ${opts.actionBeforeDialogue}`;
  const cam = `MOTIVATED CAMERA: ${opts.cameraMotivation}`;
  const emo = `EMOTIONAL CONTINUITY: enter "${opts.emotionFrom}" → leave "${opts.emotionTo}" — never reset emotion mid-story`;
  const identity =
    "CHARACTER CONSISTENCY: same face, hair, clothes, proportions as first-frame keyframe — another camera angle of the SAME character, never regenerate";
  const film =
    "ONE CONTINUOUS SHORT FILM: begin where the previous scene ended — do not reset character position, eye direction, hand position, walking direction, lighting, or emotion";
  const blocking =
    "CINEMATIC BLOCKING: walk into frame, sit, stand, turn, cross space, pick up objects, look out windows — avoid static staging";
  const amyPresence = opts.amyOnScreen
    ? "AMY ON SCREEN: Amy is the emotional lead / part of the family — actively interact (kneel, touch shoulder, look, celebrate); never leave her as a missing mascot"
    : "Amy enters next — keep eyeline ready for her arrival";

  if (shot.character === "amy-ai") {
    return [
      objective,
      actionFirst,
      cam,
      emo,
      identity,
      film,
      blocking,
      "PERMANENT AMY: the exact same Amy AI from previous scenes — lock face, eyes, smile, glow, body, clothes, accessories, expressions; never a new cute AI girl",
      `${poseLine} inside a photoreal ${world}`,
      "Amy is an ACTOR in the family — walk, sit, kneel, hug, high-five, listen, look, smile, celebrate, comfort, teach, react",
      "Amy never stands still; never faces camera like a presenter; never a floating narrator",
      "Amy is the ONLY stylized character — white soft robot body stays illustrated while the room is Disney+/Netflix family-film real",
      "dialogue naturalism: Amy listens, pauses, then speaks softly — natural silence OK",
      "CINEMATIC HOLD: after key smile/wave/gesture, breathe before cutting energy",
      propLine,
      "micro-performance every 2-3s: blink, breath, eye move, head tilt, hand gesture, weight shift, small smile",
      noTablet,
      scrubTemplateWords(shot.performance, opts.prop),
    ].join("; ");
  }

  if (shot.character === "amy-girl") {
    return [
      objective,
      actionFirst,
      cam,
      emo,
      identity,
      film,
      blocking,
      amyPresence,
      `Amy Girl in a photoreal ${world} — Disney+ family-short child, natural skin/pores/eyes/hair/clothing folds — NOT 3D cartoon, NOT plastic AI, NOT CGI`,
      `engages with ${opts.prop}`,
      "child behavior: touch objects, look around, hesitate, giggle, lose focus, get excited, sit awkwardly",
      "INTERACTION: look to Amy/parent, share prop, laugh with companion — never isolated unless story requires",
      "dialogue naturalism + silence OK: hesitate, think, smile — never robotic Q&A",
      "CINEMATIC HOLD after smile / understanding — let emotion breathe",
      "micro-performance every 2-3s: blink, breath, eye move, head tilt, hand fidget, weight shift, thinking pause",
      "If a parent appears: kneel, soft smile, touch shoulder, hug, fix hair, soft laugh, eye contact, relief",
      noTablet,
      scrubTemplateWords(shot.performance, opts.prop),
    ].join("; ");
  }

  const endingHold =
    shot.role === "amy-boy-celebrate"
      ? "CINEMATIC ENDING HOLD: family hopeful-happy resolution — HOLD ~2s on the warmth; emotional story finishes HERE before any CTA; never rush"
      : "";

  return [
    objective,
    actionFirst,
    cam,
    emo,
    identity,
    film,
    blocking,
    amyPresence,
    endingHold,
    `Amy Boy in a photoreal ${world} — Disney+ family-short child, natural skin/hair/body weight — NOT 3D cartoon, NOT plastic AI, NOT CGI`,
    `celebrates discovery with ${opts.prop} energy WITH Amy and family`,
    "child behavior: run a tiny step, giggle, hesitate then explode with joy, look to share the win — never adult posing",
    "INTERACTION: celebrate with Amy (high-five/open arms) and sibling/parent looks — never isolated mascot pose",
    "dialogue naturalism + silence OK: joyful interrupt, soft laugh, natural pause — prefer reaction over fake lip sync",
    "CINEMATIC HOLD after smile/laugh — let the moment breathe",
    "micro-performance every 2-3s: blink, breath, bounce, eye move, fist pump, weight shift",
    scrubTemplateWords(shot.performance, opts.prop),
  ]
    .filter(Boolean)
    .join("; ");
}

function scrubTemplateWords(performance: string, prop: string): string {
  return performance
    .replace(/tablet showing[^,]*/gi, prop)
    .replace(/Study Zone[^,]*/gi, prop)
    .replace(/\btablet\b/gi, prop === "none" ? "cue" : prop)
    .replace(/purple gradient stage/gi, "warm story light");
}

function rewriteInteraction(
  shot: CompositionShotPlan,
  env: EnvironmentId,
  pose: AmyPoseId,
  prop: string,
  amyOnScreen = false,
): string {
  return [
    `In a lived-in photoreal ${env.replace(/-/g, " ")} — same continuous short-film world`,
    amyOnScreen
      ? `Amy ${pose.replace(/-/g, " ")} on screen interacting`
      : `space prepared for Amy's arrival`,
    `around ${prop}`,
    shot.interaction ?? "natural relationship blocking with real eye-lines and shared looks",
  ].join(" — ");
}
