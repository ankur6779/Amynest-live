/**
 * Character-performance shot plan — continuous Veo episodes, not still montages.
 * Cinematic Realism Program: mentor Amy, lip ownership, child acting, filmed cameras.
 */

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

  const shots: CompositionShotPlan[] = [
    {
      id: "shot-hook",
      role: "hook",
      durationSeconds: 4,
      environment: "study-desk",
      kind: "veo-performance",
      caption: hook,
      camera: "close-up",
      character: "amy-girl",
      speechMode: "reacting",
      spokenLine: hook,
      emotionBeat:
        "Quiet homework struggle — brow softens with worry, then a small hopeful glance",
      eyeLine:
        "Down into the notebook, then briefly toward the empty chair / doorway where help might come",
      interaction:
        "Alone at the desk for the cold open — the room feels like a real morning, waiting for a mentor",
      performance: tutor
        ? "sits at homework desk mid-struggle, soft frustrated then thoughtful expression, natural blinks, tiny sigh, pencil pauses, glances toward the doorway hoping for help — living child, not a frozen cartoon"
        : "looks at unfinished worksheets, soft bored then lonely expression, natural blinks, small sigh, pencil twirl, glances toward window light — living child energy",
      notes:
        "Cold open: Amy Girl only. Emotion first 3 seconds. Listening/reacting mouth — not random lip flaps.",
    },
    {
      id: "shot-amy-host",
      role: "amy-host",
      durationSeconds: 4,
      environment: "study-desk",
      kind: "veo-performance",
      caption: host,
      camera: "tracking",
      character: "amy-ai",
      speechMode: "speaking",
      spokenLine: host,
      emotionBeat: "Warm mentor reassurance — calm smile, never lecture",
      eyeLine:
        "Toward the child study seat / off-screen Amy Girl eye-line, then soft glance to camera as invite",
      interaction: tutor
        ? "Amy AI enters the study space at child height, kneels or leans beside the homework desk like a supportive tutor — lives in the story, not a voice-over from outside"
        : "Amy AI enters the family learning space at child height, kneels or sits beside the desk, supportive mentor presence inside the room",
      performance: tutor
        ? "enters frame at child height, kneels beside the study desk, warm smile, mouths a gentle help offer, points softly to the open notebook then a tablet showing tutor modes, blinks, open-palm reassure gesture — mentor, not announcer"
        : "enters frame at child height, kneels beside the desk, waves hello warmly, mouths a welcoming line, points toward a tablet on the table, soft smile, blinks — guide inside the story",
      notes:
        "Amy AI mentor entrance IN the study world. Speaking lips match host beat. No floating VO sticker.",
    },
    {
      id: "shot-amy-girl-learn",
      role: "amy-girl-learn",
      durationSeconds: 6,
      environment: "study-desk",
      kind: "veo-performance",
      caption: learn,
      camera: "over-shoulder",
      character: "amy-girl",
      speechMode: "listening",
      spokenLine: learn,
      emotionBeat:
        "Curiosity → understanding — eyes brighten, shoulders relax, small real smile",
      eyeLine:
        "Between the tablet screen and the mentor space beside her (Amy AI presence at child height)",
      interaction: tutor
        ? "Works with Amy AI as an in-room mentor: looks to Amy's eye-line, listens, then taps Doubt/Practice on the tablet; they share the learning moment"
        : "Engages with the lesson on her tablet while glancing toward Amy AI's supportive presence beside the desk",
      performance: tutor
        ? "over-shoulder into the tablet showing Amy AI Tutor chat, listens with attentive eyes, small nods, soft smile as understanding lands, taps Doubt then Practice, brief readable chat UI on device only — reacts like a real child learning with a mentor"
        : "over-shoulder into the tablet Study Zone lesson card, listens and thinks, eyes light up, small smile, finger taps progress ring briefly visible on device — curious real-child focus",
      notes:
        "Listening lips + mentor relationship. App only on device ≤2s. Over-shoulder cinematic.",
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
      speechMode: "speaking",
      spokenLine: celebrate,
      emotionBeat: "Joyful pride — celebrate with someone, not alone at camera",
      eyeLine:
        "Toward off-screen Amy Girl / Amy AI to share the win, then warm look to camera",
      interaction:
        "Celebrates WITH the story family — looks to partners, smiles, invites them into the joy; discovery energy, not product posing",
      performance: tutor
        ? "celebrates understanding after a doubt clears — small jump, fist pump, laughs with eyes, looks to off-screen sister/mentor to share the win, mouths a happy line, natural blinks and bounce"
        : "celebrates finishing a lesson — small jump, fist pump, big genuine smile, looks to off-screen family to share joy, mouths a hopeful line, living playful child motion",
      notes:
        "Amy Boy as real celebrating child. Speaking lips on hope beat. Shared joy eye-line.",
    },
    {
      id: "shot-cta",
      role: "cta",
      durationSeconds: 4,
      environment: "cta-stage",
      kind: "cta-overlay",
      caption: cta,
      camera: "dolly",
      character: "amy-ai",
      speechMode: "speaking",
      spokenLine: cta,
      emotionBeat: "Warm invitation — hope already earned",
      eyeLine: "Direct warm eye contact with the parent viewer",
      interaction:
        "Still the same mentor from the story — inviting parents to continue the journey, never hard-sell announcer",
      performance:
        "slow dolly invite: mouths Download AmyNest AI warmly, gentle wave, soft float, eye contact, mentor smile — same Amy who helped inside the story",
      notes:
        "Veo Amy AI invite + premium CTA overlay. Speaking lips on CTA line.",
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
      "amy-ai-mentor-inside-story",
      "lip-ownership-per-beat",
      "real-child-micro-acting",
      "filmed-camera-language",
      "character-relationship-blocking",
      "app-ui-in-device-only",
      "wardrobe-face-proportion-lock",
      "camera-and-character-motion",
      "720p-cost-neutral-direction",
    ],
  };
}
