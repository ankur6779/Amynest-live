/**
 * Full concept ownership registry — one owner, reinforcement surfaces, assessment paths.
 */
import {
  BLEND_WORD_IDS,
  CVCC_WORD_IDS,
  CVC_WORDS,
  PHONICS_CURRICULUM_WORD_BANK,
} from "@workspace/phonics-sounds";
import {
  PHONICS_CONTENT_OWNERSHIP,
  type AssessmentSurface,
  type ContentOwnership,
  type ReinforcementSurface,
} from "./content-ownership.js";
import {
  DIGRAPH_IDS,
  requiredLevelForSymbol,
  SIGHT_WORDS,
} from "./level-gating.js";
import {
  PHONICS_CURRICULUM_LEVELS,
  WORD_FAMILY_ANCHOR_WORDS,
  WORD_FAMILY_IDS,
} from "./levels.js";
import type { CurriculumLevel } from "./types.js";

export interface ConceptRecord {
  id: string;
  ownerLevel: CurriculumLevel;
  reinforcementLocations: ReinforcementSurface[];
  assessmentLocation: AssessmentSurface[];
}

const LEVEL_TO_CONCEPT_KEY: Record<
  CurriculumLevel,
  keyof typeof PHONICS_CONTENT_OWNERSHIP
> = {
  1: "letter_gpc",
  2: "cvc_decode",
  3: "word_family",
  4: "digraph",
  5: "consonant_blend",
  6: "cvcc",
  7: "sight_word",
};

function ownershipForLevel(level: CurriculumLevel): ContentOwnership {
  const key = LEVEL_TO_CONCEPT_KEY[level];
  if (level === 7) {
    return PHONICS_CONTENT_OWNERSHIP.fluency_sentence!;
  }
  return PHONICS_CONTENT_OWNERSHIP[key]!;
}

function recordFromLevel(id: string, level: CurriculumLevel): ConceptRecord {
  const o = ownershipForLevel(level);
  return {
    id,
    ownerLevel: level,
    reinforcementLocations: [...o.reinforcedIn],
    assessmentLocation: [...o.assessedIn],
  };
}

/** All teachable symbols with canonical ownership metadata. */
export function buildConceptRegistry(): ConceptRecord[] {
  const records: ConceptRecord[] = [];
  const seen = new Set<string>();

  const add = (id: string, level: CurriculumLevel) => {
    const key = id.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    records.push(recordFromLevel(key, level));
  };

  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    add(letter, 1);
  }

  for (const w of CVC_WORDS.map((e) => e.word)) {
    add(w, 2);
  }

  for (const id of WORD_FAMILY_IDS) {
    add(id, 3);
    add(`pattern:${id}`, 3);
  }
  for (const anchor of Object.values(WORD_FAMILY_ANCHOR_WORDS)) {
    add(anchor, 2);
  }

  for (const id of DIGRAPH_IDS) {
    add(id, 4);
  }
  const l4 = PHONICS_CURRICULUM_LEVELS.find((l) => l.level === 4)!;
  for (const w of l4.content) add(w, 4);

  for (const w of BLEND_WORD_IDS) add(w, 5);

  for (const w of CVCC_WORD_IDS) add(w, 6);

  for (const w of SIGHT_WORDS) add(w, 7);
  const l7 = PHONICS_CURRICULUM_LEVELS.find((l) => l.level === 7)!;
  for (const s of l7.content.filter((c) => c.includes(" "))) add(s, 7);

  for (const w of PHONICS_CURRICULUM_WORD_BANK) {
    const level = requiredLevelForSymbol(w, "word") as CurriculumLevel;
    if (!seen.has(w.toLowerCase())) add(w, level);
  }

  return records.sort((a, b) => a.id.localeCompare(b.id));
}

export interface OwnershipValidationResult {
  ok: boolean;
  errors: string[];
  records: ConceptRecord[];
}

/** Fail when multiple owners, missing owner, or missing assessment path. */
export function validateConceptOwnership(): OwnershipValidationResult {
  const errors: string[] = [];
  const records = buildConceptRegistry();
  const ownerById = new Map<string, CurriculumLevel>();

  for (const r of records) {
    if (r.assessmentLocation.length === 0) {
      errors.push(`Missing assessment path: ${r.id}`);
    }
    if (r.reinforcementLocations.length === 0) {
      errors.push(`Missing reinforcement surfaces: ${r.id}`);
    }
    const prev = ownerById.get(r.id);
    if (prev != null && prev !== r.ownerLevel) {
      errors.push(`Multiple owner levels for ${r.id}: L${prev} and L${r.ownerLevel}`);
    }
    ownerById.set(r.id, r.ownerLevel);
  }

  for (const w of PHONICS_CURRICULUM_WORD_BANK) {
    const id = w.trim().toLowerCase();
    const expected = requiredLevelForSymbol(id, "word") as CurriculumLevel;
    const rec = records.find((r) => r.id === id);
    if (!rec) {
      errors.push(`Missing owner registry entry: ${id}`);
      continue;
    }
    if (rec.ownerLevel !== expected) {
      errors.push(
        `Owner mismatch for ${id}: registry L${rec.ownerLevel}, gating L${expected}`,
      );
    }
  }

  for (const key of Object.keys(PHONICS_CONTENT_OWNERSHIP)) {
    const o = PHONICS_CONTENT_OWNERSHIP[key]!;
    if (o.assessedIn.length === 0) {
      errors.push(`Concept category missing assessment: ${key}`);
    }
  }

  return { ok: errors.length === 0, errors, records };
}
