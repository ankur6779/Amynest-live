/**
 * Character-performance shot plan — continuous Veo episodes, not still montages.
 */

import type { ContentPackage } from "../types/content-package.js";
import type { CreativeCompositionPlan, CompositionShotPlan } from "./types.js";
import { CREATIVE_COMPOSITION_VERSION } from "./types.js";

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

  const shots: CompositionShotPlan[] = [
    {
      id: "shot-hook",
      role: "hook",
      durationSeconds: 4,
      environment: "study-desk",
      kind: "veo-performance",
      caption: hook,
      camera: "push-in",
      character: "amy-girl",
      performance:
        "looks at unfinished worksheets, soft bored expression, blinks, small sigh, glances toward window",
      notes:
        "Cold open with official Amy Girl only — never random children. Continuous Veo performance.",
    },
    {
      id: "shot-amy-host",
      role: "amy-host",
      durationSeconds: 4,
      environment: "living-room",
      kind: "veo-performance",
      caption: host,
      camera: "pan-right",
      character: "amy-ai",
      performance:
        "floats into frame, waves hello, welcomes parents, points toward a tablet on the table, soft smile, blinks",
      notes: "Amy AI host entrance — guide energy, never sticker.",
    },
    {
      id: "shot-amy-girl-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "study-desk",
      kind: "veo-performance",
      caption: learn,
      camera: "push-in",
      character: "amy-girl",
      performance:
        "opens a tablet, taps Study Zone lesson card, eyes light up, small smile, finger taps progress ring briefly visible on device screen",
      notes:
        "App appears only inside the tablet she holds — supporting evidence ≤2s of readable UI.",
    },
    {
      id: "shot-amy-boy-celebrate",
      role: "amy-boy-celebrate",
      durationSeconds: 4,
      environment: "child-bedroom",
      kind: "veo-performance",
      caption: celebrate,
      camera: "orbit-soft",
      character: "amy-boy",
      performance:
        "celebrates finishing a lesson, small jump, fist pump, big smile, looks toward camera warmly",
      notes: "Official Amy Boy only — celebrate progress beat.",
    },
    {
      id: "shot-cta",
      role: "cta",
      durationSeconds: 4,
      environment: "cta-stage",
      kind: "cta-overlay",
      caption: cta,
      camera: "slow-zoom",
      character: "amy-ai",
      performance:
        "waves inviting parents to download, gentle float, eye contact with camera, warm smile",
      notes:
        "Veo Amy AI invite performance + premium CTA badge overlay (not a still montage).",
    },
  ];

  const sum = shots.reduce((a, s) => a + s.durationSeconds, 0);
  void totalDurationSeconds;
  void sum;

  return {
    version: CREATIVE_COMPOSITION_VERSION,
    totalDurationSeconds,
    shots,
    rulesApplied: [
      "three-permanent-characters-only",
      "bible-identity-image-to-video",
      "continuous-veo-performances",
      "no-still-plate-montage",
      "amy-ai-host-every-episode",
      "app-ui-in-device-only",
      "wardrobe-face-proportion-lock",
      "camera-and-character-motion",
    ],
  };
}
