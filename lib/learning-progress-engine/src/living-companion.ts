/**
 * Phase 5 — Living Companion lines.
 *
 * Generates short, cross-module aware text lines for Amy to surface across
 * the app (Parent Hub, Study Zone, Speech Coach, Worksheets, etc).
 *
 * IMPORTANT: this module derives everything from existing inputs
 * (LearningProgressProfile + LearningMemory). It does NOT introduce new
 * tracking or progression state.
 */

import type { LearningProgressProfile, SectionKey } from "./types";
import type { LearningMemory } from "./learning-memory";

export type LivingCompanionSurface =
  | "parent-hub"
  | "study"
  | "phonics"
  | "speech"
  | "worksheets"
  | "growth"
  | "tutor";

export interface LivingCompanionLine {
  id: string;
  tone: "celebrate" | "encourage" | "notice" | "gentle";
  text: string;
}

const SECTION_LABEL: Record<SectionKey, string> = {
  phonics: "phonics",
  math: "math",
  speech: "speech",
  stories: "stories",
  lifeSkills: "life skills",
  puzzles: "puzzles",
  worksheets: "worksheets",
  spelling: "spelling",
  memory: "memory games",
  creativity: "creativity",
};

const SURFACE_SECTION: Partial<Record<LivingCompanionSurface, SectionKey>> = {
  study: "math",
  phonics: "phonics",
  speech: "speech",
  worksheets: "worksheets",
};

function sectionDisplay(section: SectionKey | null | undefined): string | null {
  if (!section) return null;
  return SECTION_LABEL[section] ?? null;
}

/**
 * Build one short Amy line for a given surface that acknowledges activity
 * happening in OTHER modules. Returns null when there isn't a confident,
 * non-noisy thing to say (Amy stays quiet by default).
 */
export function buildLivingCompanionLine(input: {
  surface: LivingCompanionSurface;
  profile: LearningProgressProfile;
  memory: LearningMemory;
  childName?: string;
}): LivingCompanionLine | null {
  const { surface, profile, memory } = input;
  const name = input.childName ?? "your child";
  const currentSection = SURFACE_SECTION[surface];
  const strongest = sectionDisplay(memory.strongestCategory);
  const weakest = sectionDisplay(memory.weakestCategory);

  // Surface-specific cross-module nudges first.
  if (surface === "study" && strongest && memory.strongestCategory !== "math") {
    return {
      id: "cross-strongest",
      tone: "celebrate",
      text: `${name}'s ${strongest} confidence is growing — Amy is weaving that into today's math.`,
    };
  }

  if (surface === "speech" && profile.streakDays >= 3) {
    return {
      id: "cross-streak",
      tone: "celebrate",
      text: `${profile.streakDays}-day learning rhythm is still glowing — speech feels easier when other muscles are warm.`,
    };
  }

  if (surface === "phonics" && memory.strugglingSkills.includes("phonics_blending")) {
    return {
      id: "cross-blending",
      tone: "gentle",
      text: "Blending is the focus this week — Amy will slow down a little and celebrate small wins.",
    };
  }

  if (
    surface === "worksheets" &&
    strongest &&
    currentSection !== memory.strongestCategory
  ) {
    return {
      id: "cross-strongest-ws",
      tone: "notice",
      text: `Amy picked sheets that build on ${name}'s strong ${strongest} foundation.`,
    };
  }

  if (surface === "growth" && profile.masteryScore >= 40 && profile.streakDays >= 3) {
    return {
      id: "growth-momentum",
      tone: "celebrate",
      text: `Beautiful momentum — ${name} is learning across more than one area each week.`,
    };
  }

  if (surface === "parent-hub" && memory.sessionStreakDays >= 5) {
    return {
      id: "hub-rhythm",
      tone: "celebrate",
      text: `Amy noticed ${name} has been showing up consistently — that rhythm is doing the quiet work of learning.`,
    };
  }

  if (surface === "parent-hub" && weakest && strongest && strongest !== weakest) {
    return {
      id: "hub-balance",
      tone: "notice",
      text: `${name} is strongest in ${strongest} right now — Amy is gently weaving in a little more ${weakest}.`,
    };
  }

  if (surface === "tutor" && memory.favoriteModules.length > 0) {
    return {
      id: "tutor-favorites",
      tone: "encourage",
      text: `Amy remembers what ${name} loves — answers stay warm and playful, never tested.`,
    };
  }

  // Default gentle presence — only on the hub so other surfaces stay quiet.
  if (surface === "parent-hub") {
    return {
      id: "hub-default",
      tone: "gentle",
      text: `Amy is keeping a quiet eye on ${name}'s growth — no pressure, just gentle support.`,
    };
  }

  return null;
}

/** Build several lines (used by AI tutor proactive surface). */
export function buildLivingCompanionLines(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  childName?: string;
  surfaces?: LivingCompanionSurface[];
}): LivingCompanionLine[] {
  const surfaces = input.surfaces ?? ["parent-hub", "study", "speech", "phonics"];
  const lines: LivingCompanionLine[] = [];
  const seen = new Set<string>();
  for (const surface of surfaces) {
    const line = buildLivingCompanionLine({
      surface,
      profile: input.profile,
      memory: input.memory,
      childName: input.childName,
    });
    if (line && !seen.has(line.id)) {
      lines.push(line);
      seen.add(line.id);
    }
  }
  return lines.slice(0, 3);
}
