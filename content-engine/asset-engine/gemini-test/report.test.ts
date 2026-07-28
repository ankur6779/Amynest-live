import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderTestGeminiReportMarkdown } from "./report.js";

describe("TEST_GEMINI_REPORT renderer", () => {
  it("includes models, latency, assets, and validation sections", () => {
    const md = renderTestGeminiReportMarkdown({
      ok: true,
      recommendation: "READY",
      startedAt: "2026-07-28T00:00:00.000Z",
      finishedAt: "2026-07-28T00:01:00.000Z",
      generationTimeMs: 60_000,
      models: {
        script: "gemini-3.6-flash",
        image: "imagen-4.0-fast-generate-001",
        video: "veo-3.1-fast-generate-preview",
        voice: "gemini-3.1-flash-tts-preview",
        music: "(disabled)",
      },
      modelHealth: [
        {
          model: "gemini-3.6-flash",
          ok: true,
          message: "reachable",
          latencyMs: 120,
        },
      ],
      prompt: "Golden sunrise bedroom scene",
      scriptText: "Every great habit starts with one small step.",
      latencies: { scriptMs: 400, imageMs: 2_000, videoMs: 40_000, ttsMs: 1_500 },
      costEstimateUsd: 0.42,
      assets: {
        imagePath: "/tmp/hero.png",
        videoPath: "/tmp/raw.mp4",
        ttsPath: "/tmp/narration.wav",
        finalVideoPath: "/tmp/final.mp4",
      },
      finalMp4: {
        fileSizeBytes: 1_234_567,
        width: 1080,
        height: 1920,
        durationSeconds: 10,
        fps: 30,
        verticalCompatible: true,
        corrupt: false,
      },
      renderPackageId: "render-1",
      renderDurationMs: 900,
      errors: [],
      warnings: [],
    });

    assert.match(md, /\*\*Status:\*\* PASS/);
    assert.match(md, /\*\*Production recommendation:\*\* READY/);
    assert.match(md, /gemini-3\.6-flash/);
    assert.match(md, /imagen-4\.0-fast-generate-001/);
    assert.match(md, /veo-3\.1-fast-generate-preview/);
    assert.match(md, /\*\*Cost estimate:\*\* \$0\.42/);
    assert.match(md, /\/tmp\/final\.mp4/);
    assert.match(md, /1080x1920/);
    assert.match(md, /Image generated: true/);
    assert.match(md, /- None/);
  });
});
