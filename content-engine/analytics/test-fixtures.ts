import { makeContentPackage } from "../storyboard/test-fixtures.js";
import type { PublishedVideo } from "../types/published-video.js";
import { PUBLISHED_VIDEO_VERSION } from "../types/published-video.js";

export function makePublishedVideo(
  overrides: Partial<PublishedVideo> & { videoId?: string } = {},
): PublishedVideo {
  const videoId = overrides.videoId ?? "mock_analytics_001";
  return {
    id: `pv_${videoId}`,
    version: PUBLISHED_VIDEO_VERSION,
    videoId,
    url: `https://youtube.com/shorts/${videoId}`,
    publishedAt: "2026-07-26T03:30:00.000Z",
    uploadedAt: "2026-07-26T03:25:00.000Z",
    visibility: "public",
    metadata: {
      title: "Gentle Discipline That Actually Works | AmyNest AI",
      description: "Gentle discipline tips for parents. Try AmyNest AI.",
      tags: ["AmyNest", "Parenting", "Shorts"],
      categoryId: "22",
      language: "en-IN",
      playlistId: "AmyNest Shorts",
      visibility: "public",
      license: "youtube",
      madeForKids: false,
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
      playlistName: "Parent Tips",
    },
    provider: "mock",
    thumbnail: {
      path: "brand://amynest-default-thumb.jpg",
      source: "branding-default",
      applied: false,
    },
    schedule: {
      mode: "immediate",
      visibility: "public",
      publishAt: "2026-07-26T03:30:00.000Z",
      timezone: "Asia/Kolkata",
    },
    verification: {
      ok: true,
      videoExists: true,
      thumbnailApplied: true,
      metadataApplied: true,
      visibilityCorrect: true,
      durationMatch: true,
      resolutionMatch: true,
      issues: [],
      checkedAt: "2026-07-26T03:31:00.000Z",
    },
    retryHistory: [],
    notifications: [],
    auditLog: [],
    checksum: "analytics-fixture-checksum",
    renderPackageId: "rp_analytics_fixture",
    telemetry: {
      uploadDurationMs: 20,
      apiLatencyMs: 5,
      retries: 0,
      quotaUnits: 1600,
      failures: 0,
      provider: "mock",
      verificationMs: 2,
    },
    ...overrides,
  };
}

export { makeContentPackage };
