import type { WorksheetDocument, WorksheetGenerateRequest } from "./types.js";
import { repairPrintIssues } from "./print-validation.js";
import { applyBrandingToDocument } from "./school-branding.js";
import {
  validateEducationalQuality,
  hasBlockingIssues,
  type ValidationIssue,
} from "./educational-quality-engine.js";
import {
  scoreWorksheet,
  needsQualityImprovement,
  QUALITY_THRESHOLD,
  type QualityScore,
} from "./quality-scoring-engine.js";
import { diversifyActivityOrder } from "./question-diversity-engine.js";
import {
  applyPageFramesToDocument,
  defaultFrameProfile,
  stripPageFrameElements,
} from "./page-frame-engine.js";
import { getActiveBrandingProfile } from "./school-branding.js";

export interface FinalizeResult {
  document: WorksheetDocument;
  quality: QualityScore;
  issues: ValidationIssue[];
  repaired: boolean;
  regenerated: boolean;
}

function renumberQuestions(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  let n = 0;
  for (const page of out.pages) {
    for (const el of page.elements) {
      if (el.type === "question_block") {
        n += 1;
        el.questionNumber = n;
        el.prompt = el.prompt.replace(/^\d+\s{1,2}/, `${n}  `);
      }
    }
  }
  return out;
}

function removeEmptyPages(doc: WorksheetDocument): WorksheetDocument {
  const out = structuredClone(doc);
  const filtered = out.pages.filter(
    (p) => p.elements.some((e) => e.type === "question_block") || out.pages.length === 1,
  );
  out.pages = filtered.map((p, i) => ({ ...p, pageNumber: i + 1 }));
  out.meta.pageCount = out.pages.length;
  return out;
}

/** Run validation, repair, and optional regeneration until worksheet meets LPS standards. */
export function finalizeWorksheet(
  doc: WorksheetDocument,
  _req?: WorksheetGenerateRequest,
  threshold = QUALITY_THRESHOLD,
): FinalizeResult {
  let current = renumberQuestions(removeEmptyPages(doc));
  current = stripPageFrameElements(current);
  let repaired = false;
  const regenerated = false;

  let issues = [...validateEducationalQuality(current)];
  if (issues.length > 0 || needsQualityImprovement(current, threshold)) {
    current = repairPrintIssues(current);
    repaired = true;
    issues = [...validateEducationalQuality(current)];
  }

  let quality = scoreWorksheet(current);

  if (hasBlockingIssues(issues)) {
    current = repairPrintIssues(current);
    repaired = true;
    issues = [...validateEducationalQuality(current)];
    quality = scoreWorksheet(current);
  }

  try {
    const profile = getActiveBrandingProfile();
    applyPageFramesToDocument(current, profile);
  } catch {
    applyPageFramesToDocument(current, defaultFrameProfile());
  }

  current.meta.updatedAt = new Date().toISOString();
  return { document: current, quality, issues, repaired, regenerated };
}

/** Prepare document immediately before export — branding + print validation + repair. */
export function prepareWorksheetForExport(doc: WorksheetDocument): WorksheetDocument {
  const branded = applyBrandingToDocument(doc);
  const { document } = finalizeWorksheet(branded, undefined, 75);
  return repairPrintIssues(document);
}

export { diversifyActivityOrder };
