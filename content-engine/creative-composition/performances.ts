/**
 * Motion-first Veo prompts for official AmyNest characters.
 * Identity comes from the first-frame keyframe — prompts describe PERFORMANCE only.
 *
 * Cinematic Realism Program (direction layer):
 * lip ownership, mentor blocking, child micro-acting, filmed camera language.
 * Does not change providers, validators, rendering, or publishing.
 */

import { enrichCompositionWithCharacterMemory } from "../character-memory-engine/from-composition.js";
import { isCharacterMemoryEnabled } from "../character-memory-engine/engine.js";
import type { SceneCharacterMemory } from "../character-memory-engine/types.js";
import { enrichCompositionWithCharacterStudio } from "../character-performance-studio/from-composition.js";
import { isCharacterStudioEnabled } from "../character-performance-studio/studio.js";
import { enrichCompositionPerformancePrompt } from "../performance-director/from-composition.js";
import { isPerformanceDirectorEnabled } from "../performance-director/director.js";
import { enrichCompositionWithStoryMemory } from "../story-memory-engine/from-composition.js";
import { isStoryMemoryEnabled } from "../story-memory-engine/engine.js";
import type { SceneStoryMemory } from "../story-memory-engine/types.js";
import type { CompositionCamera, CompositionShotPlan } from "./types.js";

const NEGATIVE = [
  "random children",
  "new mascot designs",
  "different hairstyle",
  "clothing redesign",
  "logo recreation",
  "fullscreen app screenshot",
  "PowerPoint",
  "slideshow",
  "static pose",
  "frozen mannequin face",
  "silent talking head",
  "mouth closed while speaking",
  "mouth moving with no speech intent",
  "robotic stiff animation",
  "generic AI cartoon child",
  "uncanny plastic skin",
  "horror",
  "distress",
  "text overlays",
  "watermarks",
  "morphing face",
  "voice-over announcer energy",
  "advertisement product demo montage",
  "static locked-off camera the whole shot",
].join(", ");

function cameraLanguage(camera: CompositionCamera): string {
  switch (camera) {
    case "push-in":
      return "slow cinematic push-in toward the face and hands — intimate story energy";
    case "pan-right":
      return "gentle tracking pan right that follows the character entering the beat";
    case "pan-left":
      return "gentle tracking pan left that reveals the learning space";
    case "orbit-soft":
      return "soft orbital camera drift around the celebration, dreamworks-short energy";
    case "tracking":
      return "handheld-smooth tracking shot beside the character as they move a few steps";
    case "over-shoulder":
      return "over-the-shoulder framing into the desk/tablet, mentor or child shoulder soft in foreground";
    case "close-up":
      return "emotion close-up: eyes and mouth readable, shallow depth, reaction-film language";
    case "reaction":
      return "reaction shot hold with tiny push — listen with the face, then micro-smile";
    case "medium":
      return "medium shot, waist-up, room depth visible, natural blocking room to gesture";
    case "wide":
      return "wide establishing shot of the believable home space, then settle on the character";
    case "dolly":
      return "slow dolly-in on eye-line, Pixar short cadence, never whip-pan";
    case "slow-zoom":
    default:
      return "slow cinematic zoom with living micro-parallax — never a frozen still";
  }
}

function identityLock(shot: CompositionShotPlan): string {
  if (shot.character === "amy-ai") {
    return "Keep the exact same Amy AI from the first frame — identical white soft-polymer body, purple AmyAI cap, headphones, purple eyes, halo. Do not redesign. Amy is a mentor inside the room, never a floating logo sticker.";
  }
  if (shot.character === "amy-girl") {
    return "Keep the exact same Amy Girl from the first frame — identical brown side ponytail with yellow bow, plain purple hoodie, dark purple leggings, purple sneakers with white soles, warm brown eyes. She must feel like a real child, not a generic AI cartoon.";
  }
  return "Keep the exact same Amy Boy from the first frame — identical fluffy dark brown hair, plain purple hoodie, dark purple joggers, purple sneakers with white soles, warm brown eyes. He must feel like a real playful child, not a stock mascot.";
}

function environmentLine(shot: CompositionShotPlan): string {
  switch (shot.environment) {
    case "living-room":
      return "believable modern family living room — sofa, plants, soft practical lamps, purple rim accent, lived-in not showroom";
    case "study-desk":
      return "child study table with open notebook, pencil, soft daylight from a real window, pastel stationery, calm homework atmosphere";
    case "child-bedroom":
      return "cozy child's bedroom with tidy bed corner, soft fairy lights, morning light, toys softly out of focus — home, not fantasy realm";
    case "cta-stage":
      return "premium purple gradient stage with soft volumetric light — still storybook, never hard product-ad chrome";
    case "kitchen-table":
      return "warm family kitchen table, unfinished worksheets, golden window light";
    case "playroom":
      return "bright safe playroom, soft toys blurred, cheerful daylight";
    case "magic-learning-world":
      return "gentle storybook learning nook with soft purple bokeh — keep grounded, avoid fantasy overload";
    case "fridge-magnet-wall":
      return "kitchen fridge letter-magnet wall, warm home light, phonics cold-open energy";
    case "reading-corner":
      return "cozy reading corner with cushion and bookshelf, warm lamp, story calm";
    case "homework-corner":
      return "compact homework corner with calendar and pencil cup, soft desk lamp";
    case "bedroom-night":
      return "child bedroom at night with soft fairy lights and window star glow";
    case "astro-observatory":
      return "night balcony observatory vibe with star chart and soft telescope silhouette";
    case "garden":
      return "small family garden with soft daylight and green bokeh";
    case "mirror-practice-nook":
      return "bedroom mirror practice nook for gentle speech practice, soft lamp";
    default:
      return `${shot.environment.replace(/-/g, " ")} — premium Pixar family environment, soft cinematic light, uncluttered`;
  }
}

function lipSyncBlock(shot: CompositionShotPlan): string {
  const mode = shot.speechMode ?? "reacting";
  const line = (shot.spokenLine ?? shot.caption).trim();

  if (mode === "speaking") {
    return [
      "LIP SYNC (mandatory):",
      `This character is the SPEAKER for the beat.`,
      `Mouth clearly articulates while delivering this line energy: "${line}".`,
      "Jaw opens and closes with syllables; lips shape vowels; tongue hints on consonants.",
      "Do not leave the mouth frozen or closed while the character is meant to be talking.",
      "Eye contact supports the speech — speaking feels alive, not dubbed over a silent face.",
    ].join(" ");
  }

  if (mode === "listening") {
    return [
      "LIP SYNC (mandatory):",
      "This character is LISTENING — not narrating.",
      "Mouth stays mostly closed or only soft micro-reactions (tiny smile, soft breath).",
      "Do NOT mouth random words. Show attentive listening: blinks, small nods, eyes tracking the mentor or off-screen speaker.",
      "Never play silent talking-head mouth flaps while they are not the speaker.",
    ].join(" ");
  }

  return [
    "LIP SYNC (mandatory):",
    "This beat is REACTING to the story — emotional face first.",
    "Mouth follows emotion (worry, relief, joy) with subtle motion, not full dialogue articulation.",
    "No random lip flaps. No closed-mouth 'talking' stare.",
  ].join(" ");
}

function childRealismBlock(shot: CompositionShotPlan): string {
  if (shot.character === "amy-ai") {
    return [
      "MENTOR BODY LANGUAGE:",
      "Amy AI moves at child height when helping — kneel, lean, or sit beside, never towering lecture pose.",
      "Warm supportive smile, soft blinks, gentle hand gestures (point, open palm, reassure).",
      "Amy lives inside the story as a guide; never announcer voice-over energy.",
    ].join(" ");
  }

  return [
    "REAL CHILD BEHAVIOR (mandatory):",
    "Natural blinking every couple of seconds, tiny head tilts, soft breathing in the shoulders,",
    "weight shifts, small hand fidgets, curious eye focus that looks around then settles,",
    "thinking micro-pauses, believable smile timing — never robotic posing or mannequin stillness.",
  ].join(" ");
}

function relationshipBlock(shot: CompositionShotPlan): string {
  const parts = [
    shot.emotionBeat ? `Emotion beat: ${shot.emotionBeat}.` : "",
    shot.interaction ? `Character relationship / blocking: ${shot.interaction}.` : "",
    shot.eyeLine ? `Eye-line: ${shot.eyeLine}.` : "",
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Characters should feel connected to someone in the story — look, listen, smile, or celebrate with a partner presence.";
  }
  return parts.join(" ");
}

function appNote(shot: CompositionShotPlan): string {
  if (shot.role !== "amy-girl-learn") return "";
  return "A tablet in her hands briefly shows a clean lesson / tutor chat card with a purple progress ring — UI readable under two seconds, never fullscreen. She interacts with the device like a real child.";
}

/**
 * Build Veo performance prompt — direction-rich, identity-locked, cost-neutral (same model/resolution).
 * Optional previousMemory makes this shot continue from the prior approved frame.
 */
export function performancePrompt(
  shot: CompositionShotPlan,
  previousMemory: SceneCharacterMemory | null = null,
  previousStory: SceneStoryMemory | null = null,
): {
  prompt: string;
  negativePrompt: string;
  memory?: SceneCharacterMemory;
  story?: SceneStoryMemory;
} {
  const prompt = [
    "Vertical 9:16 Pixar / DreamWorks-TV quality animated FAMILY SHORT scene — not a promotional slideshow.",
    "Parents should emotionally connect within seconds; direct like a short film, not an ad montage.",
    "Animate continuous living motion from the first frame — never a static pose hold.",
    identityLock(shot),
    `Believable environment: ${environmentLine(shot)}.`,
    `Directed performance: ${shot.performance}.`,
    relationshipBlock(shot),
    lipSyncBlock(shot),
    childRealismBlock(shot),
    "Include body movement, eye blinks, facial expression change, clear hand gestures, and soft contact with the world (desk, floor, tablet).",
    `Camera direction: ${cameraLanguage(shot.camera)}.`,
    "Foreground, midground, and background depth with cinematic practical lighting — filmed feeling, not flat AI plate.",
    appNote(shot),
    "No random humans replacing the official character. No slideshow energy. No product-demo montage.",
    `Duration ${shot.durationSeconds} seconds.`,
  ]
    .filter(Boolean)
    .join(" ");

  let out: {
    prompt: string;
    negativePrompt: string;
    memory?: SceneCharacterMemory;
    story?: SceneStoryMemory;
  } = { prompt, negativePrompt: NEGATIVE };
  if (isPerformanceDirectorEnabled()) {
    // Additive Performance Director v2 — living cast / speaking-listening coordination.
    out = enrichCompositionPerformancePrompt(shot, out.prompt, out.negativePrompt);
  }
  if (isCharacterStudioEnabled()) {
    // Additive Character Performance Studio — intention / face / eye / body craft.
    out = enrichCompositionWithCharacterStudio(shot, out.prompt, out.negativePrompt);
  }
  if (isCharacterMemoryEnabled()) {
    // Additive Character Memory Engine — inherit previous approved scene.
    const memorized = enrichCompositionWithCharacterMemory(
      shot,
      out.prompt,
      out.negativePrompt,
      previousMemory,
    );
    out = {
      prompt: memorized.prompt,
      negativePrompt: memorized.negativePrompt,
      memory: memorized.memory,
      story: out.story,
    };
  }
  if (isStoryMemoryEnabled()) {
    // Final additive Story Memory Engine — one continuous emotional story.
    const storied = enrichCompositionWithStoryMemory(
      shot,
      out.prompt,
      out.negativePrompt,
      previousStory,
    );
    out = {
      prompt: storied.prompt,
      negativePrompt: storied.negativePrompt,
      memory: out.memory,
      story: storied.story,
    };
  }
  return out;
}
