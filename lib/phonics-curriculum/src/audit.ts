/**
 * Phonics curriculum audit — duplicate detection, orphans, level leaks.
 * Used by `pnpm run audit:phonics` and CI regression tests.
 */
import {
  BLEND_WORD_IDS,
  CVCC_WORD_IDS,
  CVC_WORDS,
  PHONICS_CURRICULUM_WORD_BANK,
} from "@workspace/phonics-sounds";
import { validateConceptOwnership } from "./concept-registry.js";
import {
  isContentUnlocked,
  requiredLevelForSymbol,
} from "./level-gating.js";
import {
  PHONICS_CURRICULUM_LEVELS,
  WORD_FAMILY_ANCHOR_WORDS,
  WORD_FAMILY_IDS,
} from "./levels.js";
import type { CurriculumLevel } from "./types.js";

export interface PhonicsAuditFinding {
  kind:
    | "duplicate_concept"
    | "duplicate_word"
    | "orphan_word"
    | "unreachable_content"
    | "level_leak"
    | "ownership_error"
    | "story_prerequisite";
  id: string;
  detail: string;
}

export interface PhonicsAuditReport {
  ok: boolean;
  findings: PhonicsAuditFinding[];
  summary: {
    duplicateConcepts: number;
    duplicateWords: number;
    orphanWords: number;
    unreachableContent: number;
    levelLeaks: number;
    ownershipErrors: number;
    storyPrerequisiteViolations: number;
  };
}

const CVC_SET = new Set(CVC_WORDS.map((w) => w.word));
const BLEND_SET = new Set<string>(BLEND_WORD_IDS);
const CVCC_SET = new Set<string>(CVCC_WORD_IDS);
const ANCHOR_SET = new Set(Object.values(WORD_FAMILY_ANCHOR_WORDS));

function countByKind(findings: PhonicsAuditFinding[]): PhonicsAuditReport["summary"] {
  const n = (k: PhonicsAuditFinding["kind"]) =>
    findings.filter((f) => f.kind === k).length;
  return {
    duplicateConcepts: n("duplicate_concept"),
    duplicateWords: n("duplicate_word"),
    orphanWords: n("orphan_word"),
    unreachableContent: n("unreachable_content"),
    levelLeaks: n("level_leak"),
    ownershipErrors: n("ownership_error"),
    storyPrerequisiteViolations: n("story_prerequisite"),
  };
}

/** Level content must not re-introduce words owned by another level. */
function auditLevelContentOwnership(): PhonicsAuditFinding[] {
  const findings: PhonicsAuditFinding[] = [];
  const introOwner = new Map<string, CurriculumLevel>();

  for (const def of PHONICS_CURRICULUM_LEVELS) {
    for (const raw of def.content) {
      const item = raw.trim().toLowerCase();
      if (!item || item.startsWith("pattern:") || item.includes("a-z")) continue;

      let owner: CurriculumLevel;
      if (WORD_FAMILY_IDS.includes(item as (typeof WORD_FAMILY_IDS)[number])) {
        owner = 3;
      } else if (item.includes(" ")) {
        owner = 7;
      } else if (CVC_SET.has(item) && def.level !== 2) {
        findings.push({
          kind: "level_leak",
          id: item,
          detail: `CVC word "${item}" listed in L${def.level} content (owner L2)`,
        });
        continue;
      } else {
        owner = requiredLevelForSymbol(item, "word") as CurriculumLevel;
      }

      const prev = introOwner.get(item);
      if (prev != null && prev !== def.level) {
        findings.push({
          kind: "duplicate_concept",
          id: item,
          detail: `Introduced at L${prev} and L${def.level}`,
        });
      } else {
        introOwner.set(item, def.level);
      }

      if (owner !== def.level && !item.startsWith("pattern:")) {
        const anchorOk = def.level === 2 && ANCHOR_SET.has(item);
        if (!anchorOk) {
          findings.push({
            kind: "level_leak",
            id: item,
            detail: `L${def.level} content "${item}" owned by L${owner}`,
          });
        }
      }
    }
  }

  return findings;
}

function auditDuplicateWords(): PhonicsAuditFinding[] {
  const findings: PhonicsAuditFinding[] = [];
  const seen = new Map<string, number>();
  for (const w of PHONICS_CURRICULUM_WORD_BANK) {
    const key = w.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [word, count] of seen) {
    if (count > 1) {
      findings.push({
        kind: "duplicate_word",
        id: word,
        detail: `Appears ${count} times in PHONICS_CURRICULUM_WORD_BANK`,
      });
    }
  }
  return findings;
}

function auditOrphanWords(): PhonicsAuditFinding[] {
  const findings: PhonicsAuditFinding[] = [];
  const taught = new Set<string>();

  for (const def of PHONICS_CURRICULUM_LEVELS) {
    for (const raw of def.content) {
      const item = raw.trim().toLowerCase();
      if (item && !item.includes("a-z")) taught.add(item);
    }
  }
  for (const w of CVC_WORDS.map((e) => e.word)) taught.add(w);
  for (const w of BLEND_WORD_IDS) taught.add(w);
  for (const w of CVCC_WORD_IDS) taught.add(w);

  for (const w of PHONICS_CURRICULUM_WORD_BANK) {
    const key = w.toLowerCase();
    const owner = requiredLevelForSymbol(key, "word");
    if (owner <= 7 && !taught.has(key) && !CVC_SET.has(key)) {
      const inBlend = BLEND_SET.has(key);
      const inCvcc = CVCC_SET.has(key);
      if (!inBlend && !inCvcc) {
        findings.push({
          kind: "orphan_word",
          id: key,
          detail: `In word bank but not in any level content array (owner L${owner})`,
        });
      }
    }
  }
  return findings;
}

function auditUnreachableAtMaxLevel(): PhonicsAuditFinding[] {
  const findings: PhonicsAuditFinding[] = [];
  const maxLevel = 7 as CurriculumLevel;

  for (const w of [...CVC_WORDS.map((e) => e.word), ...BLEND_WORD_IDS, ...CVCC_WORD_IDS]) {
    if (!isContentUnlocked(w, maxLevel, "word")) {
      findings.push({
        kind: "unreachable_content",
        id: w,
        detail: `Not unlockable at L7`,
      });
    }
  }
  return findings;
}

export function runPhonicsCurriculumAudit(): PhonicsAuditReport {
  const findings: PhonicsAuditFinding[] = [
    ...auditLevelContentOwnership(),
    ...auditDuplicateWords(),
    ...auditOrphanWords(),
    ...auditUnreachableAtMaxLevel(),
  ];

  const ownership = validateConceptOwnership();
  for (const err of ownership.errors) {
    findings.push({
      kind: "ownership_error",
      id: err.slice(0, 40),
      detail: err,
    });
  }

  const summary = countByKind(findings);
  const blocking =
    summary.duplicateConcepts +
    summary.levelLeaks +
    summary.ownershipErrors +
    summary.unreachableContent;

  return {
    ok: blocking === 0,
    findings,
    summary,
  };
}

export interface BaselineDiff {
  ok: boolean;
  newFindings: PhonicsAuditFinding[];
}

/** Compare against committed baseline — fail on new blocking findings. */
export function diffAgainstBaseline(
  report: PhonicsAuditReport,
  baselineFindingIds: string[],
): BaselineDiff {
  const baseline = new Set(baselineFindingIds);
  const blockingKinds = new Set<PhonicsAuditFinding["kind"]>([
    "duplicate_concept",
    "duplicate_word",
    "orphan_word",
    "level_leak",
    "story_prerequisite",
  ]);

  const newFindings = report.findings.filter((f) => {
    if (!blockingKinds.has(f.kind)) return false;
    const key = `${f.kind}:${f.id}`;
    return !baseline.has(key);
  });

  return { ok: newFindings.length === 0, newFindings };
}
