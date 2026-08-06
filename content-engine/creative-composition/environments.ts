/**
 * Environment + character plate prompts for Imagen.
 * Characters are generated inside designed worlds — never pasted as fullscreen PNGs.
 * Cinematic Realism: believable home spaces over fantasy overload.
 */

import type { EnvironmentId, ShotRole } from "./types.js";

const ENV_LOOK: Partial<Record<EnvironmentId, string>> = {
  "kitchen-table":
    "simple warm Indian family kitchen table, a few worksheets, soft window light, shallow depth of field — real home, uncluttered",
  "child-bedroom":
    "quiet child's bedroom reading corner, tidy bed, soft morning light, calm lavender accents — real home, no busy props",
  "study-desk":
    "simple child study desk with notebook and pencil, soft daylight from a real window, warm wood tones — classroom-at-home calm",
  "living-room":
    "simple cozy living room with sofa, soft practical lamp light, clean family space — lived-in, not busy",
  playroom:
    "bright park-adjacent play corner or simple playroom, soft toys blurred far back, cheerful daylight — calm discovery, no clutter chaos",
  "magic-learning-world":
    "simple classroom reading nook with soft daylight and one quiet book accent — grounded real space, never busy magical overload",
  "cta-stage":
    "clean premium purple gradient hold with soft light, deep #461EA8 to #6A2CFF, empty negative space for CTA — no busy stage dressing",
  "dining-table":
    "family dining table at evening, soft overhead light, one notebook open — intimate real home",
  "homework-corner":
    "compact homework corner with wall calendar, pencil cup, soft desk lamp — focused, not cluttered",
  "reading-corner":
    "cozy reading corner with floor cushion, small bookshelf, warm lamp — storytime calm",
  library:
    "quiet children's library aisle with soft daylight and blurred shelves — curious, peaceful",
  school:
    "bright classroom desk row with soft chalkboard blur — school energy without chaos",
  "school-bus":
    "school bus window seat, morning light, soft motion blur outside — journey feeling",
  "science-room":
    "simple school science nook with one globe and soft daylight — curious STEM calm",
  "art-room":
    "art table with crayons and paper, colorful but tidy, soft window light",
  garden:
    "small family garden / balcony plants, soft daylight, green bokeh — outdoor calm",
  park: "neighborhood park path, soft trees, gentle daylight — open and safe",
  "park-bench":
    "park bench under soft trees, golden hour light, quiet parent-child space",
  "indoor-tent":
    "blanket fort / indoor tent with fairy-light glow — playful safe imagination",
  "bedroom-night":
    "child bedroom at night, soft fairy lights, window stars, calm bedtime mood",
  "bedroom-morning":
    "child bedroom in morning light, tidy bed, soft curtains — fresh day energy",
  "morning-breakfast":
    "breakfast table with simple bowls, morning window light — routine warmth",
  "rainy-window":
    "rainy window seat with soft gray light and warm indoor lamp — reflective calm",
  "weekend-picnic":
    "weekend picnic blanket on grass, soft daylight, simple basket — relaxed family joy",
  "doctor-visit":
    "soft clinic waiting-corner look, calm pastel walls — gentle, never clinical fear",
  birthday:
    "simple birthday table with one cake and soft balloons blurred — celebration warmth",
  festival:
    "festival home corner with soft rangoli/lights accents — cultural warmth, not clutter",
  travel:
    "travel day soft suitcase corner / car-seat window light — gentle adventure",
  grandparents:
    "grandparents living room with warm lamp and soft sofa — multi-gen comfort",
  "outdoor-learning":
    "outdoor patio learning table with notebook, soft sun, plants — fresh air focus",
  "nature-walk":
    "nature path with dappled light, leaves soft in background — wonder walk",
  "space-world":
    "gentle storybook night balcony with soft constellation glow — wonder, not sci-fi overload",
  "fantasy-learning-world":
    "soft storybook learning alcove with purple bokeh — grounded fantasy, never busy",
  "healthy-kitchen":
    "healthy kitchen counter with fruit bowl and water bottle, bright daylight",
  "music-room":
    "simple music corner with one keyboard/ukulele soft focus — playful rhythm space",
  "story-castle":
    "storybook reading nook with soft castle pillow accent — imagination without overload",
  "math-laboratory":
    "tidy math desk with blocks/number cards, soft daylight — playful STEM",
  "astro-observatory":
    "night balcony mini observatory vibe with star chart and soft telescope silhouette",
  "ocean-learning-world":
    "soft coastal learning corner with blue daylight and shell accents — calm curiosity",
  "fridge-magnet-wall":
    "kitchen fridge with letter magnets in focus, warm home light — phonics cold open",
  "mirror-practice-nook":
    "bedroom mirror practice nook, soft lamp, calm speech practice mood",
  "calendar-wall":
    "family calendar wall with stickers, soft hallway light — routine clarity",
  "balcony-night":
    "apartment balcony at night, city soft bokeh, star hint — quiet wonder",
};

export function environmentPrompt(env: EnvironmentId): string {
  const look =
    ENV_LOOK[env] ??
    `${env.replace(/-/g, " ")} — premium Pixar family environment, soft cinematic light, uncluttered`;
  return [
    "Vertical 9:16 cinematic still, 1080x1920 framing.",
    look,
    "Foreground, midground, and background layers clearly separated.",
    "Pixar / DreamWorks-TV family short look — filmed depth, not flat AI plate.",
    "No text, no logos, no watermarks, no UI screenshots, no stickers.",
  ].join(" ");
}

export function cinematicPlatePrompt(input: {
  role: ShotRole;
  environment: EnvironmentId;
  character: "amy-ai" | "amy-girl" | "none";
  performance: string;
}): string {
  const env = environmentPrompt(input.environment);
  if (input.character === "none") {
    return [
      env,
      "Emotional parenting moment suitable for a cold-open animated short.",
      "A parent looking at unfinished worksheets while a child looks stuck nearby.",
      "Faces warm and natural, no horror, no distress exaggeration.",
    ].join(" ");
  }

  const amyAi =
    "Official Amy AI character ONLY: floating rounded white soft-polymer body, deep purple AmyAI baseball cap with headphones, large glossy purple eyes, gentle neon purple halo, friendly premium mentor mascot at child height — never a new robot design, never announcer sticker.";
  const amyGirl =
    "Official Amy Girl character ONLY: brown side ponytail with bright yellow bow, plain purple hoodie without logos, dark purple leggings, purple sneakers with white soles, large warm brown eyes, Pixar-quality 3D child with real-child micro-expression — never redesigned, never generic AI cartoon.";

  const characterLine = input.character === "amy-ai" ? amyAi : amyGirl;
  const performance =
    input.performance === "wave" || input.performance === "invite-download"
      ? "Character mid-performance waving one hand toward camera, welcoming mentor smile, body slightly turned, inviting — not hard-sell."
      : input.performance === "point"
        ? "Character pointing gently toward a soft learning cue in midground, guiding attention like a supportive tutor."
        : input.performance === "welcome"
          ? "Character welcoming parents with open friendly mentor pose, looking at camera, guide energy inside the story."
          : "Character alive in the scene with natural micro-pose, breathing, blinks — never stiff cutout.";

  return [
    env,
    characterLine,
    performance,
    "Character stands in the midground of the designed environment — integrated with contact shadow and matching light direction.",
    "Never a floating sticker, never a transparent PNG overlay look, never a slideshow plate.",
    "Camera-ready vertical short-film frame with premium depth and cinematic lighting.",
  ].join(" ");
}
