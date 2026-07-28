/**
 * Visual continuity bible + automatic continuity-break rejection.
 */

import { getBrandIdentityKit } from "../brand/identity.js";
import type { ComposerSceneIntent } from "../scene-composer/types.js";
import type { DirectedScenePlan, VisualContinuityBible } from "./types.js";

export function buildVisualContinuityBible(input: {
  category: string;
  intents: ComposerSceneIntent[];
}): VisualContinuityBible {
  const kit = getBrandIdentityKit();
  const look = continuityLook(input.category);
  const characters = uniqueCharacters(input.intents);

  return {
    timeOfDay: look.timeOfDay,
    roomLayout: look.roomLayout,
    wardrobe: `Official locked wardrobe for ${characters.join(", ") || "Amy AI"} — never redesign between scenes`,
    lightingLanguage: look.lightingLanguage,
    palette: `${kit.colors.primary} / ${kit.colors.deepPurple} / ${kit.colors.lavender} with warm skin tones`,
    eyeLine: "Consistent eye-line height across cuts; match previous scene looking direction",
    cameraDirection: "Prefer continuing screen direction L→R unless intentionally reversing for reveal",
    objectPlacement:
      "Props (notebook, pencil, device, progress ring) stay in the same relative place unless a micro-action moves them",
    characterPositions:
      "Preserve relative blocking: parent left/child right (or established reverse) until transformation opens the frame",
  };
}

function continuityLook(category: string): {
  timeOfDay: string;
  roomLayout: string;
  lightingLanguage: string;
} {
  if (/Astro/i.test(category)) {
    return {
      timeOfDay: "Soft evening twilight — same sky language across the short",
      roomLayout: "Cozy bedroom / quiet corner with soft cosmic window light",
      lightingLanguage: "Calm cosmic key + purple rim; never harsh neon sci-fi",
    };
  }
  if (/Health|Nutrition|Routine/i.test(category)) {
    return {
      timeOfDay: "Clean morning light — consistent throughout",
      roomLayout: "Bright home routine space; uncluttered table / sink / checklist zone",
      lightingLanguage: "Fresh morning key; soft greens and lavenders",
    };
  }
  if (/Games|Creativity/i.test(category)) {
    return {
      timeOfDay: "Playful afternoon indoor light",
      roomLayout: "Creative play corner; toys as story props, not clutter",
      lightingLanguage: "Playful rim + brand purple accents",
    };
  }
  return {
    timeOfDay: "Soft daytime indoor light — same window direction every scene",
    roomLayout: "Warm home learning nook: table, chair, soft window on camera-left",
    lightingLanguage: "Soft cinematic key + gentle purple rim; warm skin, consistent exposure",
  };
}

function uniqueCharacters(intents: ComposerSceneIntent[]): string[] {
  const set = new Set<string>();
  for (const intent of intents) {
    for (const id of intent.characters) set.add(id);
  }
  return [...set];
}

export function continuityNotesForScene(
  bible: VisualContinuityBible,
  index: number,
  total: number,
): string[] {
  const notes = [
    `Time of day lock: ${bible.timeOfDay}`,
    `Room layout lock: ${bible.roomLayout}`,
    `Wardrobe lock: ${bible.wardrobe}`,
    `Lighting lock: ${bible.lightingLanguage}`,
    `Eye-line: ${bible.eyeLine}`,
    `Objects: ${bible.objectPlacement}`,
  ];
  if (index === 0) {
    notes.push("Establish blocking and window direction for all later scenes.");
  } else if (index === total - 1) {
    notes.push("Settle continuity into branded end card — no new wardrobe or room redesign.");
  } else {
    notes.push("Match previous scene identity, lighting, and screen direction.");
  }
  return notes;
}

export function findContinuityBreaks(
  scenes: DirectedScenePlan[],
  bible: VisualContinuityBible,
): Array<{ sceneId: string; reason: string }> {
  const breaks: Array<{ sceneId: string; reason: string }> = [];
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1]!;
    const cur = scenes[i]!;
    if (prev.lighting.mood !== cur.lighting.mood) {
      // Allowed mood evolution — only reject if end-card jumps to unrelated play mood incorrectly
      if (
        cur.role !== "end-card" &&
        prev.role !== "end-card" &&
        isHarshLightingJump(prev.lighting.mood, cur.lighting.mood)
      ) {
        breaks.push({
          sceneId: cur.sceneId,
          reason: `Harsh lighting jump ${prev.lighting.mood} → ${cur.lighting.mood}; keep ${bible.lightingLanguage}`,
        });
      }
    }
    if (
      cur.role !== "end-card" &&
      prev.blocking.wardrobeLock !== cur.blocking.wardrobeLock
    ) {
      breaks.push({
        sceneId: cur.sceneId,
        reason: "Wardrobe lock changed between scenes — identity/wardrobe drift",
      });
    }
    if (
      cur.microActions.length === 0 &&
      cur.role !== "end-card" &&
      cur.camera.movement === "static-hold" &&
      cur.pacing === "settle"
    ) {
      breaks.push({
        sceneId: cur.sceneId,
        reason: "Static settle with no micro-action reads as a slideshow slide",
      });
    }
  }
  return breaks;
}

function isHarshLightingJump(a: string, b: string): boolean {
  const pairs: Array<[string, string]> = [
    ["warm-intimate", "playful-rim"],
    ["calm-twilight", "playful-rim"],
    ["hopeful-sunrise", "cosmic-soft"],
  ];
  return pairs.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}
