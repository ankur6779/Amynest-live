import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PUBLISHING_SETTINGS } from "../../config/publishing.js";
import { makeContentPackage } from "../test-fixtures.js";
import { buildPublishMetadata, resolveThumbnail } from "./engine.js";

describe("publishing metadata", () => {
  it("builds metadata from ContentPackage with overrides", () => {
    const content = makeContentPackage();
    const metadata = buildPublishMetadata(content, DEFAULT_PUBLISHING_SETTINGS, {
      title: "Override Title",
      visibility: "unlisted",
      tags: ["CustomTag", "AmyNest"],
    });

    assert.equal(metadata.title, "Override Title");
    assert.equal(metadata.visibility, "unlisted");
    assert.equal(metadata.language, content.language);
    assert.ok(metadata.tags.includes("CustomTag"));
    assert.ok(metadata.description.includes(content.cta));
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
