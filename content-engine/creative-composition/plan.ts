/**
 * Character-performance shot plan — continuous Veo episodes, not still montages.
 * Production Lock V5: one continuous short film — Amy lead, interaction, story rhythm.
 * V4 timing/holds/endcard remain active.
 */

import { diversifyCompositionPlan } from "../content-diversity/diversify-plan.js";
import type { ContentPackage } from "../types/content-package.js";
import type { CreativeCompositionPlan, CompositionShotPlan } from "./types.js";
import { CREATIVE_COMPOSITION_VERSION } from "./types.js";

function isTutorStory(content: ContentPackage, ...chunks: string[]): boolean {
  return /tutor|doubt|homework|quiz|practice|teach/i.test(
    `${chunks.join(" ")} ${content.title} ${content.hook}`,
  );
}

export function planCinematicShort(
  content: ContentPackage,
  totalDurationSeconds = 21,
): CreativeCompositionPlan {
  const hook = content.captions[0]?.text ?? content.hook;
  const host =
    content.captions[1]?.text ?? "Hi, I'm Amy AI — let's make learning lighter";
  const learn =
    content.captions[2]?.text ?? "AmyNest Study Zone — a fresh lesson every day";
  const celebrate =
    content.captions[3]?.text ?? "Hope lands — calmer progress together";
  const cta = content.captions[4]?.text ?? "Download AmyNest AI";
  const tutor = isTutorStory(content, hook, host, learn, celebrate);

  // Story rhythm: Hook → Problem → Escalation → Amy → Discovery → Transformation → Resolution → CTA
  const shots: CompositionShotPlan[] = [
    {
      id: "shot-hook",
      role: "hook",
      durationSeconds: 4,
      environment: "homework-corner",
      kind: "veo-performance",
      caption: hook,
      camera: "wide",
      character: "amy-girl",
      speechMode: "reacting",
      spokenLine: hook,
      allowAppUi: false,
      amyOnScreen: false,
      storyBeat: "Hook + Problem",
      continuityBridge:
        "Cold open of ONE continuous short film — establish body position, eye-line, and lighting that the next cut will continue (not a new commercial)",
      shotObjective: tutor
        ? "Girl searching through homework struggle"
        : "Girl reading alone with soft worry",
      actionBeforeDialogue:
        "Already drawing / turning pages / fidgeting with pencil — natural blocking through the room before any reaction peak",
      cameraMotivation:
        "Camera holds wide then settles closer because her searching hands invite us in — never random push-in",
      emotionFrom: "neutral quiet",
      emotionTo: "confused",
      emotionBeat:
        "Confused / soft struggle — leave STILL confused-thinking; allow a silent look/sigh (not every second needs talk)",
      eyeLine:
        "Into the story prop / notebook, then briefly toward where help might come",
      interaction:
        "Cold-open isolation required by story — alone in a lived-in space, waiting for family/mentor (Amy enters next)",
      performance: tutor
        ? "walks or sits into the homework struggle, fidgets with pencil, soft frustrated then thoughtful, natural blinks, tiny sigh, glances hoping for help — ends mid-thought for the next cut"
        : "moves into the lonely beat with the story prop, natural blinks, small sigh, looks toward window light — ends still needing help for continuity",
      notes:
        "V5 Hook+Problem. Continuous film open. Silence OK. No Amy yet (story requires). No app.",
    },
    {
      id: "shot-amy-host",
      role: "amy-host",
      durationSeconds: 4,
      environment: "living-room",
      kind: "veo-performance",
      caption: host,
      camera: "tracking",
      character: "amy-ai",
      speechMode: "speaking",
      spokenLine: host,
      allowAppUi: false,
      amyOnScreen: true,
      storyBeat: "Escalation + Amy appears",
      continuityBridge:
        "CONTINUOUS FILM: begin exactly where the girl's confused beat left off — same emotion, same eye-line energy, matching lighting; Amy walks/kneels into THAT moment (never teleport, never reset pose)",
      shotObjective: "Amy appears and guides beside the child as family companion",
      actionBeforeDialogue:
        "Walks into frame / kneels beside the child, soft eye contact and a listen beat — THEN speaks",
      cameraMotivation:
        "Camera follows Amy entering / kneeling — continue previous camera energy, never teleport",
      emotionFrom: "confused",
      emotionTo: "thinking",
      emotionBeat:
        "Escalation softens as Amy appears — Amy listens first; child still thinking; allow a silent nod before words",
      eyeLine: "Toward the child at child height — family companion, not presenter to lens",
      interaction: tutor
        ? "Amy touches/comforts space beside the child, kneels at eye level, parent/child may look to Amy — she is part of the family, not a narrator"
        : "Amy kneels/sits beside the child, open-palm reassure; child looks to Amy; interaction required",
      performance: tutor
        ? "exact same Amy walks into the ongoing scene, kneels, warm smile, listens, then mouths a gentle help offer, points to the story prop — actor in the family, never still presenter"
        : "exact same Amy walks into frame, kneels, listens, mouths welcome, points to story prop — companion inside the continuous film",
      notes:
        "V5 Amy lead (~70% presence starts). Interaction mandatory. Lip-safe coverage. Continuous from hook.",
    },
    {
      id: "shot-amy-girl-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "reading-corner",
      kind: "veo-performance",
      caption: learn,
      camera: "over-shoulder",
      character: "amy-girl",
      speechMode: "listening",
      spokenLine: learn,
      allowAppUi: true,
      amyOnScreen: true,
      storyBeat: "Discovery + Transformation",
      continuityBridge:
        "CONTINUOUS FILM: pick up Amy still beside the child from previous beat — same Amy pose energy, same child seat/prop relationship, same lighting warmth; camera continues OTS/coverage energy (no teleport)",
      shotObjective: "Girl discovering with Amy guiding beside her",
      actionBeforeDialogue:
        "Already touching the prop / looking around — then looks up to Amy; Amy may point or touch shoulder before any mouth reaction",
      cameraMotivation:
        "OTS / reaction / profile / hands / prop cutaways — never fake frontal lip sync; camera continues prior coverage",
      emotionFrom: "thinking",
      emotionTo: "interested",
      emotionBeat:
        "Discovery → transformation begins — curiosity lands; silent smile / Amy nod OK without constant narration",
      eyeLine: "Between story prop and Amy at child height — they share the beat",
      interaction: tutor
        ? "Amy ON SCREEN beside her: kneels/sits, may touch shoulder or point to prop; child laughs/looks to Amy; parent may glance at Amy — never isolated learning"
        : "Amy ON SCREEN guiding beside the child; shared looks, prop handoff, soft celebration micro-beat",
      performance: tutor
        ? "listens, small nods, soft smile as understanding lands, engages prop while Amy reacts beside her — continuous two-shot family energy; hesitate, think, light up"
        : "listens and thinks with Amy beside her, eyes light up, small smile, engages prop — discovery with companion, never alone freeze",
      notes:
        "V5 Discovery+Transformation. Amy on screen. Interaction. Lip-safe. App only if story needs.",
    },
    {
      id: "shot-amy-boy-celebrate",
      role: "amy-boy-celebrate",
      durationSeconds: 6,
      environment: "garden",
      kind: "veo-performance",
      caption: celebrate,
      camera: "orbit-soft",
      character: "amy-boy",
      speechMode: "reacting",
      spokenLine: celebrate,
      allowAppUi: false,
      amyOnScreen: true,
      storyBeat: "Transformation + Emotional resolution",
      continuityBridge:
        "CONTINUOUS FILM: joy continues from discovery — same family, same Amy presence, matching warm light; boy shares the win WITH Amy and sister energy (never a new disconnected celebrate clip)",
      shotObjective: "Family + Amy celebrate — hopeful joy held",
      actionBeforeDialogue:
        "Already bouncing / running a tiny step / giggling with Amy nearby — THEN share look; prefer reaction/profile over fake talking head",
      cameraMotivation:
        "Camera follows celebration move closer as family+Amy react — continue prior push/orbit energy, never teleport",
      emotionFrom: "interested",
      emotionTo: "hopeful-happy",
      emotionBeat:
        "Transformation completes → hopeful → happy — HOLD ~2s on family+Amy warmth before epilogue CTA",
      eyeLine: "Toward Amy / sister / parent to share the win — not hard sell to camera",
      interaction:
        "Amy ON SCREEN celebrating with both children — high-five / open arms / shared laugh; parent looks at Amy; never isolated solo celebrate",
      performance: tutor
        ? "celebrates WITH Amy beside him — small jump, fist pump, laughs, looks to Amy and sister, natural blinks; HOLD family+Amy warmth ~2s — lip-safe reaction energy over fake mouthing"
        : "celebrates WITH Amy and family — jump, fist pump, genuine smile, shared look; HOLD ~2s before brand epilogue",
      notes:
        "V5 Resolution. Amy on screen interacting. HOLD before CTA. Prefer reacting over fake lip sync.",
    },
    {
      id: "shot-cta",
      role: "cta",
      durationSeconds: 6,
      environment: "cta-stage",
      kind: "cta-overlay",
      caption: cta,
      camera: "dolly",
      character: "amy-ai",
      speechMode: "speaking",
      spokenLine: cta,
      allowAppUi: false,
      amyOnScreen: true,
      storyBeat: "CTA epilogue",
      continuityBridge:
        "EPILOGUE (not a new scene): continue from family smile energy — same Amy who just celebrated; never a disconnected ad cut",
      shotObjective: "Epilogue endcard after story already resolved — never cut short",
      actionBeforeDialogue:
        "Family smile energy → Amy settles → soft wave — THEN invite line; after fade begins, NO more speaking energy",
      cameraMotivation:
        "Slow dolly from the held family warmth into the epilogue — never teleport into hard-sell",
      emotionFrom: "hopeful-happy",
      emotionTo: "warm invite",
      emotionBeat:
        "CTA is an EPILOGUE: family smiles → 2s HOLD → Amy waves → fade → logo → Download AmyNest AI → Play Store → App Store → amynest.in → 2s HOLD → fade to black. Never speak after fade begins.",
      eyeLine: "Warm companion eye contact — part of the family, not a mascot presenter",
      interaction:
        "Same Amy from the family story — epilogue wave after the held smile; then complete brand endcard",
      performance:
        "exact same Amy from previous scenes: soft smile, gentle wave (not presenter pose), mouths Download AmyNest AI before fade; after fade begins — silent endcard only (logo, badges, website), HOLD, fade to black",
      notes:
        "V5 CTA=epilogue. Never speak after fade. Complete endcard. Amy lead.",
    },
  ];

  const sum = shots.reduce((a, s) => a + s.durationSeconds, 0);
  void totalDurationSeconds;
  void sum;

  const base: CreativeCompositionPlan = {
    version: CREATIVE_COMPOSITION_VERSION,
    totalDurationSeconds,
    shots,
    rulesApplied: [
      "three-permanent-characters-only",
      "bible-identity-image-to-video",
      "continuous-veo-performances",
      "no-still-plate-montage",
      "amy-ai-host-every-episode",
      "amy-ai-mentor-inside-story",
      "lip-ownership-per-beat",
      "real-child-micro-acting",
      "filmed-camera-language",
      "character-relationship-blocking",
      "app-ui-in-device-only",
      "wardrobe-face-proportion-lock",
      "camera-and-character-motion",
      "720p-cost-neutral-direction",
      "cinematic-realism-v2-one-objective",
      "cinematic-realism-v2-action-before-dialogue",
      "cinematic-realism-v2-motivated-camera",
      "production-lock-v3-character-consistency",
      "production-lock-v3-emotional-continuity",
      "production-lock-v3-cinematic-ending-before-cta",
      "production-lock-v3-app-max-2",
      "production-lock-v4-permanent-amy",
      "production-lock-v4-cinematic-holds",
      "production-lock-v4-complete-cta-endcard",
      "production-lock-v5-continuous-film",
      "production-lock-v5-amy-screen-presence",
      "production-lock-v5-interaction-blocking",
      "production-lock-v5-story-rhythm",
      "production-lock-v5-cta-epilogue",
    ],
  };

  return diversifyCompositionPlan(content, base).plan;
}
