import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import { buildPublishMetadata, resolveThumbnail } from "../publishing/metadata/index.js";
import { PublishingOrchestrator } from "../publishing/orchestrator.js";
import { buildSchedulePlan } from "../publishing/scheduler/index.js";
import { makeContentPackage, makeRenderPackage } from "../publishing/test-fixtures.js";
import {
  MockPublishingProvider,
  PublishingError,
  PublishingProviderRegistry,
} from "../publishing/youtube/index.js";
import { isLaunchValidatorEnabled } from "./enable.js";
import { makeSilentVerticalMp4 } from "./media-evidence/fixtures.js";
import { writeLaunchValidationReport } from "./report.js";
import { recommendationForScore } from "./score.js";
import { validateLaunch } from "./validate.js";

describe("Production Launch Validator (evidence-based)", () => {
  it("is enabled by default and can be disabled", () => {
    assert.equal(isLaunchValidatorEnabled({}), true);
    assert.equal(isLaunchValidatorEnabled({ AMYNEST_LAUNCH_VALIDATOR: "0" }), false);
  });

  it("rejects legacy fixture bytes that are not a real MP4", () => {
    const content = makeContentPackage();
    const render = makeRenderPackage();
    const config = loadDefaultConfig();
    const settings = {
      ...config,
      publishingProvider: "mock" as const,
      defaultVisibility: "private" as const,
      playlist: "",
      uploadRetries: 1,
      notificationChannels: [],
      schedulePolicy: { mode: "immediate" as const, timezone: "UTC", uploadOffsetMinutes: 0 },
      categoryId: "22",
      license: "youtube" as const,
      madeForKids: true,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 1,
      deadLetterEnabled: false,
    };
    const metadata = buildPublishMetadata(content, settings);
    const report = validateLaunch({
      content,
      render,
      metadata,
      thumbnail: resolveThumbnail({
        brandingDefaultPath: "brand://amynest-default-thumb.jpg",
      }),
      schedule: buildSchedulePlan({
        policy: settings.schedulePolicy,
        visibility: metadata.visibility,
        uploadTime: "18:00",
      }),
    });

    assert.equal(report.ok, false);
    assert.equal(report.recommendation, "reject");
    assert.notEqual(report.certification.certification, "PASS");
  });

  it("rejects weak packages and silent masters", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-lv-weak-"));
    const video = makeSilentVerticalMp4(dir, 16);
    const content = makeContentPackage({
      hook: "Hi",
      openingQuestion: "",
      story: "Buy now.",
      keyPoints: [],
      voiceScript: "Buy AmyNest now.",
      cta: "",
      captions: [{ start: 0, end: 1, text: "x", style: "default", position: "bottom" }],
    });
    const render = makeRenderPackage({
      videoPath: video,
      resolution: { width: 1080, height: 1920 },
      duration: 16,
    });
    const config = loadDefaultConfig();
    const settings = {
      ...config,
      publishingProvider: "mock" as const,
      defaultVisibility: "private" as const,
      playlist: "",
      uploadRetries: 1,
      notificationChannels: [],
      schedulePolicy: { mode: "immediate" as const, timezone: "UTC", uploadOffsetMinutes: 0 },
      categoryId: "22",
      license: "youtube" as const,
      madeForKids: true,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 1,
      deadLetterEnabled: false,
    };
    const metadata = buildPublishMetadata(content, settings);
    const report = validateLaunch({
      content,
      render,
      metadata,
      thumbnail: resolveThumbnail({
        brandingDefaultPath: "brand://amynest-default-thumb.jpg",
      }),
      schedule: buildSchedulePlan({
        policy: settings.schedulePolicy,
        visibility: metadata.visibility,
        uploadTime: "18:00",
      }),
    });

    assert.equal(report.ok, false);
    assert.equal(report.recommendation, "reject");
    assert.ok(report.reasons.length >= 1);
  });

  it("writes LAUNCH_VALIDATION_REPORT.md and QUALITY_REPORT.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-lv-report-"));
    const video = makeSilentVerticalMp4(dir, 16);
    const content = makeContentPackage({ estimatedDuration: 16 });
    const render = makeRenderPackage({
      videoPath: video,
      duration: 16,
      renderMetadata: {
        ...makeRenderPackage().renderMetadata,
        outputDirectory: dir,
      },
    });
    // ensure outputDirectory on the package used
    render.renderMetadata.outputDirectory = dir;
    const config = loadDefaultConfig();
    const settings = {
      ...config,
      publishingProvider: "mock" as const,
      defaultVisibility: "private" as const,
      playlist: "",
      uploadRetries: 1,
      notificationChannels: [],
      schedulePolicy: { mode: "immediate" as const, timezone: "UTC", uploadOffsetMinutes: 0 },
      categoryId: "22",
      license: "youtube" as const,
      madeForKids: true,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 1,
      deadLetterEnabled: false,
    };
    const metadata = buildPublishMetadata(content, settings);
    const report = validateLaunch({
      content,
      render,
      metadata,
      thumbnail: resolveThumbnail({
        brandingDefaultPath: "brand://amynest-default-thumb.jpg",
      }),
      schedule: buildSchedulePlan({
        policy: settings.schedulePolicy,
        visibility: metadata.visibility,
        uploadTime: "18:00",
      }),
    });
    const written = writeLaunchValidationReport({
      report,
      outputDirectory: dir,
    });
    assert.ok(existsSync(written.path));
    const md = readFileSync(written.path, "utf8");
    assert.match(md, /Evidence certification/);
    assert.match(md, /QUALITY_REPORT/);
    assert.ok(existsSync(join(dir, "QUALITY_REPORT.json")));
  });

  it("blocks PublishingOrchestrator upload when launch validation fails", async () => {
    const mock = new MockPublishingProvider();
    const registry = new PublishingProviderRegistry({ providers: [mock] });
    const content = makeContentPackage({
      hook: "x",
      cta: "",
      voiceScript: "Buy now",
      captions: [],
    });
    const render = makeRenderPackage({
      resolution: { width: 640, height: 480 },
      duration: 3,
    });

    await assert.rejects(
      () =>
        new PublishingOrchestrator({
          config: loadDefaultConfig(),
          registry,
          sleep: async () => undefined,
        }).publish({ content, render }),
      (err: unknown) =>
        err instanceof PublishingError &&
        err.code === "validation" &&
        /blocked publish|Launch evidence|Launch validation/i.test(err.message),
    );
  });

  it("does not publish placeholder render bytes even with healthy text package", async () => {
    await assert.rejects(
      () =>
        new PublishingOrchestrator({
          config: loadDefaultConfig(),
          sleep: async () => undefined,
        }).publish({
          content: makeContentPackage(),
          render: makeRenderPackage(),
        }),
      (err: unknown) =>
        err instanceof PublishingError && err.code === "validation",
    );
  });

  it("maps score bands to recommendations", () => {
    assert.equal(recommendationForScore(97, 0), "auto_approve");
    assert.equal(recommendationForScore(92, 0), "manual_review");
    assert.equal(recommendationForScore(88, 0), "reject");
    assert.equal(recommendationForScore(99, 1), "reject");
  });
});
