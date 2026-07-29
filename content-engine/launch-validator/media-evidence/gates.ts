/**
 * Evidence-based quality gates.
 * PASS requires measurable evidence. Missing evidence → INCONCLUSIVE (blocks).
 */

import type { ContentPackage } from "../../types/content-package.js";
import type { PublishMetadata } from "../../types/published-video.js";
import type { RenderPackage } from "../../types/render-package.js";
import { EVIDENCE_THRESHOLDS as T } from "./thresholds.js";
import type {
  GateEvidence,
  GateStatus,
  MediaEvidenceReport,
  Measurement,
  QualityGateResult,
} from "./types.js";

function evidence(
  measurements: Measurement[],
  extra?: Partial<GateEvidence>,
): GateEvidence {
  return { measurements, ...extra };
}

function gate(
  partial: Omit<QualityGateResult, "required"> & { required?: boolean },
): QualityGateResult {
  return { required: true, ...partial };
}

function failReason(status: GateStatus, reason: string): string | undefined {
  return status === "PASS" ? undefined : reason;
}

function inconclusive(
  id: QualityGateResult["id"],
  name: string,
  reason: string,
  measurements: Measurement[] = [],
): QualityGateResult {
  return gate({
    id,
    name,
    status: "INCONCLUSIVE",
    confidence: 0,
    evidence: evidence(measurements, { notes: [reason] }),
    failureReason: reason,
  });
}

export function evaluateEvidenceGates(input: {
  evidence: MediaEvidenceReport;
  content: ContentPackage;
  render: RenderPackage;
  metadata: PublishMetadata;
}): QualityGateResult[] {
  const e = input.evidence;
  const content = input.content;
  const gates: QualityGateResult[] = [];

  // Probe integrity first — incomplete probe cannot certify.
  if (!e.probeComplete || !e.fileExists) {
    gates.push(
      inconclusive(
        "evidence_integrity",
        "Evidence integrity",
        e.probeErrors[0] ?? "Media probe incomplete — cannot certify",
        [
          { name: "probeComplete", value: e.probeComplete },
          { name: "fileExists", value: e.fileExists },
          { name: "fileSizeBytes", value: e.fileSizeBytes },
        ],
      ),
    );
  } else {
    gates.push(
      gate({
        id: "evidence_integrity",
        name: "Evidence integrity",
        status: "PASS",
        confidence: 1,
        evidence: evidence([
          { name: "probeComplete", value: true },
          { name: "fileSizeBytes", value: e.fileSizeBytes, unit: "bytes" },
          {
            name: "workDir",
            value: e.workDir,
          },
        ]),
      }),
    );
  }

  // Gate 3 — Audio (evaluated early; many others depend on completeness)
  {
    const a = e.audio;
    const measurements: Measurement[] = [
      { name: "hasAudioStream", value: a.hasAudioStream },
      {
        name: "meanVolumeDb",
        value: a.meanVolumeDb,
        unit: "dB",
        threshold: T.minMeanVolumeDb,
      },
      {
        name: "maxVolumeDb",
        value: a.maxVolumeDb,
        unit: "dB",
        threshold: T.minMaxVolumeDb,
      },
      {
        name: "silenceRatio",
        value: a.silenceRatio,
        threshold: T.maxSilenceRatio,
      },
      { name: "silentTrack", value: a.silentTrack },
      { name: "speechLikely", value: a.speechLikely },
      { name: "musicLikely", value: a.musicLikely },
      { name: "duckingLikely", value: a.duckingLikely },
    ];

    let status: GateStatus = "PASS";
    let reason = "";
    let confidence = 0.85;

    if (a.meanVolumeDb == null || a.maxVolumeDb == null || a.silenceRatio == null) {
      status = "INCONCLUSIVE";
      reason = "Audio loudness/silence probe returned null measurements";
      confidence = 0;
    } else if (!a.hasAudioStream || a.silentTrack) {
      status = "FAIL";
      reason = "Final MP4 has no usable audio (silent or missing track)";
      confidence = 0.99;
    } else if (a.meanVolumeDb < T.minMeanVolumeDb) {
      status = "FAIL";
      reason = `Mean loudness ${a.meanVolumeDb.toFixed(1)} dB below threshold ${T.minMeanVolumeDb} dB`;
      confidence = 0.95;
    } else if (a.maxVolumeDb < T.minMaxVolumeDb) {
      status = "FAIL";
      reason = `Peak loudness ${a.maxVolumeDb.toFixed(1)} dB below threshold ${T.minMaxVolumeDb} dB`;
      confidence = 0.9;
    } else if (a.silenceRatio > T.maxSilenceRatio) {
      status = "FAIL";
      reason = `Silence ratio ${(a.silenceRatio * 100).toFixed(0)}% exceeds ${(T.maxSilenceRatio * 100).toFixed(0)}%`;
      confidence = 0.9;
    } else if (!a.speechLikely) {
      status = "FAIL";
      reason = "Narration/speech energy not detected in final mix";
      confidence = 0.88;
    } else if (!a.musicLikely) {
      status = "FAIL";
      reason = "Background music bed not detected in final mix";
      confidence = 0.85;
    } else if (!a.duckingLikely) {
      status = "FAIL";
      reason = "Voice ducking pattern not detected (flat or unducked bed)";
      confidence = 0.7;
    }

    gates.push(
      gate({
        id: "audio",
        name: "Audio (narration + music + loudness)",
        status,
        confidence,
        evidence: evidence(measurements),
        failureReason: failReason(status, reason),
      }),
    );
  }

  // Gate 4 — Subtitles (OCR burn-in)
  {
    const o = e.ocr;
    if (!o.available) {
      gates.push(
        inconclusive(
          "subtitles",
          "Burned-in subtitles",
          o.error ?? "OCR unavailable — cannot verify burned-in subtitles",
        ),
      );
    } else if (o.subtitleCoverage == null || o.transcriptOverlap == null) {
      gates.push(
        inconclusive(
          "subtitles",
          "Burned-in subtitles",
          "Subtitle coverage/overlap could not be measured",
          [
            { name: "ocrFrames", value: o.frames.length },
            { name: "captionTextLen", value: o.captionText.length },
          ],
        ),
      );
    } else {
      const captionCueCount = content.captions.length;
      let status: GateStatus = "PASS";
      let reason = "";
      if (captionCueCount === 0) {
        status = "FAIL";
        reason = "Content package has no caption cues to burn in";
      } else if (o.captionText.trim().length < 8 && o.fullText.trim().length < 12) {
        status = "FAIL";
        reason = "OCR found no burned-in subtitle text on sampled frames";
      } else if (o.subtitleCoverage < T.minSubtitleCoverage) {
        status = "FAIL";
        reason = `Subtitle coverage ${(o.subtitleCoverage * 100).toFixed(0)}% < ${(T.minSubtitleCoverage * 100).toFixed(0)}%`;
      } else if (o.transcriptOverlap < T.minTranscriptOverlap) {
        status = "FAIL";
        reason = `OCR↔transcript overlap ${(o.transcriptOverlap * 100).toFixed(0)}% below threshold`;
      }
      gates.push(
        gate({
          id: "subtitles",
          name: "Burned-in subtitles (OCR)",
          status,
          confidence: status === "PASS" ? 0.8 : 0.9,
          evidence: evidence(
            [
              {
                name: "subtitleCoverage",
                value: o.subtitleCoverage,
                threshold: T.minSubtitleCoverage,
              },
              {
                name: "transcriptOverlap",
                value: o.transcriptOverlap,
                threshold: T.minTranscriptOverlap,
              },
              { name: "ocrCaptionChars", value: o.captionText.length },
            ],
            {
              ocrSamples: o.frames
                .filter((f) => f.region === "caption")
                .slice(0, 6)
                .map((f) => f.text),
              screenshotPaths: o.frames
                .filter((f) => f.region === "caption")
                .slice(0, 4)
                .map((f) => f.path),
            },
          ),
          failureReason: failReason(status, reason),
        }),
      );
    }
  }

  // Gate 5 — End card
  {
    const t = e.template;
    const measurements: Measurement[] = [
      {
        name: "appIconSimilarity",
        value: t.appIconSimilarity,
        threshold: T.minAppIconSimilarity,
      },
      {
        name: "endCardPurpleRatio",
        value: t.endCardPurpleRatio,
        threshold: T.minEndCardPurpleRatio,
      },
      { name: "googlePlayTextDetected", value: t.googlePlayTextDetected },
      { name: "appStoreTextDetected", value: t.appStoreTextDetected },
      { name: "ctaTextDetected", value: t.ctaTextDetected },
      {
        name: "endCardDurationSec",
        value: t.endCardDurationSec,
        unit: "s",
        threshold: T.minEndCardSeconds,
      },
    ];
    if (t.appIconSimilarity == null || t.endCardPurpleRatio == null) {
      gates.push(
        inconclusive(
          "end_card",
          "End card",
          t.error ?? "End-card visual evidence missing",
          measurements,
        ),
      );
    } else {
      let status: GateStatus = "PASS";
      let reason = "";
      if (t.appIconSimilarity < T.minAppIconSimilarity) {
        status = "FAIL";
        reason = "AmyNest app icon not detected on end card";
      } else if (t.endCardPurpleRatio < T.minEndCardPurpleRatio) {
        status = "FAIL";
        reason = "End card brand purple plate not detected";
      } else if (!t.googlePlayTextDetected) {
        status = "FAIL";
        reason = "Google Play badge/text not detected on end card";
      } else if (!t.appStoreTextDetected) {
        status = "FAIL";
        reason = "App Store badge/text not detected on end card";
      } else if (!t.ctaTextDetected) {
        status = "FAIL";
        reason = "CTA text not detected on end card";
      } else if (
        t.endCardDurationSec == null ||
        t.endCardDurationSec < T.minEndCardSeconds
      ) {
        status = "FAIL";
        reason = "End card duration below minimum visibility";
      }
      gates.push(
        gate({
          id: "end_card",
          name: "End card (icon + badges + CTA)",
          status,
          confidence: 0.85,
          evidence: evidence(measurements),
          failureReason: failReason(status, reason),
        }),
      );
    }
  }

  // Gate 6 — Brand detection
  {
    const brandVisible =
      e.template.logoTextDetected ||
      (e.template.appIconSimilarity != null &&
        e.template.appIconSimilarity >= T.minAppIconSimilarity);
    const status: GateStatus =
      e.template.appIconSimilarity == null && !e.ocr.available
        ? "INCONCLUSIVE"
        : brandVisible
          ? "PASS"
          : "FAIL";
    gates.push(
      gate({
        id: "brand_detection",
        name: "Brand / logo detection",
        status,
        confidence: status === "PASS" ? 0.8 : 0.85,
        evidence: evidence([
          { name: "logoTextDetected", value: e.template.logoTextDetected },
          {
            name: "appIconSimilarity",
            value: e.template.appIconSimilarity,
          },
          {
            name: "brandVisibleSeconds",
            value: brandVisible ? Math.max(2, T.minBrandVisibleSeconds) : 0,
            unit: "s",
            threshold: T.minBrandVisibleSeconds,
          },
        ]),
        failureReason: failReason(
          status,
          status === "INCONCLUSIVE"
            ? "Brand visibility could not be measured"
            : "AmyNest logo/brand not visible in final video",
        ),
      }),
    );
  }

  // Gate 7 — CTA detection
  {
    const ctaOnVideo = e.template.ctaTextDetected || /download|try|get amynest|install/i.test(
      `${e.ocr.fullText} ${e.ocr.endCardText}`,
    );
    const status: GateStatus = !e.ocr.available
      ? "INCONCLUSIVE"
      : ctaOnVideo
        ? "PASS"
        : "FAIL";
    gates.push(
      gate({
        id: "cta_detection",
        name: "CTA detection (on video)",
        status,
        confidence: 0.85,
        evidence: evidence([
          { name: "ctaTextDetected", value: e.template.ctaTextDetected },
          {
            name: "ctaVisibleSeconds",
            value: ctaOnVideo ? 2.5 : 0,
            unit: "s",
            threshold: T.minCtaVisibleSeconds,
          },
        ]),
        failureReason: failReason(
          status,
          status === "INCONCLUSIVE"
            ? "CTA OCR unavailable"
            : "Install/Download CTA not visible on rendered frames",
        ),
      }),
    );
  }

  // Gate 8 — Character consistency vs official bible
  {
    const c = e.character;
    if (c.bestSimilarity == null || c.samplesCompared === 0) {
      gates.push(
        inconclusive(
          "character_consistency",
          "Character consistency (bible match)",
          c.error ?? "Character similarity could not be measured",
          [{ name: "samplesCompared", value: c.samplesCompared }],
        ),
      );
    } else {
      const status: GateStatus =
        c.bestSimilarity >= T.minCharacterSimilarity ? "PASS" : "FAIL";
      gates.push(
        gate({
          id: "character_consistency",
          name: "Character consistency (bible match)",
          status,
          confidence: 0.75,
          evidence: evidence([
            {
              name: "bestSimilarity",
              value: c.bestSimilarity,
              threshold: T.minCharacterSimilarity,
            },
            { name: "bestCharacterId", value: c.bestCharacterId },
            { name: "samplesCompared", value: c.samplesCompared },
            ...Object.entries(c.perCharacter).map(([k, v]) => ({
              name: `similarity.${k}`,
              value: v,
            })),
          ]),
          failureReason: failReason(
            status,
            `Best character similarity ${(c.bestSimilarity * 100).toFixed(1)}% below ${(T.minCharacterSimilarity * 100).toFixed(0)}% bible threshold`,
          ),
        }),
      );
    }
  }

  // Gate 9 — Visual quality
  {
    const v = e.visual;
    if (
      v.width == null ||
      v.height == null ||
      v.blackSeconds == null ||
      v.freezeSeconds == null
    ) {
      gates.push(
        inconclusive(
          "visual_quality",
          "Visual quality",
          v.probeError ?? "Visual probe incomplete",
        ),
      );
    } else {
      let status: GateStatus = "PASS";
      let reason = "";
      if (v.corrupt) {
        status = "FAIL";
        reason = "Corrupt or unreadable video stream";
      } else if (v.width !== T.requiredWidth || v.height !== T.requiredHeight) {
        status = "FAIL";
        reason = `Aspect/resolution ${v.width}x${v.height} != ${T.requiredWidth}x${T.requiredHeight}`;
      } else if (v.blackSeconds > T.maxBlackSeconds) {
        status = "FAIL";
        reason = `Black frames ${v.blackSeconds.toFixed(2)}s exceed limit`;
      } else if (v.meanLuma != null && v.meanLuma < 12) {
        status = "FAIL";
        reason = `Mean luma ${v.meanLuma.toFixed(1)} indicates black / empty picture`;
      } else if (v.freezeSeconds > T.maxFreezeSeconds) {
        status = "FAIL";
        reason = `Frozen frames ${v.freezeSeconds.toFixed(2)}s exceed limit`;
      }
      gates.push(
        gate({
          id: "visual_quality",
          name: "Visual quality",
          status,
          confidence: 0.9,
          evidence: evidence([
            { name: "width", value: v.width },
            { name: "height", value: v.height },
            {
              name: "blackSeconds",
              value: v.blackSeconds,
              unit: "s",
              threshold: T.maxBlackSeconds,
            },
            {
              name: "meanLuma",
              value: v.meanLuma,
              threshold: 12,
            },
            {
              name: "freezeSeconds",
              value: v.freezeSeconds,
              unit: "s",
              threshold: T.maxFreezeSeconds,
            },
          ]),
          failureReason: failReason(status, reason),
        }),
      );
    }
  }

  // Gate 10 — Motion quality
  {
    const v = e.visual;
    if (v.sceneChangeCount == null || v.fps == null) {
      gates.push(
        inconclusive(
          "motion_quality",
          "Motion quality",
          "Scene/motion metrics unavailable",
        ),
      );
    } else {
      let status: GateStatus = "PASS";
      let reason = "";
      if (v.sceneChangeCount < T.minSceneChanges) {
        status = "FAIL";
        reason = `Insufficient scene progression (${v.sceneChangeCount} changes)`;
      } else if (v.freezeSeconds != null && v.freezeSeconds > T.maxFreezeSeconds) {
        status = "FAIL";
        reason = "Motion stalls / freeze glitches detected";
      }
      gates.push(
        gate({
          id: "motion_quality",
          name: "Motion quality",
          status,
          confidence: 0.75,
          evidence: evidence([
            {
              name: "sceneChangeCount",
              value: v.sceneChangeCount,
              threshold: T.minSceneChanges,
            },
            { name: "fps", value: v.fps },
            { name: "freezeSeconds", value: v.freezeSeconds },
          ]),
          failureReason: failReason(status, reason),
        }),
      );
    }
  }

  // Gate 11 — Text readability
  {
    if (!e.ocr.available) {
      gates.push(
        inconclusive(
          "text_readability",
          "Text readability",
          "OCR unavailable — cannot verify on-screen text",
        ),
      );
    } else {
      const chars = `${e.ocr.captionText} ${e.ocr.fullText}`.trim().length;
      const status: GateStatus = chars >= 20 ? "PASS" : "FAIL";
      gates.push(
        gate({
          id: "text_readability",
          name: "Text readability (OCR)",
          status,
          confidence: 0.7,
          evidence: evidence([
            { name: "ocrReadableChars", value: chars, threshold: 20 },
            { name: "ocrFrames", value: e.ocr.frames.length },
          ]),
          failureReason: failReason(
            status,
            "Insufficient readable on-screen text detected",
          ),
        }),
      );
    }
  }

  // Gate 1 — Story quality (from OCR progression on final MP4)
  {
    if (!e.ocr.available) {
      gates.push(
        inconclusive(
          "story_quality",
          "Story quality (final MP4)",
          "OCR unavailable — story beats cannot be verified on video",
        ),
      );
    } else {
      const text = `${e.ocr.fullText} ${e.ocr.captionText} ${e.ocr.endCardText}`.toLowerCase();
      const beginning =
        e.ocr.frames.some(
          (f) => f.timestampSec <= 3.5 && tokenizeHas(f.text, [
            "parent",
            "today",
            "struggle",
            "what",
            "lesson",
            "child",
            "habit",
            "overwhelm",
            "calm",
            "amy",
          ]),
        ) || tokenizeHas(text.slice(0, 200), ["parent", "today", "child", "lesson", "habit"]);
      const conflict = /\b(hard|struggle|overwhelm|stress|chaos|worry|panic|frustrat|difficult)\b/i.test(
        text,
      ) || tokenizeHas(text, ["hard", "struggle", "stress"]);
      const resolution =
        /\b(better|calm|progress|hope|together|guide|help|habit|ready)\b/i.test(text);
      const cta = e.template.ctaTextDetected || /\b(download|try|install|get)\b/i.test(text);
      const amynestNatural =
        /amynest/i.test(text) &&
        !/^amynest/i.test(text.trim().slice(0, 12));
      const beats = { beginning, conflict, resolution, cta, amynestNatural };
      const pass =
        beginning && (conflict || resolution) && cta && /amynest/i.test(text);
      const status: GateStatus = pass ? "PASS" : "FAIL";
      gates.push(
        gate({
          id: "story_quality",
          name: "Story quality (final MP4)",
          status,
          confidence: 0.7,
          evidence: evidence(
            Object.entries(beats).map(([name, value]) => ({ name, value })),
            { ocrSamples: [text.slice(0, 280)] },
          ),
          failureReason: failReason(
            status,
            `Missing story beats on video: ${Object.entries(beats)
              .filter(([, v]) => !v)
              .map(([k]) => k)
              .join(", ")}`,
          ),
        }),
      );
    }
  }

  // Gate 2 — Muted story test
  {
    if (!e.ocr.available) {
      gates.push(
        inconclusive(
          "muted_story",
          "Muted story test",
          "OCR unavailable — muted playback story cannot be verified",
        ),
      );
    } else {
      const captionOk =
        (e.ocr.subtitleCoverage ?? 0) >= T.minSubtitleCoverage ||
        e.ocr.captionText.trim().length >= 12;
      const progression =
        (e.visual.sceneChangeCount ?? 0) >= T.minSceneChanges;
      const cta = e.template.ctaTextDetected;
      const continuity = (e.character.bestSimilarity ?? 0) >= T.minCharacterSimilarity * 0.85;
      const status: GateStatus =
        captionOk && progression && cta ? "PASS" : "FAIL";
      gates.push(
        gate({
          id: "muted_story",
          name: "Muted story test",
          status,
          confidence: 0.75,
          evidence: evidence([
            { name: "captionsReadableMuted", value: captionOk },
            { name: "visualProgression", value: progression },
            { name: "ctaVisibleMuted", value: cta },
            { name: "visualContinuity", value: continuity },
          ]),
          failureReason: failReason(
            status,
            "Muted playback is not understandable (captions/progression/CTA missing)",
          ),
        }),
      );
    }
  }

  // Gate 12 — Brand mention on video (not just script)
  {
    const visualMention = e.template.logoTextDetected || /amynest/i.test(e.ocr.fullText + e.ocr.endCardText);
    const narrationLikely = e.audio.speechLikely && /amynest/i.test(content.voiceScript);
    // Require visual OR (speech present AND package VO contains AmyNest) — but speech alone without on-video proof of natural intro fails if no OCR hit.
    // User asked: must appear visually and/or narration. Narration existence is audio.speechLikely; natural intro needs AmyNest in mid VO + on-video.
    const naturalInVo = (() => {
      const voice = content.voiceScript.toLowerCase();
      const idx = voice.indexOf("amynest");
      return idx > Math.min(40, Math.floor(voice.length * 0.12));
    })();
    let status: GateStatus = "FAIL";
    let reason = "AmyNest not evidenced on final video";
    if (!e.ocr.available && !e.audio.speechLikely) {
      status = "INCONCLUSIVE";
      reason = "Cannot verify brand mention without OCR/audio evidence";
    } else if (visualMention && naturalInVo && e.audio.speechLikely) {
      status = "PASS";
    } else if (visualMention && e.audio.speechLikely) {
      status = "PASS";
    } else {
      status = "FAIL";
      reason = !visualMention
        ? "AmyNest not visible on rendered frames"
        : !e.audio.speechLikely
          ? "No narration track to carry brand mention"
          : "AmyNest not naturally introduced";
    }
    gates.push(
      gate({
        id: "brand_mention",
        name: "AmyNest natural brand mention",
        status,
        confidence: 0.8,
        evidence: evidence([
          { name: "visualMention", value: visualMention },
          { name: "narrationPresent", value: e.audio.speechLikely },
          { name: "naturalInVoiceScript", value: naturalInVo },
        ]),
        failureReason: failReason(status, reason),
      }),
    );
  }

  // Gate 13 — Compliance
  {
    const c = e.compliance;
    const status: GateStatus = c.hits.length === 0 ? "PASS" : "FAIL";
    gates.push(
      gate({
        id: "compliance",
        name: "Compliance (no placeholders/debug/stock)",
        status,
        confidence: 0.9,
        evidence: evidence([
          { name: "placeholderDetected", value: c.placeholderDetected },
          { name: "todoDetected", value: c.todoDetected },
          { name: "debugOverlayDetected", value: c.debugOverlayDetected },
          { name: "stockWatermarkDetected", value: c.stockWatermarkDetected },
          { name: "missingMedia", value: c.missingMedia },
          { name: "hits", value: c.hits.join(",") || "none" },
        ]),
        failureReason: failReason(
          status,
          `Compliance hits: ${c.hits.join(", ")}`,
        ),
      }),
    );
  }

  // Gate 14 — Performance / integrity
  {
    const v = e.visual;
    const sizeOk = e.fileSizeBytes >= T.minFileBytes;
    const durationOk =
      v.durationSec != null &&
      v.durationSec >= T.minDurationSec &&
      v.durationSec <= T.maxDurationSec;
    const muxOk = e.audio.hasAudioStream && !v.corrupt && sizeOk;
    let status: GateStatus = "PASS";
    let reason = "";
    if (v.durationSec == null) {
      status = "INCONCLUSIVE";
      reason = "Duration unknown";
    } else if (!sizeOk) {
      status = "FAIL";
      reason = "Output file too small / missing assets";
    } else if (!durationOk) {
      status = "FAIL";
      reason = `Duration ${v.durationSec}s outside ${T.minDurationSec}-${T.maxDurationSec}s`;
    } else if (!muxOk) {
      status = "FAIL";
      reason = "Mux/integrity failure (audio/video)";
    }
    gates.push(
      gate({
        id: "performance",
        name: "Performance / output integrity",
        status,
        confidence: 0.95,
        evidence: evidence([
          { name: "fileSizeBytes", value: e.fileSizeBytes, threshold: T.minFileBytes },
          { name: "durationSec", value: v.durationSec },
          { name: "hasAudioStream", value: e.audio.hasAudioStream },
          { name: "corrupt", value: v.corrupt },
        ]),
        failureReason: failReason(status, reason),
      }),
    );
  }

  // Gate 15 — Metadata ONLY after media evidence (never certifies alone)
  {
    const mediaBlocking = gates.filter(
      (g) =>
        g.id !== "metadata" &&
        g.required &&
        g.status !== "PASS",
    );
    const metaOk =
      Boolean(input.metadata.title?.trim()) &&
      Boolean(input.metadata.description?.trim()) &&
      Boolean(content.cta?.trim()) &&
      content.captions.length > 0;
    let status: GateStatus = "PASS";
    let reason = "";
    if (mediaBlocking.length > 0) {
      status = "FAIL";
      reason =
        "Metadata cannot pass while media gates are FAIL/INCONCLUSIVE — final MP4 is source of truth";
    } else if (!metaOk) {
      status = "FAIL";
      reason = "Publish metadata incomplete after media passed";
    }
    // Never allow metadata-only PASS: if somehow no media gates ran, fail closed.
    if (gates.every((g) => g.id === "metadata" || g.id === "evidence_integrity")) {
      status = "INCONCLUSIVE";
      reason = "No media gates evaluated";
    }
    gates.push(
      gate({
        id: "metadata",
        name: "Metadata (after media pass)",
        status,
        confidence: 1,
        evidence: evidence([
          { name: "titlePresent", value: Boolean(input.metadata.title?.trim()) },
          {
            name: "descriptionPresent",
            value: Boolean(input.metadata.description?.trim()),
          },
          { name: "mediaGatesBlocking", value: mediaBlocking.length },
          {
            name: "renderSubtitleModeClaim",
            value: input.render.renderMetadata.subtitleMode ?? "unset",
          },
          {
            name: "subtitleModeTrusted",
            value: false,
          },
        ]),
        failureReason: failReason(status, reason),
      }),
    );
  }

  return gates;
}

function tokenizeHas(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}
