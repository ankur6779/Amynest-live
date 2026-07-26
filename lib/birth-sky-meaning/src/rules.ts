/**
 * Deterministic rule definitions — never call an LLM.
 */

import {
  ASPECT_BLOCKS,
  ELEMENT_BLOCKS,
  HOUSE_BLOCKS,
  NAKSHATRA_BLOCKS,
  SIGN_BLOCKS,
  type ConceptBlock,
} from "./catalog.js";
import type { MeaningAstronomyInput, RuleHit } from "./types.js";

function normSign(s: string | undefined | null): string | null {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function hitsFromBlocks(
  blocks: ConceptBlock[],
  opts: { ruleId: string; confidence: number; evidence: string },
): RuleHit[] {
  return blocks.map((b) => ({
    ruleId: opts.ruleId,
    category: b.category,
    conceptId: b.id,
    label: b.label,
    confidence: opts.confidence,
    evidence: opts.evidence,
  }));
}

function planetSign(
  astronomy: MeaningAstronomyInput,
  key: "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn",
  fallback?: string | null,
): string | null {
  return normSign(astronomy[key]?.sign ?? fallback);
}

/** Evaluate all deterministic rules against astronomy input. */
export function evaluateRules(astronomy: MeaningAstronomyInput): RuleHit[] {
  const hits: RuleHit[] = [];

  const sun = planetSign(astronomy, "sun", astronomy.sunSign);
  const moon = planetSign(astronomy, "moon", astronomy.moonSign);
  const rising = normSign(astronomy.risingSign);
  const mercury = planetSign(astronomy, "mercury");
  const venus = planetSign(astronomy, "venus");
  const mars = planetSign(astronomy, "mars");

  if (sun && SIGN_BLOCKS[sun]) {
    hits.push(
      ...hitsFromBlocks(SIGN_BLOCKS[sun], {
        ruleId: `sun_sign_${sun}`,
        confidence: 0.92,
        evidence: `sun_sign=${sun}`,
      }),
    );
  }
  if (moon && SIGN_BLOCKS[moon]) {
    // Moon rules skew emotional / comfort categories — same blocks, slightly lower weight
    hits.push(
      ...hitsFromBlocks(SIGN_BLOCKS[moon], {
        ruleId: `moon_sign_${moon}`,
        confidence: 0.9,
        evidence: `moon_sign=${moon}`,
      }),
    );
  }
  if (rising && SIGN_BLOCKS[rising]) {
    hits.push(
      ...hitsFromBlocks(SIGN_BLOCKS[rising], {
        ruleId: `rising_sign_${rising}`,
        confidence: 0.78,
        evidence: `rising_sign=${rising}`,
      }),
    );
  }
  if (mercury && SIGN_BLOCKS[mercury]) {
    const focused = SIGN_BLOCKS[mercury].filter((b) =>
      ["learningStyle", "communicationStyle", "curiosityPattern", "attentionPattern"].includes(
        b.category,
      ),
    );
    hits.push(
      ...hitsFromBlocks(focused.length ? focused : SIGN_BLOCKS[mercury].slice(0, 2), {
        ruleId: `mercury_sign_${mercury}`,
        confidence: 0.85,
        evidence: `mercury_sign=${mercury}`,
      }),
    );
  }
  if (venus && SIGN_BLOCKS[venus]) {
    const focused = SIGN_BLOCKS[venus].filter((b) =>
      ["socialStyle", "creativeStyle", "comfortNeeds"].includes(b.category),
    );
    hits.push(
      ...hitsFromBlocks(focused.length ? focused : SIGN_BLOCKS[venus].slice(0, 2), {
        ruleId: `venus_sign_${venus}`,
        confidence: 0.8,
        evidence: `venus_sign=${venus}`,
      }),
    );
  }
  if (mars && SIGN_BLOCKS[mars]) {
    const focused = SIGN_BLOCKS[mars].filter((b) =>
      ["motivationStyle", "attentionPattern", "strengths"].includes(b.category),
    );
    hits.push(
      ...hitsFromBlocks(focused.length ? focused : SIGN_BLOCKS[mars].slice(0, 2), {
        ruleId: `mars_sign_${mars}`,
        confidence: 0.82,
        evidence: `mars_sign=${mars}`,
      }),
    );
  }

  const houses = astronomy.planetHouseMap ?? {};
  for (const [body, house] of Object.entries(houses)) {
    if (typeof house !== "number" || house < 1 || house > 12) continue;
    if (!["sun", "moon", "mercury", "venus", "mars"].includes(body)) continue;
    const blocks = HOUSE_BLOCKS[house];
    if (!blocks) continue;
    hits.push(
      ...hitsFromBlocks(blocks, {
        ruleId: `${body}_house_${house}`,
        confidence: body === "sun" || body === "moon" ? 0.75 : 0.65,
        evidence: `${body}_house=${house}`,
      }),
    );
  }

  for (const asp of astronomy.aspects ?? []) {
    const a = String(asp.planetA).toLowerCase();
    const b = String(asp.planetB).toLowerCase();
    const kind = String(asp.aspect).toLowerCase();
    const key = `${[a, b].sort().join("-")}-${kind}`;
    // Also try directed keys used in catalog
    const candidates = [
      key,
      `${a}-${b}-${kind}`,
      `${b}-${a}-${kind}`,
    ];
    for (const c of candidates) {
      const blocks = ASPECT_BLOCKS[c];
      if (!blocks) continue;
      const conf = Math.min(
        0.88,
        0.55 + (typeof asp.exactness === "number" ? asp.exactness * 0.3 : 0.15),
      );
      hits.push(
        ...hitsFromBlocks(blocks, {
          ruleId: `aspect_${c}`,
          confidence: conf,
          evidence: `aspect=${a}_${kind}_${b}`,
        }),
      );
      break;
    }
  }

  const element = astronomy.westernBirthProfile?.dominantElement?.toLowerCase();
  if (element && ELEMENT_BLOCKS[element]) {
    hits.push(
      ...hitsFromBlocks(ELEMENT_BLOCKS[element], {
        ruleId: `dominant_element_${element}`,
        confidence: 0.7,
        evidence: `dominant_element=${element}`,
      }),
    );
  }

  const nak =
    astronomy.moonProfile?.nakshatra ??
    astronomy.nakshatra?.name ??
    null;
  if (nak && NAKSHATRA_BLOCKS[nak]) {
    hits.push(
      ...hitsFromBlocks(NAKSHATRA_BLOCKS[nak], {
        ruleId: `moon_nakshatra_${nak.replace(/\s+/g, "_")}`,
        confidence: 0.72,
        evidence: `moon_nakshatra=${nak}`,
      }),
    );
  }

  const maha = astronomy.dasha?.mahadasha?.lord;
  if (maha) {
    hits.push({
      ruleId: `mahadasha_${maha}`,
      category: "motivationStyle",
      conceptId: `dasha_${maha.toLowerCase()}`,
      label: `${maha.toLowerCase()} period theme`,
      confidence: 0.55,
      evidence: `current_mahadasha=${maha}`,
    });
  }

  // Moon phase soft patterns
  const phase = (astronomy.moonPhase ?? "").toLowerCase();
  if (phase.includes("full")) {
    hits.push({
      ruleId: "moon_phase_full",
      category: "emotionalPattern",
      conceptId: "heightened_feelings",
      label: "heightened feelings",
      confidence: 0.5,
      evidence: `moon_phase=${astronomy.moonPhase}`,
    });
  } else if (phase.includes("new")) {
    hits.push({
      ruleId: "moon_phase_new",
      category: "curiosityPattern",
      conceptId: "fresh_starts",
      label: "fresh starts",
      confidence: 0.5,
      evidence: `moon_phase=${astronomy.moonPhase}`,
    });
  }

  return hits;
}

/** Known contradictory concept pairs (same category). */
export const CONFLICT_PAIRS: Array<[string, string]> = [
  ["fast_pace", "gentle_pace"],
  ["multi_interest", "focus_intensity"],
  ["visibility", "privacy_needs"],
  ["action_first", "slow_warm"],
  ["inner_tension", "easy_flow"],
];
