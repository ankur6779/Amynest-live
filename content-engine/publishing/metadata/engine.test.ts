import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PUBLISHING_SETTINGS } from "../../config/publishing.js";
import { makeContentPackage } from "../test-fixtures.js";
import {
  buildPublishMetadata,
  clampTitle,
  resolveThumbnail,
} from "./engine.js";
import { buildOptimizedDescription } from "./description-template.js";
import { resolvePlaylistName } from "./playlists.js";
import { generateSeoTags } from "./seo-tags.js";
import { writeYouTubeMetadataReport } from "./report.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("publishing metadata", () => {
  it("builds optimized metadata with AmyNest AI title, SEO description, and tags", () => {
    const content = makeContentPackage();
    const metadata = buildPublishMetadata(content, DEFAULT_PUBLISHING_SETTINGS, {
      visibility: "unlisted",
    });

    assert.ok(metadata.title.includes("AmyNest AI"));
    assert.ok(metadata.title.length <= 70);
    assert.equal(metadata.visibility, "unlisted");
    assert.equal(metadata.madeForKids, false);
    assert.equal(metadata.selfDeclaredMadeForKids, false);
    assert.equal(metadata.containsSyntheticMedia, true);
    assert.ok(metadata.description.includes("Parenting feels easier with AmyNest AI"));
    assert.ok(metadata.description.includes("Google Play"));
    assert.ok(metadata.description.includes("App Store"));
    assert.ok(metadata.tags.length >= 15 && metadata.tags.length <= 20);
    assert.ok(metadata.playlistName);
    assert.ok(metadata.polish);
    assert.equal(metadata.polish!.titleVariants.length, 5);
    assert.ok(metadata.polish!.localizations.hi.title);
  });

  it("never forces Made for Kids unless explicitly overridden", () => {
    const content = makeContentPackage();
    const off = buildPublishMetadata(content, {
      ...DEFAULT_PUBLISHING_SETTINGS,
      madeForKids: false,
    });
    assert.equal(off.madeForKids, false);

    const on = buildPublishMetadata(
      content,
      DEFAULT_PUBLISHING_SETTINGS,
      { madeForKids: true },
    );
    assert.equal(on.madeForKids, true);
  });

  it("maps learning topics to Study Zone playlist", () => {
    const content = makeContentPackage({
      topic: {
        ...makeContentPackage().topic,
        category: "Learning",
        title: "Study Zone daily lesson",
        keywords: ["study zone", "lesson"],
      },
      title: "Fresh Study Zone lesson today",
    });
    assert.equal(resolvePlaylistName(content), "Study Zone");
  });

  it("generates 15–20 SEO tags", () => {
    const tags = generateSeoTags(makeContentPackage());
    assert.ok(tags.length >= 15 && tags.length <= 20);
    assert.ok(tags.some((t) => /amynest/i.test(t)));
  });

  it("clamps titles to 70 with AmyNest AI brand", () => {
    const long =
      "This is an extremely long parenting tip title about worksheets and morning chaos that would overflow";
    const t = clampTitle(long);
    assert.ok(t.length <= 70);
    assert.ok(/AmyNest AI/i.test(t));
  });

  it("builds store links into description template", () => {
    const desc = buildOptimizedDescription({
      playStoreUrl: "https://play.example/app",
      appStoreUrl: "https://apps.example/app",
      websiteUrl: "https://example.in",
      getAppUrl: "https://example.in/get-app",
    });
    assert.ok(desc.includes("https://play.example/app"));
    assert.ok(desc.includes("https://apps.example/app"));
    assert.ok(desc.includes("https://example.in/get-app"));
  });

  it("writes YOUTUBE_METADATA_REPORT.md", () => {
    const content = makeContentPackage();
    const metadata = buildPublishMetadata(content, DEFAULT_PUBLISHING_SETTINGS);
    const dir = mkdtempSync(join(tmpdir(), "yt-meta-"));
    const path = writeYouTubeMetadataReport({ metadata, outputDirectory: dir });
    const body = readFileSync(path, "utf8");
    assert.ok(body.includes("## Title"));
    assert.ok(body.includes("## Made for Kids"));
    assert.ok(body.includes("containsSyntheticMedia"));
    assert.ok(body.includes("Play Store"));
  });

  it("resolves generated, fallback, and branding thumbnails", () => {
    assert.equal(
      resolveThumbnail({ generatedPath: "/tmp/gen.jpg" }).source,
      "generated",
    );
    assert.equal(
      resolveThumbnail({ fallbackPath: "/tmp/fallback.jpg" }).source,
      "fallback",
    );
    assert.equal(resolveThumbnail({}).source, "branding-default");
  });
});
