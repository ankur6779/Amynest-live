import { buildBrandVisualPromptBlock, getBrandIdentityKit } from "../../../brand/index.js";
import type { ContentPackage } from "../../../types/content-package.js";
import type { ScenePlan, StoryboardPackage } from "../../../types/storyboard.js";

export interface VeoPromptInput {
  content?: ContentPackage;
  storyboard?: StoryboardPackage;
  scene?: ScenePlan;
  /** Override / base scene description. */
  sceneDescription?: string;
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9";
  brandCta?: string;
}

export interface VeoPromptResult {
  prompt: string;
  negativePrompt: string;
  parts: VeoPromptParts;
}

export interface VeoPromptParts {
  sceneDescription: string;
  cameraMovement: string;
  lighting: string;
  mood: string;
  colorPalette: string;
  subject: string;
  action: string;
  composition: string;
  lensStyle: string;
  animationStyle: string;
  duration: string;
  aspectRatio: string;
  safetyConstraints: string;
}

/**
 * Build a cinematic, non-generic Veo prompt from storyboard/content context.
 */
export function buildVeoPrompt(input: VeoPromptInput): VeoPromptResult {
  const scene = input.scene;
  const content = input.content;
  const storyboard = input.storyboard;

  const sceneDescription =
    input.sceneDescription?.trim() ||
    scene?.background?.trim() ||
    content?.story?.trim() ||
    "A warm modern family home at sunrise, AmyNest parenting moment.";

  const cameraMovement =
    mapCamera(scene?.camera) ||
    "Gentle cinematic dolly-in, smooth stabilized motion, subtle parallax.";

  const lighting =
    "Soft golden-hour cinematic lighting, warm key light from a window, gentle fill, natural skin tones, no harsh flash.";

  const mood =
    scene?.emotion === "energized"
      ? "Hopeful energy with calm confidence"
      : scene?.emotion === "confident"
        ? "Warm trust and confident parenting"
        : scene?.emotion === "hopeful"
          ? "Quiet hope and pride"
          : scene?.emotion === "curious"
            ? "Gentle curiosity and connection"
            : "Warm, premium, emotionally safe parenting atmosphere";

  const kit = getBrandIdentityKit();
  const colorPalette =
    storyboard?.branding.colors
      ? `Primary ${storyboard.branding.colors.primary}, secondary ${storyboard.branding.colors.secondary}, accent ${storyboard.branding.colors.accent}, AmyNest purple system, soft neutrals, warm highlights`
      : `AmyNest purple ${kit.colors.primary} / ${kit.colors.deepPurple}, gold ${kit.colors.secondary}, soft lavender, natural skin tones`;

  const brandVisual = buildBrandVisualPromptBlock({
    category: content?.topic.category,
    title: content?.topic.title,
    keywords: content?.topic.keywords,
  });

  const subject =
    content?.topic.title
      ? `Official AmyNest branded story around "${content.topic.title}" with locked AmyNest characters only`
      : "Official AmyNest characters in a calm morning routine with the AmyNest app";

  const action =
    scene?.voice?.trim() ||
    content?.hook?.trim() ||
    "The child happily completes a simple morning habit on a tablet while a parent watches proudly nearby.";

  const composition =
    input.aspectRatio === "9:16"
      ? "Vertical 9:16 framing, subject centered with safe margins for captions, shallow depth of field, premium mobile-ad composition"
      : "Widescreen cinematic framing with leading room and balanced negative space";

  const lensStyle =
    "35mm cinematic lens look, soft bokeh, subtle filmic contrast, high-end commercial grade";

  const animationStyle =
    "Premium Pixar-quality realism, natural facial micro-expressions, gentle motion, subtle floating dust motes / light particles, no jitter, no morphing artifacts";

  const duration = `${input.durationSeconds} seconds continuous shot`;
  const aspectRatio = input.aspectRatio;

  const safetyConstraints = [
    "Family-safe content only.",
    "No medical claims, no fear tactics, no violence, no suggestive content.",
    "No readable competitor logos.",
    "No distorted faces or unnatural anatomy.",
    "No on-screen text except a clean end-card moment if naturally framed.",
    "Keep depictions wholesome, respectful, and age-appropriate.",
    "Never redesign AmyNest characters or invent new mascots.",
    "Never recreate the AmyNest app icon with generative AI.",
    brandVisual,
  ].join(" ");

  const brandCta =
    input.brandCta?.trim() ||
    content?.cta?.trim() ||
    storyboard?.branding.cta?.trim() ||
    "Build Better Habits Every Day";

  const parts: VeoPromptParts = {
    sceneDescription,
    cameraMovement,
    lighting,
    mood,
    colorPalette,
    subject,
    action,
    composition,
    lensStyle,
    animationStyle,
    duration,
    aspectRatio,
    safetyConstraints,
  };

  const prompt = [
    `Cinematic AmyNest advertisement scene.`,
    `Scene: ${parts.sceneDescription}`,
    `Subject: ${parts.subject}`,
    `Action: ${parts.action}`,
    `Camera: ${parts.cameraMovement}`,
    `Lighting: ${parts.lighting}`,
    `Mood: ${parts.mood}`,
    `Color palette: ${parts.colorPalette}`,
    `Composition: ${parts.composition}`,
    `Lens: ${parts.lensStyle}`,
    `Animation style: ${parts.animationStyle}`,
    `Duration: ${parts.duration}`,
    `Aspect ratio: ${parts.aspectRatio}`,
    `Brand finish: end with a premium AmyNest logo moment and the line "${brandCta}".`,
    `Safety: ${parts.safetyConstraints}`,
  ].join("\n");

  const negativePrompt = [
    "blurry",
    "low resolution",
    "distorted faces",
    "extra limbs",
    "text spam",
    "watermark clutter",
    "horror",
    "violence",
    "medical procedure",
    "scary children",
    "uncanny valley",
    "shaky cam",
    "over-saturated neon",
  ].join(", ");

  return { prompt, negativePrompt, parts };
}

/** Canonical production validation prompt (10s story / 8s Veo request). */
export function buildAmyNestTestVeoPrompt(options: {
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9";
}): VeoPromptResult {
  return buildVeoPrompt({
    durationSeconds: options.durationSeconds,
    aspectRatio: options.aspectRatio,
    brandCta: "Build Better Habits Every Day",
    sceneDescription:
      "A warm sunrise fills a modern child's bedroom. Soft curtains glow. A smiling young child happily completes a morning routine using the AmyNest app on a tablet while a mother watches proudly from nearby. Subtle floating dust particles in golden light. Premium Pixar-quality realism with natural facial expressions.",
  });
}

function mapCamera(camera?: ScenePlan["camera"]): string | undefined {
  if (!camera) return undefined;
  switch (camera) {
    case "Push":
      return "Gentle camera dolly-in / push toward the subject";
    case "Pull":
      return "Gentle camera pull-out revealing the room";
    case "Pan Left":
      return "Slow cinematic pan left";
    case "Pan Right":
      return "Slow cinematic pan right";
    case "Zoom In":
      return "Subtle optical zoom-in";
    case "Zoom Out":
      return "Subtle optical zoom-out";
    case "Tilt":
      return "Soft cinematic tilt";
    case "Hold":
      return "Locked hold with micro-breathing motion";
    case "Static":
      return "Locked-off cinematic static frame with micro-parallax";
    default:
      return `Camera move: ${camera}`;
  }
}
