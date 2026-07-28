/**
 * Per-scene lighting mood + color temperature from story intent.
 */

import type {
  ColorTemperature,
  DirectedLightingPlan,
  DirectorBeatRole,
  LightingMood,
  ScenePacing,
} from "./types.js";

export function planLightingForScene(input: {
  role: DirectorBeatRole;
  category: string;
}): DirectedLightingPlan {
  const base = ROLE_LIGHTING[input.role];
  return tintForCategory(base, input.category, input.role);
}

export function pacingForRole(role: DirectorBeatRole): ScenePacing {
  switch (role) {
    case "hook":
      return "urgent";
    case "problem":
      return "measured";
    case "emotion":
      return "lingering";
    case "feature":
      return "measured";
    case "transformation":
      return "celebratory";
    case "cta":
    case "end-card":
      return "settle";
    case "bridge":
      return "measured";
  }
}

const ROLE_LIGHTING: Record<DirectorBeatRole, DirectedLightingPlan> = {
  hook: {
    mood: "warm-intimate",
    colorTemperature: "warm-golden",
    keyLight: "Soft window key from camera-left; slight under-exposure for tension",
    notes: "Intimate parenting cold-open — readable muted, never gloomy horror",
  },
  problem: {
    mood: "warm-intimate",
    colorTemperature: "warm-golden",
    keyLight: "Same window key; fill slightly lower to keep struggle honest",
    notes: "Keep exposure family continuous with hook",
  },
  emotion: {
    mood: "hopeful-sunrise",
    colorTemperature: "warm-golden",
    keyLight: "Key lifts gently; purple rim begins as hope cue",
    notes: "Hope arrives as light, not as a product logo",
  },
  feature: {
    mood: "soft-daylight",
    colorTemperature: "neutral-day",
    keyLight: "Clean readable light on AmyNest UI as a story prop",
    notes: "UI must feel embedded in the room — never a floating PowerPoint",
  },
  transformation: {
    mood: "hopeful-sunrise",
    colorTemperature: "purple-accent-warm",
    keyLight: "Brighter overall; warm skin + soft purple accents",
    notes: "Room opens optically — same layout, more breath",
  },
  cta: {
    mood: "soft-daylight",
    colorTemperature: "purple-accent-warm",
    keyLight: "Even, inviting light for Amy AI and soft CTA",
    notes: "No hard sell glare",
  },
  "end-card": {
    mood: "end-card-glow",
    colorTemperature: "purple-accent-warm",
    keyLight: "Centered brand glow; badges crisp and legible",
    notes: "Official end card lighting — hold steady",
  },
  bridge: {
    mood: "soft-daylight",
    colorTemperature: "neutral-day",
    keyLight: "Match previous scene exposure",
    notes: "Bridge without lighting reset",
  },
};

function tintForCategory(
  plan: DirectedLightingPlan,
  category: string,
  role: DirectorBeatRole,
): DirectedLightingPlan {
  if (/Astro/i.test(category) && role !== "end-card" && role !== "feature") {
    return {
      ...plan,
      mood: role === "emotion" || role === "transformation" ? "cosmic-soft" : "calm-twilight",
      colorTemperature: "purple-accent-warm",
      notes: `${plan.notes} Astro: magical but calm.`,
    };
  }
  if (/Games|Creativity/i.test(category) && (role === "hook" || role === "transformation")) {
    return {
      ...plan,
      mood: "playful-rim",
      notes: `${plan.notes} Playful rim — tasteful, not chaotic.`,
    };
  }
  if (/Health|Routine/i.test(category)) {
    return {
      ...plan,
      mood: role === "emotion" ? "hopeful-sunrise" : "soft-daylight",
      colorTemperature: "neutral-day",
      notes: `${plan.notes} Fresh morning reassurance.`,
    };
  }
  return plan;
}

export function lightingMoodLabel(mood: LightingMood): string {
  return mood.replace(/-/g, " ");
}

export function colorTempLabel(temp: ColorTemperature): string {
  return temp.replace(/-/g, " ");
}
