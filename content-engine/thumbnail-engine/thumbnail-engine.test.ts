import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import {
  generatePublishThumbnail,
  isThumbnailEngineEnabled,
  runThumbnailEngine,
} from "./engine.js";
import {
  assertHeadlineSafe,
  pickThumbnailPartner,
  resolveThumbnailHeadline,
} from "./headlines.js";
import { predictCtrPercent } from "./metrics.js";
import { uploadYouTubeThumbnail } from "./upload.js";
import {
  chooseBestVariant,
  generateThumbnailVariants,
} from "./variants.js";
import { checkYouTubeThumbnailStatus } from "./youtube-status.js";

describe("Thumbnail Engine 2.0", () => {
  it("is enabled by default and can be disabled via env", () => {
    assert.equal(isThumbnailEngineEnabled({}), true);
    assert.equal(
      isThumbnailEngineEnabled({ AMYNEST_THUMBNAIL_ENGINE: "0" }),
      false,
    );
  });

  it("keeps headlines to ≤4 words and picks partner", () => {
    const speech = makeContentPackage({
      title: "Help kids speak clearly every day",
      hook: "Speech practice feels hard",
      topic: {
        ...makeContentPackage().topic,
        title: "Speech Coach",
        keywords: ["speech", "language"],
      },
    });
    assert.equal(resolveThumbnailHeadline(speech), "Speak Better");
    assert.ok(assertHeadlineSafe("Too Many Words In This Line").split(/\s+/).length <= 4);

    const boyTopic = makeContentPackage({
      topic: {
        ...makeContentPackage().topic,
        keywords: ["math", "astro", "boy"],
      },
    });
    assert.equal(pickThumbnailPartner(boyTopic), "amy-boy");
    assert.equal(
      resolveThumbnailHeadline(
        makeContentPackage({
          title: "Morning routine for kids",
          hook: "Build a calm habit",
          topic: {
            ...makeContentPackage().topic,
            title: "Routines",
            keywords: ["routine"],
          },
        }),
      ),
      "Routine Magic",
    );
  });

  it("generates 1280×720 assets under 2MB with intelligence report", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-thumb-"));
    const pack = generatePublishThumbnail({
      contentPackage: makeContentPackage({
        title: "Daily Learning with AmyNest",
        hook: "Homework feels easier with a guide",
      }),
      outputDir: dir,
      headlineOverride: "Daily Learning",
    });

    assert.equal(pack.version, "2.0.0");
    assert.equal(pack.headline, "Daily Learning");
    assert.ok(existsSync(pack.assets.jpgPath));
    assert.ok(existsSync(pack.assets.webpPath));
    assert.ok(existsSync(pack.assets.previewPath));
    assert.ok(existsSync(pack.reportPath));
    assert.ok(statSync(pack.assets.jpgPath).size < 2 * 1024 * 1024);
    assert.equal(pack.quality.ok, true, pack.quality.summary);
    assert.ok(pack.intelligence);
    assert.ok(existsSync(pack.intelligence!.intelligenceReportPath));
    assert.match(
      readFileSync(pack.intelligence!.intelligenceReportPath, "utf8"),
      /Thumbnail Intelligence Report|Predicted CTR|Mobile preview/,
    );
  });

  it("builds A/B/C variants and picks highest predicted CTR", () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-thumb-ab-"));
    const variants = generateThumbnailVariants({
      contentPackage: makeContentPackage({
        title: "Speak better with Amy",
        hook: "Clearer speech starts today",
      }),
      outputDir: dir,
    });
    assert.equal(variants.length, 3);
    assert.deepEqual(
      variants.map((v) => v.id),
      ["A", "B", "C"],
    );
    assert.ok(variants.every((v) => v.predictedCtr > 0));
    const best = chooseBestVariant(variants);
    assert.ok(["A", "B", "C"].includes(best.id));
    assert.ok(
      variants.every((v) => v.predictedCtr <= best.predictedCtr + 0.05),
    );
    assert.ok(predictCtrPercent(best.metrics) > 0);
  });

  it("runThumbnailEngine selects a variant and writes intelligence report", async () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-thumb-run-"));
    const pack = await runThumbnailEngine({
      contentPackage: makeContentPackage({
        title: "Happy reading time",
        hook: "Kids love story time",
      }),
      outputDir: dir,
      applyCover: false,
      variants: true,
      youtube: {
        videoId: "abc",
        accessToken: "tok",
        skipStatusCheck: true,
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: { message: "shorts" } }), {
            status: 403,
          }),
      },
    });

    assert.equal(pack.version, "2.0.0");
    assert.ok(pack.intelligence);
    assert.ok(pack.intelligence!.variants.length === 3);
    assert.ok(pack.intelligence!.predictedCtr > 0);
    assert.match(pack.intelligence!.hookAlignment, /continuous experience/i);
    assert.ok(existsSync(join(dir, "THUMBNAIL_INTELLIGENCE_REPORT.md")));
    assert.equal(pack.upload.success, false);
    assert.match(pack.upload.logLine, /unsupported|First-frame/i);
  });

  it("checks YouTube thumbnail status from metadata", async () => {
    const status = await checkYouTubeThumbnailStatus({
      videoId: "vid123",
      accessToken: "tok",
      waitMs: 0,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                snippet: {
                  thumbnails: {
                    default: { url: "https://i.ytimg.com/vi/vid123/default.jpg" },
                    medium: { url: "https://i.ytimg.com/vi/vid123/mqdefault.jpg" },
                    high: { url: "https://i.ytimg.com/vi/vid123/hqdefault.jpg" },
                  },
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });
    assert.equal(status.checked, true);
    assert.equal(status.shortsLikelyUsesFirstFrame, true);
    assert.match(status.evidence, /first-frame|Likely Shorts/i);
  });

  it("logs unsupported upload fallback without throwing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "amynest-thumb-up-"));
    const pack = generatePublishThumbnail({
      contentPackage: makeContentPackage(),
      outputDir: dir,
      headlineOverride: "Happy Reading",
    });

    const result = await uploadYouTubeThumbnail({
      videoId: "testVideoId",
      thumbnailJpgPath: pack.assets.jpgPath,
      accessToken: "fake-token",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { message: "forbidden for shorts" } }), {
          status: 403,
        }),
    });

    assert.equal(result.success, false);
    assert.equal(result.unsupported, true);
    assert.match(
      result.logLine,
      /Thumbnail upload unsupported\. First-frame cover strategy used\./,
    );
  });
});
