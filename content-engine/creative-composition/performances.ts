/**
 * Motion-first Veo/KIE prompts for official AmyNest characters.
 * Identity from first-frame keyframe — prompts describe PERFORMANCE + world.
 *
 * Production Lock V5 (prompts + scene orchestration; V4 remains active):
 * one continuous short film, Amy ~70% screen presence, interaction blocking,
 * story rhythm, CTA as epilogue, camera continuity, natural silence.
 * Does not change providers, validators, pipeline, or architecture.
 */

import { enrichCompositionWithCharacterMemory } from "../character-memory-engine/from-composition.js";
import { isCharacterMemoryEnabled } from "../character-memory-engine/engine.js";
import {
  BOY_CANONICAL_IDENTITY_LOCK,
  GIRL_CANONICAL_IDENTITY_LOCK,
  formatAmyGirlVisualTokenSummary,
} from "../character-memory-engine/identity-lock.js";
import type { SceneCharacterMemory } from "../character-memory-engine/types.js";
import { enrichCompositionWithCharacterStudio } from "../character-performance-studio/from-composition.js";
import { isCharacterStudioEnabled } from "../character-performance-studio/studio.js";
import { enrichCompositionPerformancePrompt } from "../performance-director/from-composition.js";
import { isPerformanceDirectorEnabled } from "../performance-director/director.js";
import { enrichCompositionWithStoryMemory } from "../story-memory-engine/from-composition.js";
import { isStoryMemoryEnabled } from "../story-memory-engine/engine.js";
import type { SceneStoryMemory } from "../story-memory-engine/types.js";
import type { CompositionCamera, CompositionShotPlan, EnvironmentId } from "./types.js";

const NEGATIVE = [
  "random children redesigning the cast",
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
  "entire world as 3D cartoon",
  "everything plastic CGI",
  "empty showroom room",
  "empty AI-generated room",
  "sterile white void",
  "same purple gradient background every shot",
  "forced sofa living-room template",
  "forced study desk every beat",
  "uncanny plastic skin on humans",
  "horror",
  "distress",
  "text overlays",
  "watermarks",
  "morphing face",
  "voice-over announcer energy",
  "advertisement product demo montage",
  "static locked-off camera the whole shot",
  "Amy floating idle doing nothing",
  "marketing poster energy",
  "product mockup",
  "CGI render look",
  "slideshow of promotional stills",
  "frontal talking head freeze",
  "random unmotivated push-in",
  "characters standing still then talking immediately",
  "Amy as presenter floating in void",
  "forced tablet every scene",
  "equal metronome shot pacing feel",
  "regenerated face",
  "different wardrobe mid-story",
  "wax skin",
  "AI beauty filter face",
  "CGI human",
  "emotion reset every cut",
  "obvious fake lip sync",
  "concept art still",
  "promotional poster frame",
  "PowerPoint endcard energy",
  "marketing presentation montage",
  "image montage",
  "CGI showcase reel",
  "a new cute AI girl",
  "Amy redesign mid-story",
  "Amy standing still facing camera like presenter",
  "abrupt cut mid-sentence",
  "abrupt cut on CTA",
  "half sentence ending",
  "rushed emotional beat with no hold",
  "3D cartoon humans",
  "plastic AI humans",
  "disconnected AI clip montage",
  "teleporting camera",
  "reset character pose every cut",
  "Amy as mascot sticker",
  "isolated characters with no interaction",
  "fake lip sync",
  "speaking after fade to black",
  "promotional advertisement energy",
  "narration over every silent moment",
].join(", ");

function cameraLanguage(camera: CompositionCamera): string {
  switch (camera) {
    case "push-in":
      return "slow cinematic push-in toward the face and hands — intimate story energy";
    case "pan-right":
      return "gentle tracking pan right that follows the character entering the beat";
    case "pan-left":
      return "gentle tracking pan left that reveals the lived-in space";
    case "orbit-soft":
      return "soft orbital camera drift around the celebration";
    case "tracking":
      return "handheld-smooth tracking shot beside the character as they move a few steps";
    case "walking-follow":
      return "walking follow cam at child height, slight natural sway";
    case "over-shoulder":
      return "over-the-shoulder framing — shoulder soft in foreground, face readable in three-quarter, good for dialogue without fake frontal lip flaps";
    case "close-up":
      return "emotion close-up: eyes and mouth readable, shallow depth, reaction-film language";
    case "reaction":
      return "reaction shot hold with tiny push — listen with the face, then micro-smile";
    case "medium":
      return "medium shot, waist-up, room depth and real clutter visible, room to gesture";
    case "wide":
      return "wide establishing shot of a believable photoreal location, then settle on the character";
    case "dolly":
      return "slow dolly-in on eye-line, short-film cadence, never whip-pan";
    case "top-down":
      return "gentle high top-down into hands/props on a real table surface";
    case "hand-close-up":
      return "intimate hand close-up with real textures — paper, pencil, fabric — then tilt to face";
    case "child-pov":
      return "child point-of-view looking into the room — parent/Amy enters their world";
    case "amy-pov":
      return "Amy's soft POV toward the child — mentor gaze, shallow focus";
    case "pull-out":
      return "slow pull-out revealing more of the unique location after the win";
    case "low-angle":
      return "low angle looking up slightly — hero warmth without comic exaggeration";
    case "high-angle":
      return "high angle looking down gently — observational, documentary-soft";
    case "handheld":
      return "subtle handheld micro-shake like a real camera operator — living cinema, not locked tripod";
    case "eye-level":
      return "true eye-level at child height — equal, warm, never towering";
    case "two-shot":
      return "two-shot coverage — companions share frame side-by-side or angled, never stacked frontal talking heads";
    case "profile":
      return "profile / three-quarter dialogue coverage — mouth readable from the side, cinematic conversation film language";
    case "slow-zoom":
    default:
      return "slow cinematic zoom with living micro-parallax — never a frozen still";
  }
}

function identityLock(shot: CompositionShotPlan): string {
  const continuity = [
    "CHARACTER CONSISTENCY (mandatory):",
    "Treat this as another camera angle of the SAME Official Character Bible identity.",
    "Never regenerate face, hairstyle, clothing, or proportions from text alone.",
    "Identity must remain IDENTICAL across every scene and every frame in the Short.",
  ].join(" ");

  if (shot.character === "amy-ai") {
    return [
      "AMY IS A PERMANENT CHARACTER (mandatory):",
      "Generate the exact same Amy AI from previous scenes — one continuous character, never regenerated.",
      "Lock forever: face, eyes, smile, hair/cap, glow/halo, body proportions, clothes, accessories, expressions, body language.",
      "Never create a new cute AI girl. Never redesign Amy mid-story.",
      continuity,
      "Keep the exact same Amy AI from the Official Amy Character Bible — identical white soft-polymer body, purple AmyAI cap, headphones, purple eyes, halo.",
      "AMY AI IS THE EXACT CANONICAL AMYNEST CHARACTER SHOWN IN THE SUPPLIED AMY REFERENCE. PRESERVE HER EXACT FACE, PURPLE CAP, INTEGRATED HEADPHONES, AMYAI CAP BRANDING, PURPLE EYES, ROUNDED WHITE BODY, PROPORTIONS, SILHOUETTE AND FLOATING DESIGN. DO NOT REDESIGN AMY. DO NOT SUBSTITUTE AMY. DO NOT TURN AMY INTO A GENERIC ROBOT. DO NOT REMOVE HER CAP OR HEADPHONES. DO NOT CHANGE HER BODY DESIGN.",
      "Amy AI stays the Official Character Bible identity living inside a PHOTOREAL family-film world — cinematic style (lighting/camera/pacing) may evoke integrated live-action+stylized-character filmmaking craft, but MUST NEVER redefine Amy's identity.",
      "Do not redesign Amy. Do not make the whole world cartoon. Amy is the only constant stylized identity from the supplied Amy reference.",
    ].join(" ");
  }
  if (shot.character === "amy-girl") {
    return [
      continuity,
      "Identity authority for Amy Girl is the SUPPLIED OFFICIAL AMY GIRL CHARACTER BIBLE — not a regenerated keyframe, not text invention, not another character.",
      GIRL_CANONICAL_IDENTITY_LOCK,
      formatAmyGirlVisualTokenSummary(),
    ].join(" ");
  }
  return [
    continuity,
    "Identity authority for Amy Boy is the SUPPLIED OFFICIAL AMY BOY CHARACTER BIBLE.",
    BOY_CANONICAL_IDENTITY_LOCK,
  ].join(" ");
}

const ENV_LINES: Partial<Record<EnvironmentId, string>> = {
  "living-room":
    "photoreal Indian premium middle-class living room — sofa with a throw, family photos, plants, school bag in a corner, water bottle on table, natural clutter, soft practical lamps, daylight from a real window — lived-in, not showroom",
  "study-desk":
    "photoreal child study corner — open notebook, pencil cup, eraser crumbs, stacked worksheets, soft daylight, bookshelf with real books, not an empty AI desk",
  "child-bedroom":
    "photoreal child's bedroom — rumpled bed corner, soft fairy lights, toys softly out of focus, shoes near the door, morning or evening practical light",
  "cta-stage":
    "premium soft purple storybook stage with volumetric light — still short-film, never hard product-ad chrome or empty void",
  "kitchen-table":
    "photoreal Indian kitchen table — steel/wood textures, unfinished papers, fruit bowl, water bottle, warm window light, dinner dishes faintly in background",
  "healthy-kitchen":
    "photoreal bright kitchen with healthy snacks, water bottle, natural counter clutter, warm daylight",
  playroom:
    "photoreal playroom — soft toys, floor mat, daylight, lived-in kid mess at the edges",
  "magic-learning-world":
    "gentle storybook learning nook with soft bokeh — keep grounded, avoid fantasy overload",
  "fridge-magnet-wall":
    "photoreal kitchen fridge with letter magnets, grocery notes, family photos under magnets, warm home light",
  "reading-corner":
    "photoreal reading corner — floor cushion, uneven book stack, warm lamp, curtain texture, quiet evening feel",
  "homework-corner":
    "photoreal compact homework corner — calendar, pencil cup, school bag, water bottle, soft desk lamp",
  "bedroom-night":
    "photoreal bedroom at night — fairy lights, window city/sky glow, soft shadows, hush energy",
  "bedroom-morning":
    "photoreal bedroom morning light — curtains glowing, bed half-made, school clothes hint",
  "astro-observatory":
    "photoreal night balcony with star chart, soft telescope silhouette, city lights distant",
  garden:
    "photoreal small Indian apartment garden / yard — plants in pots, daylight, green bokeh, real soil textures",
  "mirror-practice-nook":
    "photoreal bedroom mirror corner for speech practice — dresser clutter, soft lamp, real glass reflections",
  library:
    "photoreal library or reading room — tall shelves, book spines readable at soft blur, quiet daylight",
  school:
    "photoreal Indian school corridor/classroom edge — notice board, bags, daylight, real tile/wood textures",
  "school-bus":
    "photoreal school-bus window seat — morning light, backpack on lap, motion blur outside",
  park: "photoreal neighborhood park — trees, path, soft daylight, real sky",
  "park-bench":
    "photoreal park bench under a tree — dappled light, distant play sounds suggested visually",
  "indoor-tent":
    "photoreal blanket fort / indoor tent — fairy lights, cushions, cozy clutter",
  "morning-breakfast":
    "photoreal breakfast table — plates, chai/milk glass, school bag nearby, morning window light",
  "dining-table":
    "photoreal dining table after school — papers, water bottle, family photo frame, warm lamp",
  "rainy-window":
    "photoreal rainy window — water droplets, soft grey daylight, cozy interior reflections",
  "space-world":
    "soft night learning nook with star projector glow — keep photoreal room first, stars as practical light",
  "fantasy-learning-world":
    "gentle imaginative corner in a real room — books and soft light, not full CGI fantasy land",
  "math-laboratory":
    "photoreal school science/math corner — charts, pencils, notebook grids, daylight",
  "art-room":
    "photoreal art table — crayons, paper scraps, paint cups, messy-real texture",
  "music-room":
    "photoreal music practice corner — keyboard or small instrument soft in frame, daylight",
  "outdoor-learning":
    "photoreal outdoor learning at a park table — trees, sky, natural wind in hair/leaves",
  "nature-walk":
    "photoreal nature path walk — trees, sky, handheld walking energy",
  "weekend-picnic":
    "photoreal picnic blanket in a park — snacks, soft daylight, family clutter",
  birthday:
    "photoreal birthday corner at home — mild decor, cake table edge, warm indoor light",
  festival:
    "photoreal festival home — soft diyas/lights, rangoli hint, warm family clutter",
  travel:
    "photoreal travel pause — suitcase edge, window light, hotel/home mix calm",
  grandparents:
    "photoreal grandparents' living room — older furniture, photo frames, warm afternoon light",
  "calendar-wall":
    "photoreal wall calendar / routine board area — magnets, pens, lived-in hallway light",
  "balcony-night":
    "photoreal Indian apartment balcony at night — railing, distant city lights, soft sky",
  balcony:
    "photoreal Indian apartment balcony by day — plants in pots, drying rack hint, real sky and railing",
  terrace:
    "photoreal terrace — water tank edge soft, plants, open sky, evening or morning light",
  cafe:
    "photoreal quiet cafe table — cups, wood texture, window light, soft background patrons bokeh",
  museum:
    "photoreal museum gallery corner — exhibit glass, soft overhead light, quiet awe",
  "science-center":
    "photoreal science-center exhibit edge — interactive panel soft blur, curious daylight hall",
  "science-room":
    "photoreal school science room — lab table, charts, daylight through shutters",
  playground:
    "photoreal neighborhood playground — slide/swing soft in background, sand/path textures, daylight",
  "apartment-hallway":
    "photoreal apartment hallway — shoe rack, nameplates, warm bulb light, real tile",
  "car-ride":
    "photoreal car back-seat / window — seatbelt hint, moving city soft blur, golden hour or morning",
  "book-store":
    "photoreal bookstore aisle — crowded shelves, warm lamps, paper smell suggested by texture",
  "festival-home":
    "photoreal festival evening at home — soft lights, sweets plate edge, family photos, warm clutter",
};

function environmentLine(shot: CompositionShotPlan): string {
  return (
    ENV_LINES[shot.environment] ??
    `photoreal ${shot.environment.replace(/-/g, " ")} — Indian premium middle-class lived-in textures, natural clutter, real sky/light, never empty AI room`
  );
}

function lipSyncBlock(shot: CompositionShotPlan): string {
  const mode = shot.speechMode ?? "reacting";
  const line = (shot.spokenLine ?? shot.caption).trim();

  if (mode === "speaking") {
    return [
      "LIP SYNC (mandatory):",
      "Visible speaker owns this shot — assign speaking to this character only.",
      `Prefer reaction / OTS / profile / wide / two-shot coverage over frontal talking heads.`,
      `If face is visible and sync is trustworthy, mouth articulates with line energy: "${line}".`,
      "If perfect lip sync cannot be guaranteed, prefer reaction / OTS / profile / wide — NEVER show obvious fake speaking.",
      "Never show narration energy while an unrelated silent loop plays.",
    ].join(" ");
  }

  if (mode === "listening") {
    return [
      "LIP SYNC (mandatory):",
      "This character is LISTENING — not narrating.",
      "Mouth stays mostly closed or only soft micro-reactions (tiny smile, soft breath).",
      "Do NOT mouth random words. Show attentive listening: blinks, small nods, eyes tracking the mentor or off-screen speaker.",
    ].join(" ");
  }

  return [
    "LIP SYNC (mandatory):",
    "This beat is REACTING to the story — emotional face first.",
    "Mouth follows emotion (worry, relief, joy) with subtle motion, not full dialogue articulation.",
    "No random lip flaps. No closed-mouth 'talking' stare.",
  ].join(" ");
}

function shotObjectiveBlock(shot: CompositionShotPlan): string {
  const objective =
    shot.shotObjective ??
    "One clear visual story beat — never combine multiple objectives";
  return [
    "SHOT OBJECTIVE (mandatory — ONE only):",
    objective + ".",
    "Never combine mother searching + girl reading + Amy teaching in the same shot.",
  ].join(" ");
}

function actionBeforeDialogueBlock(shot: CompositionShotPlan): string {
  const action =
    shot.actionBeforeDialogue ??
    "Character is already physically doing something before any speaking or mouthing";
  return [
    "ACTION BEFORE DIALOGUE (mandatory):",
    action + ".",
    "Sequence: doing something → looks up / settles → THEN speaks or reacts.",
    "NOT: standing still → talking immediately.",
  ].join(" ");
}

function motivatedCameraBlock(shot: CompositionShotPlan): string {
  const why =
    shot.cameraMotivation ??
    "Camera moves only because of character action — never random push-ins";
  return [
    "MOTIVATED CAMERA (mandatory):",
    why + ".",
    "If the girl runs, camera follows. If Amy points, camera pans. If a hug lands, camera slowly moves closer.",
    "Never unmotivated zooms.",
  ].join(" ");
}

function microPerformanceBlock(): string {
  return [
    "MICRO PERFORMANCE (mandatory — every 2–3 seconds at least one):",
    "blink, breath, eye movement, head tilt, hand gesture, weight shift, small smile, or thinking pause.",
    "Never freeze. Continuous living performance like a filmed short movie.",
  ].join(" ");
}

function environmentLifeBlock(shot: CompositionShotPlan): string {
  const env = shot.environment;
  const specifics: Partial<Record<EnvironmentId, string>> = {
    "living-room": "curtains breathe, fan hint, distant hallway life",
    garden: "trees sway, leaves, distant birds",
    park: "trees sway, distant kids playing soft, birds",
    "park-bench": "leaves, distant walkers, soft wind",
    cafe: "steam from cups, soft background patrons walking",
    "car-ride": "window light shifts, soft traffic motion outside",
    "rainy-window": "rain droplets alive on glass",
    balcony: "plants sway, distant traffic and sky life",
    terrace: "wind in plants, open-sky life",
    "kitchen-table": "steam from tea/chai if present, soft kitchen life",
    "healthy-kitchen": "steam or fridge hum life, soft background motion",
    "morning-breakfast": "steam from chai/milk, soft morning curtain motion",
    school: "distant corridor walkers soft, notice-board life",
    playground: "background children motion soft, swings hint",
    "bedroom-morning": "curtains glow and move lightly",
  };
  const extra =
    specifics[env] ??
    "subtle living motion in curtains/trees/people/air — never a dead still plate";
  return [
    "ENVIRONMENT LIFE (mandatory):",
    "The world feels alive —",
    extra + ".",
    "Include natural motion: curtains, wind, plants, people, birds, traffic, kitchen steam, sunlight shift, cloud movement, fans, rain, or background children when the location allows.",
    "Nothing feels frozen.",
  ].join(" ");
}

function childRealismBlock(shot: CompositionShotPlan): string {
  if (shot.character === "amy-ai") {
    return [
      "AMY PERFORMANCE — ACTOR (mandatory):",
      "Amy behaves like an actor, never a presenter floating in space.",
      "She must walk, sit, kneel, hug, high-five, listen, look, smile, celebrate, comfort, teach, react.",
      "Amy never stands still. Amy never faces the camera like a presenter.",
      "Mentor body language at child height — warm blinks, gentle hands, living micro-motion.",
    ].join(" ");
  }

  if (shot.character === "amy-boy") {
    return [
      "CHILD PERFORMANCE (mandatory):",
      "Behave like a real child — touch objects, look around, giggle, lose focus, get excited, run a tiny step, sit awkwardly.",
      "Never act like an adult presenter.",
      "Natural blinks, breath, weight shifts, genuine smile timing.",
      "If a parent/teacher/friend appears: photoreal humans — kneel, soft smile, touch shoulder, hug, fix hair, soft laugh, eye contact, relief.",
    ].join(" ");
  }

  return [
    "CHILD PERFORMANCE (mandatory):",
    "Behave like a real child — touch objects, look around, interrupt energy, giggle, lose focus, get excited, sit awkwardly.",
    "Never act like an adult.",
    "Natural blinks, eye movement, breathing, fidgets, thinking pauses, weight shifts, genuine smile timing.",
    "PARENT / TEACHER / FRIEND if visible: photoreal Netflix-family humans — kneel, smile naturally, touch shoulder, hug, fix hair, laugh softly, eye contact, relief.",
  ].join(" ");
}

function filmRuleBlock(): string {
  return [
    "CINEMATIC RULE (mandatory):",
    "Generate an emotional film — every frame belongs inside a Disney+ family short.",
    "Pixar short warmth / Netflix family film / Apple TV family drama energy.",
    "Never generate promotional videos, posters, concept art, PowerPoint, slideshow, image montage, or CGI showcase ads.",
  ].join(" ");
}

function emotionalContinuityBlock(shot: CompositionShotPlan): string {
  const from = shot.emotionFrom ?? "previous story emotion";
  const to = shot.emotionTo ?? "progressed story emotion";
  return [
    "EMOTIONAL ACTING (mandatory):",
    `Enter this beat in "${from}" and leave in "${to}".`,
    "Every shot needs clear emotion (confused / thinking / curious / hopeful / relieved / proud / happy) that continues naturally.",
    "Never reset emotion after every scene (no confused→happy→confused whiplash).",
    "Arc: confused → thinking → curious/interested → hopeful → relieved/proud → happy.",
    shot.emotionBeat ? `Beat direction: ${shot.emotionBeat}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function dialogueNaturalismBlock(shot: CompositionShotPlan): string {
  return [
    "DIALOGUE NATURALISM (mandatory):",
    "Characters interrupt naturally, pause naturally, smile naturally, think naturally.",
    "Children hesitate. Parents react. Amy listens before speaking.",
    "No robotic conversations.",
    shot.speechMode === "listening"
      ? "This beat privileges listening reactions over speech."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function cinematicEndingBlock(shot: CompositionShotPlan): string {
  if (shot.role === "amy-boy-celebrate") {
    return [
      "EMOTIONAL RESOLUTION + HOLD (mandatory):",
      "Family + Amy emotional resolution finishes HERE.",
      "Family smiles → HOLD ~2 seconds — child smile / hug / Amy celebrate must breathe.",
      "Never rush into CTA. Never cut while emotion is still peaking.",
    ].join(" ");
  }
  if (shot.role === "cta") {
    return [
      "CTA IS AN EPILOGUE (mandatory — not another scene):",
      "Sequence: family smile energy → 2s HOLD → Amy waves → fade → AmyNest logo → Download AmyNest AI → Play Store → App Store → amynest.in → 2s HOLD → fade to black.",
      "Never speak after fade begins. Never cut the CTA. Never hard-sell PowerPoint energy.",
    ].join(" ");
  }
  return "";
}

function continuousFilmBlock(shot: CompositionShotPlan): string {
  return [
    "CONTINUOUS FILM (mandatory):",
    "This is ONE continuous animated short film — never a sequence of disconnected AI clips.",
    shot.continuityBridge
      ? `Bridge: ${shot.continuityBridge}.`
      : "Begin exactly where the previous scene ended.",
    "Never reset character position, eye direction, hand position, camera direction, walking direction, lighting, or emotion between cuts.",
    "Scene N+1 continues Scene N. Never teleport.",
  ].join(" ");
}

function amyPresenceBlock(shot: CompositionShotPlan): string {
  if (shot.amyOnScreen) {
    return [
      "AMY SCREEN PRESENCE (mandatory):",
      "Amy is the emotional lead and part of the family — visibly present and interacting this beat (~70% of the film).",
      "Amy must kneel/sit/walk beside, touch shoulder, look, listen, celebrate, or comfort — never disappear as a missing mascot/narrator.",
    ].join(" ");
  }
  if (shot.role === "hook") {
    return "AMY SCREEN PRESENCE: cold-open isolation is story-required — Amy appears next and must feel continuous with this eyeline/emotion.";
  }
  return "AMY SCREEN PRESENCE: keep Amy in the family's world — do not strand her off-screen for long.";
}

function interactionBlock(shot: CompositionShotPlan): string {
  return [
    "CHARACTER INTERACTION (mandatory):",
    shot.interaction
      ? shot.interaction
      : "Include real interaction — Amy touches shoulder / kneels beside / parent looks at Amy / child laughs with Amy / shared celebrate.",
    "Never show isolated characters unless the story beat explicitly requires solitude.",
  ].join(" ");
}

function storyRhythmBlock(shot: CompositionShotPlan): string {
  return [
    "STORY RHYTHM (mandatory — never compress):",
    `This beat = ${shot.storyBeat ?? shot.role}.`,
    "Full arc: Hook → Problem → Escalation → Amy appears → Discovery → Transformation → Emotional resolution → CTA epilogue.",
  ].join(" ");
}

function naturalSilenceBlock(): string {
  return [
    "NATURAL SILENCE (mandatory):",
    "Not every second needs narration. Allow silent looks, Amy nods, parent smiles, music-only breaths.",
    "Silence creates emotion — do not fill every frame with talk.",
  ].join(" ");
}

function lipSyncStrategyBlock(shot: CompositionShotPlan): string {
  return [
    "LIP SYNC STRATEGY (mandatory):",
    "Do NOT fake lip sync. Audience notices bad mouths more than hidden mouths.",
    shot.speechMode === "speaking"
      ? "Only show speaking faces when mouth animation is believable; otherwise prefer reaction / OTS / profile / wide / hands / objects / environmental cutaways."
      : "This beat privileges listening/reacting — use reaction, OTS, profile, wide, hands, objects, or cutaways instead of fake talking heads.",
  ].join(" ");
}

function cinematicHoldBlock(shot: CompositionShotPlan): string {
  if (shot.role === "cta") return "";
  return [
    "CINEMATIC HOLDS (mandatory):",
    "After emotional peaks (smile, hug, Amy wave, family laugh, understanding glance) — HOLD briefly so the moment breathes.",
    "Never rush every beat. Pixar short pacing, not slideshow cuts.",
  ].join(" ");
}

function humanRealismBlock(shot: CompositionShotPlan): string {
  if (shot.character === "amy-ai") return "";
  if (shot.character === "amy-girl" || shot.character === "amy-boy") {
    return [
      "BRAND CHILD RENDER STABILITY (mandatory):",
      "Amy Girl / Amy Boy remain stylized animated AmyNest characters locked to their Official Character Bible — NOT photoreal humans, NOT a new redesign each frame.",
      "Keep stable premium shading: natural skin shading, hair highlights, fabric folds, believable eyes, natural facial movement — identity immutable frame-to-frame.",
      "Parents, teachers, friends, and background humans (if present) may be photorealistic Netflix-family humans. Environment stays photoreal.",
      "No beauty filter. No age drift. No wax face. No random face regeneration mid-shot.",
    ].join(" ");
  }
  return [
    "HUMAN REALISM (mandatory):",
    "Parents, children, teachers, friends must be photorealistic Netflix family-movie humans.",
    "Natural skin, hair, eyes, clothing folds, body weight, movement.",
    "NOT 3D cartoon. NOT plastic AI. NOT CGI humans. No beauty filters. No wax faces.",
  ].join(" ");
}

function qualityLockBlock(): string {
  return [
    "QUALITY LOCK V5 (mandatory):",
    "Reject if Amy feels like a mascot, scenes feel disconnected, ending feels rushed, narration overlaps fade, characters stop interacting, camera teleports, or audience notices AI generation.",
    "Reject slideshow / poster / promotional advertisement energy.",
    "Accept only ONE continuous Disney+ family short — emotional film, not an AI ad.",
    "SUCCESS: viewer wants another AmyNest story — not 'I watched an AI advertisement.'",
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

function worldStyleBlock(): string {
  return [
    "WORLD STYLE (mandatory):",
    "Photorealistic environments, furniture, trees, sky, books, kitchen, school, cars, lighting, and textures — like a live-action short film.",
    "CINEMATIC STYLE SEPARATION: Paddington/Ted/Detective Pikachu / soft-robot / cinematic animated-film language may influence ONLY lighting, camera, pacing, environment, emotional tone, and filmmaking craft — NEVER Amy AI / Amy Girl / Amy Boy identity (Official Character Bible is sole identity authority).",
    "Amy AI remains the exact canonical stylized character from the supplied Amy reference; everything else should feel real.",
    "Indian premium middle-class homes with natural clutter: books, school bags, water bottles, shoes, family photos, plants, toys.",
    "Never empty AI rooms. Never force the same sofa / study desk / purple void into every Short.",
  ].join(" ");
}

function appNote(shot: CompositionShotPlan): string {
  if (shot.allowAppUi === false || /app=none|Do NOT show AmyNest app/i.test(shot.notes)) {
    return "APP USAGE: no AmyNest UI this beat — story first; Short allows max 2 app appearances total, never as filler.";
  }
  if (shot.allowAppUi === true) {
    return "APP USAGE: AmyNest UI allowed ONLY because it advances this story beat (max 2 appearances per Short); on-device ≤2s — never filler fullscreen.";
  }
  return "APP USAGE: AmyNest UI only if it advances the story — maximum 2 appearances per Short; never filler.";
}

/**
 * Build Veo/KIE performance prompt — direction-rich, identity-locked, unique short-film world.
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
    "Vertical 9:16 ONE CONTINUOUS Disney+/Pixar-quality FAMILY SHORT FILM beat — photoreal world + permanent canonical AmyNest characters (identity from Official Character Bibles only).",
    "MISSION: audience believes they are watching one animated short film — never a sequence of AI clips. They should want another AmyNest story.",
    "CINEMATIC STYLE SEPARATION: Disney+/Pixar-quality / Netflix family-film / Paddington-Ted-Pikachu integration language influences lighting, camera, pacing, environment, and emotion ONLY — never replaces Amy AI, Amy Girl, or Amy Boy identity.",
    filmRuleBlock(),
    qualityLockBlock(),
    continuousFilmBlock(shot),
    storyRhythmBlock(shot),
    amyPresenceBlock(shot),
    interactionBlock(shot),
    "Parents should emotionally connect within seconds; direct like a unique short film, not a reusable ad template.",
    "Animate continuous living motion from the first frame — cinematic blocking through the environment, never frozen staging.",
    shotObjectiveBlock(shot),
    actionBeforeDialogueBlock(shot),
    motivatedCameraBlock(shot),
    "CAMERA CONTINUITY: if prior energy pushed in / tracked / panned, continue that energy — never teleport the camera.",
    emotionalContinuityBlock(shot),
    naturalSilenceBlock(),
    cinematicHoldBlock(shot),
    cinematicEndingBlock(shot),
    worldStyleBlock(),
    identityLock(shot),
    humanRealismBlock(shot),
    `Believable unique environment: ${environmentLine(shot)}.`,
    environmentLifeBlock(shot),
    "ENVIRONMENT: real lived-in home — fans, curtains, plants, traffic, toys, books, sunlight, clutter. Never empty AI rooms.",
    `Directed performance: ${shot.performance}.`,
    relationshipBlock(shot),
    dialogueNaturalismBlock(shot),
    lipSyncStrategyBlock(shot),
    lipSyncBlock(shot),
    childRealismBlock(shot),
    microPerformanceBlock(),
    "Conversation coverage: rotate wide / OTS / reaction / two-shot / profile / hands / objects — avoid frontal fake talking heads.",
    `Camera direction (motivated + continuous): ${cameraLanguage(shot.camera)}.`,
    "If child moves, camera follows. If Amy walks, camera tracks. If parent kneels, camera lowers.",
    "Foreground, midground, and background depth with cinematic practical lighting — filmed feeling, not flat AI plate.",
    appNote(shot),
    "STORY FIRST: AmyNest UI only when story requires it — max 2 appearances per Short; never filler.",
    "No mascot Amy. No disconnected clips. No promotional montage. No slideshow.",
    `Clip length ${shot.durationSeconds} seconds. Pace with holds and silence — never rush or compress story beats.`,
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
    out = enrichCompositionPerformancePrompt(shot, out.prompt, out.negativePrompt);
  }
  if (isCharacterStudioEnabled()) {
    out = enrichCompositionWithCharacterStudio(shot, out.prompt, out.negativePrompt);
  }
  if (isCharacterMemoryEnabled()) {
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
