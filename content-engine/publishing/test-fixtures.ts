import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import type { RenderPackage } from "../types/render-package.js";
import { RENDER_PACKAGE_VERSION } from "../types/render-package.js";

export function makeRenderPackage(
  overrides: Partial<RenderPackage> = {},
): RenderPackage {
  const dir = mkdtempSync(join(tmpdir(), "amynest-publish-"));
  const videoPath = join(dir, "video.mp4");
  writeFileSync(videoPath, Buffer.from("AMYNEST_RENDER_V1\nphase6-fixture"));
  return {
    id: "rp_phase6_fixture",
    version: RENDER_PACKAGE_VERSION,
    createdAt: "2026-07-27T00:00:00.000Z",
    storyboardId: "sb_phase6",
    assetPackageId: "ap_phase6",
    videoPath,
    duration: 30,
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    codec: "h264",
    audioCodec: "aac",
    container: "mp4",
    checksum: "fixturechecksumphase6",
    renderMetadata: {
      jobId: "job_phase6",
      storyboardId: "sb_phase6",
      assetPackageId: "ap_phase6",
      compositionFingerprint: "fp_phase6",
      renderer: "mock",
      outputDirectory: dir,
      subtitleMode: "burned-in",
      watermarkApplied: true,
      createdAt: "2026-07-27T00:00:00.000Z",
      artifacts: {},
    },
    telemetry: {
      renderTimeMs: 12,
      encodingTimeMs: 3,
      frames: 900,
      droppedFrames: 0,
      cacheHit: false,
      provider: "mock",
    },
    validation: { ok: true, errors: [], warnings: [] },
    progressLog: [],
    ...overrides,
  };
}

export { makeContentPackage };
