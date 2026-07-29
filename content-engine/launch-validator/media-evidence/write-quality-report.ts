/**
 * QUALITY_REPORT.json — every gate, evidence, measurements, confidence.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QualityCertificationReport } from "./types.js";

export const QUALITY_REPORT_FILENAME = "QUALITY_REPORT.json";

export function writeQualityReportJson(input: {
  report: QualityCertificationReport;
  outputDirectory: string;
}): { path: string; json: string } {
  const path = join(input.outputDirectory, QUALITY_REPORT_FILENAME);
  const payload = {
    version: input.report.version,
    generatedAt: input.report.generatedAt,
    videoPath: input.report.videoPath,
    certification: input.report.certification,
    ok: input.report.ok,
    blockedReasons: input.report.blockedReasons,
    gates: input.report.gates.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      required: g.required,
      confidence: g.confidence,
      failureReason: g.failureReason ?? null,
      evidence: {
        measurements: g.evidence.measurements,
        frameNumbers: g.evidence.frameNumbers ?? [],
        timestampsSec: g.evidence.timestampsSec ?? [],
        screenshotPaths: g.evidence.screenshotPaths ?? [],
        ocrSamples: g.evidence.ocrSamples ?? [],
        notes: g.evidence.notes ?? [],
      },
    })),
    mediaProbe: {
      probeComplete: input.report.evidence.probeComplete,
      probeErrors: input.report.evidence.probeErrors,
      fileExists: input.report.evidence.fileExists,
      fileSizeBytes: input.report.evidence.fileSizeBytes,
      audio: input.report.evidence.audio,
      visual: input.report.evidence.visual,
      ocr: {
        available: input.report.evidence.ocr.available,
        transcriptOverlap: input.report.evidence.ocr.transcriptOverlap,
        subtitleCoverage: input.report.evidence.ocr.subtitleCoverage,
        fullTextPreview: input.report.evidence.ocr.fullText.slice(0, 500),
        captionTextPreview: input.report.evidence.ocr.captionText.slice(0, 500),
        endCardTextPreview: input.report.evidence.ocr.endCardText.slice(0, 500),
        frameCount: input.report.evidence.ocr.frames.length,
        error: input.report.evidence.ocr.error ?? null,
      },
      character: input.report.evidence.character,
      template: input.report.evidence.template,
      compliance: input.report.evidence.compliance,
    },
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, json, "utf8");
  return { path, json };
}
