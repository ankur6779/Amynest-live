import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_PUBLISHING_SETTINGS } from "../../config/publishing.js";
import { makeContentPackage } from "../test-fixtures.js";
import { buildPublishMetadata } from "../metadata/engine.js";
import { buildPublishingPolish } from "./build.js";
import { buildPinnedComment } from "./pinned-comment.js";
import { buildThumbnailTitle } from "./thumbnail-title.js";
import { recommendBestUploadTime } from "./upload-timing.js";
import { writeYouTubePublishingScorecard } from "./scorecard.js";

describe("youtube publishing polish", () => {
  it("builds pinned comment with store links", () => {
    const comment = buildPinnedComment({
      websiteUrl: "https://amynest.in",
      getAppUrl: "https://amynest.in/get-app",
      playStoreUrl: "https://play.example/app",
      appStoreUrl: "https://apps.example/app",
    });
    assert.ok(comment.includes("Thanks for watching"));
    assert.ok(comment.includes("https://play.example/app"));
    assert.ok(comment.includes("Which feature would you like to see next?"));
  });

  it("builds EN + HI localizations, 5 title variants, and description variants", () => {
    const content = makeContentPackage();
    const polish = buildPublishingPolish({ content });
    assert.ok(polish.localizations.en.title);
    assert.ok(polish.localizations.hi.title.includes("AmyNest AI"));
    assert.ok(polish.localizations.hi.description.includes("पेरेंटिंग"));
    assert.equal(polish.titleVariants.length, 5);
    assert.ok(polish.descriptionVariants.short.length > 40);
    assert.ok(polish.descriptionVariants.medium.length > 80);
    assert.ok(polish.descriptionVariants.long.length > 200);
  });

  it("limits hashtags to 15 and thumbnail title to 4 words", () => {
    const content = makeContentPackage({
      topic: {
        ...makeContentPackage().topic,
        title: "Worksheet panic before school",
        keywords: ["worksheet", "panic", "study"],
      },
    });
    const polish = buildPublishingPolish({ content });
    assert.ok(polish.hashtags.all.length <= 15);
    assert.ok(polish.hashtags.primary.length > 0);
    assert.ok(polish.hashtags.trending.length > 0);
    assert.ok(polish.thumbnailTitle.split(/\s+/).length <= 4);
    assert.equal(buildThumbnailTitle(content), "Worksheet Panic");
  });

  it("defaults best upload time to 7:00 PM IST without history", () => {
    const timing = recommendBestUploadTime({ content: makeContentPackage() });
    assert.equal(timing.hour, 19);
    assert.equal(timing.timezone, "Asia/Kolkata");
    assert.equal(timing.source, "default");
  });

  it("uses continuous-learning hours when provided", () => {
    const timing = recommendBestUploadTime({
      content: makeContentPackage(),
      learnedHours: [20, 20, 18],
      learnedWeekdays: ["Monday", "Monday", "Sunday"],
    });
    assert.equal(timing.hour, 20);
    assert.equal(timing.weekday, "Monday");
    assert.equal(timing.source, "continuous-learning");
  });

  it("attaches polish + SEO score via buildPublishMetadata", () => {
    const metadata = buildPublishMetadata(
      makeContentPackage(),
      DEFAULT_PUBLISHING_SETTINGS,
    );
    assert.ok(metadata.polish);
    assert.ok(metadata.polish!.seo.score >= 0 && metadata.polish!.seo.score <= 100);
    assert.ok(metadata.polish!.scorecard.metadataScore >= 0);
    assert.ok(metadata.polish!.pinnedComment.includes("Download AmyNest AI"));
  });

  it("writes YOUTUBE_PUBLISHING_SCORECARD.md", () => {
    const content = makeContentPackage();
    const metadata = buildPublishMetadata(content, DEFAULT_PUBLISHING_SETTINGS);
    const dir = mkdtempSync(join(tmpdir(), "yt-score-"));
    const path = writeYouTubePublishingScorecard({
      metadata,
      polish: metadata.polish!,
      outputDirectory: dir,
    });
    const body = readFileSync(path, "utf8");
    assert.ok(body.includes("## Scores"));
    assert.ok(body.includes("SEO score"));
    assert.ok(body.includes("Pinned comment"));
    assert.ok(body.includes("Suggested improvements"));
  });
});
