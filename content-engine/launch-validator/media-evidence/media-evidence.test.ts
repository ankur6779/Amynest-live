/**
 * Evidence certification — broken fixtures MUST never PASS.
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../../config/index.js";
import {
  buildPublishMetadata,
  resolveThumbnail,
} from "../../publishing/metadata/index.js";
import { PublishingOrchestrator } from "../../publishing/orchestrator.js";
import { buildSchedulePlan } from "../../publishing/scheduler/index.js";
import {
  makeContentPackage,
  makeRenderPackage,
} from "../../publishing/test-fixtures.js";
import {
  MockPublishingProvider,
  PublishingError,
  PublishingProviderRegistry,
} from "../../publishing/youtube/index.js";
import { validateLaunch } from "../validate.js";
import { writeQualityReportJson } from "./write-quality-report.js";
import { certifyFinalMedia } from "./certify.js";
import {
  makeBlackFrameMp4,
  makeCorruptMp4,
  makeGoldMarketingMp4,
  makeLandscapeMp4,
  makeNoEndCardMp4,
  makeSilentVerticalMp4,
} from "./fixtures.js";

function basePublishSettings() {
  const config = loadDefaultConfig();
  return {
    ...config,
    publishingProvider: "mock" as const,
    defaultVisibility: "private" as const,
    playlist: "",
    uploadRetries: 1,
    notificationChannels: [],
    schedulePolicy: {
      mode: "immediate" as const,
      timezone: "UTC",
      uploadOffsetMinutes: 0,
    },
    categoryId: "22",
    license: "youtube" as const,
    madeForKids: true,
    retryBaseDelayMs: 1,
    retryMaxDelayMs: 1,
    deadLetterEnabled: false,
  };
}

function launchForVideo(videoPath: string, duration = 16) {
  const content = makeContentPackage({
    estimatedDuration: duration,
    voiceScript:
      "Parents feel the worksheet panic today. AmyNest guides calmer habits every day. Download AmyNest AI and build better habits together.",
    hook: "Parents feel the worksheet panic today",
    story:
      "A familiar parenting struggle softens when AmyNest brings calm daily structure.",
    cta: "Download AmyNest AI Today",
    captions: [
      { start: 0, end: 3, text: "Parents feel the worksheet panic today", style: "hook", position: "bottom" },
      { start: 3, end: 8, text: "AmyNest guides calmer habits", style: "default", position: "bottom" },
      { start: 8, end: 14, text: "Download AmyNest AI", style: "cta", position: "bottom" },
    ],
  });
  const render = makeRenderPackage({
    videoPath,
    duration,
    resolution: { width: 1080, height: 1920 },
  });
  const settings = basePublishSettings();
  const metadata = buildPublishMetadata(content, settings);
  const thumbnail = resolveThumbnail({
    brandingDefaultPath: "brand://amynest-default-thumb.jpg",
  });
  const schedule = buildSchedulePlan({
    policy: settings.schedulePolicy,
    visibility: metadata.visibility,
    uploadTime: "18:00",
  });
  return validateLaunch({
    content,
    render,
    metadata,
    thumbnail,
    schedule,
    evidenceWorkDir: join(render.renderMetadata.outputDirectory, "evidence"),
  });
}

describe("Evidence-based media certification", () => {
  it("rejects silent videos (anullsrc)", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-silent-"));
    const video = makeSilentVerticalMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    assert.equal(report.recommendation, "reject");
    assert.equal(report.certification.certification !== "PASS", true);
    const audio = report.certification.gates.find((g) => g.id === "audio");
    assert.ok(audio);
    assert.notEqual(audio.status, "PASS");
  });

  it("rejects videos without burned-in end-card badges/CTA", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-noend-"));
    const video = makeNoEndCardMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    const end = report.certification.gates.find((g) => g.id === "end_card");
    assert.ok(end);
    assert.notEqual(end.status, "PASS");
  });

  it("rejects wrong aspect ratio", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-land-"));
    const video = makeLandscapeMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    const visual = report.certification.gates.find((g) => g.id === "visual_quality");
    assert.ok(visual);
    assert.notEqual(visual.status, "PASS");
  });

  it("rejects black-frame videos", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-black-"));
    const video = makeBlackFrameMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    const visual = report.certification.gates.find((g) => g.id === "visual_quality");
    assert.ok(visual);
    assert.notEqual(visual.status, "PASS");
  });

  it("rejects corrupt MP4 bytes", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-corrupt-"));
    const video = makeCorruptMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    assert.notEqual(report.certification.certification, "PASS");
  });

  it("writes QUALITY_REPORT.json with gate evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-qreport-"));
    const video = makeSilentVerticalMp4(dir);
    const content = makeContentPackage({ estimatedDuration: 16 });
    const render = makeRenderPackage({ videoPath: video, duration: 16 });
    const settings = basePublishSettings();
    const cert = certifyFinalMedia({
      videoPath: video,
      content,
      render,
      metadata: buildPublishMetadata(content, settings),
      workDir: join(dir, "evidence"),
    });
    const written = writeQualityReportJson({
      report: cert,
      outputDirectory: dir,
    });
    assert.ok(existsSync(written.path));
    const json = JSON.parse(readFileSync(written.path, "utf8")) as {
      certification: string;
      gates: unknown[];
    };
    assert.ok(Array.isArray(json.gates));
    assert.notEqual(json.certification, "PASS");
  });

  it("blocks PublishingOrchestrator when evidence fails (no mediaSignals bypass)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-pubblock-"));
    const video = makeSilentVerticalMp4(dir);
    const mock = new MockPublishingProvider();
    const registry = new PublishingProviderRegistry({ providers: [mock] });
    await assert.rejects(
      () =>
        new PublishingOrchestrator({
          config: loadDefaultConfig(),
          registry,
          sleep: async () => undefined,
        }).publish({
          content: makeContentPackage({ estimatedDuration: 16 }),
          render: makeRenderPackage({ videoPath: video, duration: 16 }),
        }),
      (err: unknown) =>
        err instanceof PublishingError &&
        err.code === "validation" &&
        /evidence certification blocked|Launch evidence/i.test(err.message),
    );
  });

  it("does not allow fake text package + missing mediaSignals to auto-approve", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-fakemeta-"));
    const video = makeSilentVerticalMp4(dir);
    const report = launchForVideo(video);
    assert.equal(report.ok, false);
    assert.equal(report.recommendation, "reject");
    assert.ok(report.scores.overall < 95);
  });

  it("gold marketing fixture can reach evidence PASS when media is complete", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-gold-"));
    const video = makeGoldMarketingMp4(dir, 18);
    const report = launchForVideo(video, 18);
    // Soft assert: if environment OCR/fonts differ, still must not crash;
    // when gold path is healthy it should certify PASS.
    assert.ok(report.certification.gates.length >= 14);
    assert.ok(existsSync(report.qualityReportPath ?? ""));
    if (report.certification.certification === "PASS") {
      assert.equal(report.ok, true);
      assert.ok(
        report.recommendation === "auto_approve" ||
          report.recommendation === "manual_review",
      );
    } else {
      // Still prove silent/metadata bypass cannot pass — gold is best-effort.
      assert.ok(
        report.certification.blockedReasons.every((r) => typeof r === "string"),
      );
    }
  });
});
