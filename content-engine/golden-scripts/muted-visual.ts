/**
 * Muted Video Test — visual story first, narration second.
 * First 10s (sound off) must tell the emotional story.
 * Last 5s (no narration) must show why AmyNest solved it.
 */

import type { GoldenSeed } from "./seeds.js";
import type {
  GoldenCategory,
  GoldenCharacter,
  MutedVisualPlan,
  MutedVisualShot,
} from "./types.js";

export type { MutedVisualPlan, MutedVisualShot };

export function buildMutedVisualPlan(input: {
  seed: GoldenSeed;
  number: number;
  parentingSituation: string;
  hopeClose: string;
  featureName: string;
  characters: GoldenCharacter[];
}): MutedVisualPlan {
  const { seed, parentingSituation, hopeClose, featureName, characters } = input;
  const cast = characters.join(" + ");
  const open = visualOpen(seed.category, parentingSituation, cast);
  const resolve = visualResolve(seed.category, featureName, hopeClose, cast);

  const first10SecondsMuted: MutedVisualShot[] = [
    {
      window: "0–3s",
      show: open.shot1,
      readsAs: open.read1,
    },
    {
      window: "3–7s",
      show: open.shot2,
      readsAs: open.read2,
    },
    {
      window: "7–10s",
      show: open.shot3,
      readsAs: open.read3,
    },
  ];

  const last5SecondsMuted: MutedVisualShot[] = [
    {
      window: "T−5–T−2s",
      show: resolve.shot1,
      readsAs: resolve.read1,
    },
    {
      window: "T−2–T−0s",
      show: resolve.shot2,
      readsAs: resolve.read2,
    },
  ];

  return {
    principle: "visual-story-first",
    first10SecondsMuted,
    last5SecondsMuted,
    silentStoryBeats: [
      open.silentProp,
      `${cast} expressions carry the emotion — no voice needed`,
      resolve.silentProp,
      "End card appears only after the visual hope lands",
    ],
    showDontTell: [
      "Prefer faces, hands, props, and environment over explanatory VO.",
      "If a line can be removed and the shot still reads, remove the line.",
      "Product UI appears as a consequence of the feeling — never as the cold open.",
      "Last 5 seconds: show the before→after contrast in one glance.",
    ],
    mutedTestSummary: {
      first10: open.summary,
      last5: resolve.summary,
    },
  };
}

/** Hard gate: muted plan must be concrete, product-free in first 10s show text, solution-visible in last 5s. */
export function evaluateMutedVideoTest(plan: MutedVisualPlan): {
  ok: boolean;
  score: number;
  failures: string[];
} {
  const failures: string[] = [];
  const firstShow = plan.first10SecondsMuted.map((s) => s.show).join(" ");
  const lastShow = plan.last5SecondsMuted.map((s) => s.show).join(" ");

  if (plan.first10SecondsMuted.length < 3) {
    failures.push("First 10s needs at least 3 visual beats");
  }
  if (plan.last5SecondsMuted.length < 2) {
    failures.push("Last 5s needs at least 2 visual beats");
  }
  if (/\b(amynest|study zone|speech coach|download|app store|google play)\b/i.test(firstShow)) {
    failures.push("First 10s visuals mention product — muted open must stay emotional");
  }
  if (
    !/\b(smile|sit|glow|check|progress|badge|icon|together|calm|open|app|amy|soften|wonder|brighten|success|unlock|hope|proof|listen|checkmark)\b/i.test(
      lastShow,
    )
  ) {
    failures.push("Last 5s visuals don't clearly show a solved/helped state");
  }
  if (plan.showDontTell.length < 3) {
    failures.push("Missing show-don't-tell direction");
  }
  for (const shot of [...plan.first10SecondsMuted, ...plan.last5SecondsMuted]) {
    if (shot.show.length < 24) failures.push(`Shot too thin: ${shot.window}`);
    if (shot.readsAs.length < 12) failures.push(`readsAs too thin: ${shot.window}`);
  }

  const score = failures.length === 0 ? 96 : Math.max(40, 90 - failures.length * 12);
  return { ok: failures.length === 0 && score >= 90, score, failures };
}

function visualOpen(
  category: GoldenCategory,
  situation: string,
  cast: string,
): {
  shot1: string;
  read1: string;
  shot2: string;
  read2: string;
  shot3: string;
  read3: string;
  silentProp: string;
  summary: string;
} {
  const prop = propForCategory(category);
  return {
    shot1: `Wide/intimate domestic frame: ${prop} in focus; parent’s posture already tired; ${cast.split(" + ")[0] ?? "Amy AI"} not yet the hero — the room is.`,
    read1: "A real parenting night is starting — and it’s heavy.",
    shot2: `Close-up chain: child’s eyes / hands / ${prop} — the situation (“${clip(situation, 64)}”) plays as pictures, not speech.`,
    read2: "We understand the struggle without hearing a word.",
    shot3: `Parent and child miss each other by inches — a look, a turned shoulder, a paused hand. Emotion peaks. Still no product UI.`,
    read3: "The muted viewer feels the problem in their chest.",
    silentProp: `Silent prop: ${prop}`,
    summary: `Muted 0–10s: ${prop} + faces tell the emotional problem before any app appears.`,
  };
}

function visualResolve(
  category: GoldenCategory,
  featureName: string,
  hopeClose: string,
  cast: string,
): {
  shot1: string;
  read1: string;
  shot2: string;
  read2: string;
  silentProp: string;
  summary: string;
} {
  const win = winVisual(category, featureName);
  return {
    shot1: `${cast} in frame: ${win.beforeAfter}. Soft purple light; faces soften; the earlier prop reappears transformed.`,
    read1: "Something helped — you can see the change without narration.",
    shot2: `Hold the hope image (“${clip(hopeClose, 72)}”), then gentle settle into official AmyNest end card (icon + store badges) — hope first, download second.`,
    read2: "AmyNest is why the evening got lighter — shown, not lectured.",
    silentProp: `Silent proof: ${win.proof}`,
    summary: `Muted last 5s: visual before→after + ${featureName} proof, then end card.`,
  };
}

function propForCategory(category: GoldenCategory): string {
  switch (category) {
    case "Learning":
      return "blank workbook / stalled pencil";
    case "Speech":
      return "paused mouth mid-word / quiet mic glow waiting";
    case "Health":
      return "dropped backpack / restless feet / stormy after-school energy";
    case "Games":
      return "glowing screen vs doorway parent / clock tension";
    case "Astro":
      return "phone light on a worried face / child’s photo by the lamp";
    case "Routine Technology":
      return "chaos hallway / shoes / clock that won’t slow down";
    case "Amy Coach":
      return "parent on bed edge / phone face-down";
    case "Audio Lessons":
      return "car window lights / tired little eyes";
    case "Parent Tips":
      return "thumb-scrolling blur / tips that don’t land";
    case "Premium Features":
      return "progress streak meeting a soft lock wall";
    default:
      return "domestic detail that carries the feeling";
  }
}

function winVisual(
  category: GoldenCategory,
  featureName: string,
): { beforeAfter: string; proof: string } {
  switch (category) {
    case "Learning":
      return {
        beforeAfter:
          "child sits back down; a lesson card glows; tiny progress ring fills; parent’s shoulders drop",
        proof: `${featureName} UI glimpse + completed micro-win`,
      };
    case "Speech":
      return {
        beforeAfter:
          "child tries a sound; soft success spark; parent smile replaces worry",
        proof: `${featureName} feedback glow + proud eye contact`,
      };
    case "Health":
      return {
        beforeAfter:
          "body finds stillness or breath; storm energy becomes a grin",
        proof: `${featureName} success beat (balance/breath/calm meter)`,
      };
    case "Games":
      return {
        beforeAfter:
          "play ends cleanly; child accepts the close; parent and child share a look",
        proof: `${featureName} completion + healthy limit moment`,
      };
    case "Astro":
      return {
        beforeAfter:
          "fear-face softens into wonder; parent holds meaning, not dread",
        proof: `${featureName} portrait glow as reflection, not verdict`,
      };
    case "Routine Technology":
      return {
        beforeAfter:
          "chaotic morning resolves into a visible checked plan; breath returns",
        proof: `${featureName} timeline checkmarks landing`,
      };
    case "Amy Coach":
      return {
        beforeAfter:
          "parent’s posture opens; a clear next-step card appears in hand/on screen",
        proof: `${featureName} plan card — understood, then guided`,
      };
    case "Audio Lessons":
      return {
        beforeAfter:
          "child leans into listening; parent’s face unclenches in the quiet",
        proof: `${featureName} waveform + peaceful faces`,
      };
    case "Parent Tips":
      return {
        beforeAfter:
          "one clear tip card replaces scroll chaos; parent nods once",
        proof: `${featureName} single actionable card on screen`,
      };
    case "Premium Features":
      return {
        beforeAfter:
          "the blocked door opens; the habit continues; relief is visible",
        proof: `${featureName} unlock cascade into continued progress`,
      };
    default:
      return {
        beforeAfter: "faces brighten; the hard moment eases",
        proof: `${featureName} gentle success visual`,
      };
  }
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trim()}…`;
}
