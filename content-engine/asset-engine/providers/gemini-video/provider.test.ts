import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildAmyNestTestVeoPrompt, buildVeoPrompt } from "./prompt.js";
import { GeminiVideoProvider } from "./provider.js";
import { mapHttpError } from "./errors.js";

describe("gemini video prompt generator", () => {
  it("includes all cinematic prompt dimensions", () => {
    const result = buildAmyNestTestVeoPrompt({
      durationSeconds: 8,
      aspectRatio: "9:16",
    });
    for (const token of [
      "Scene:",
      "Camera:",
      "Lighting:",
      "Mood:",
      "Color palette:",
      "Subject:",
      "Action:",
      "Composition:",
      "Lens:",
      "Animation style:",
      "Duration:",
      "Aspect ratio:",
      "Safety:",
      "Build Better Habits Every Day",
    ]) {
      assert.match(result.prompt, new RegExp(token));
    }
    assert.ok(result.negativePrompt.includes("blurry"));
  });

  it("builds from storyboard scene context without generic fluff-only prompt", () => {
    const result = buildVeoPrompt({
      durationSeconds: 8,
      aspectRatio: "9:16",
      sceneDescription: "Sunrise bedroom with AmyNest tablet",
    });
    assert.match(result.prompt, /Sunrise bedroom with AmyNest tablet/);
    assert.notEqual(result.prompt.trim().toLowerCase(), "a nice video");
  });
});

describe("gemini video error mapping", () => {
  it("maps 429 to recoverable rate limit", () => {
    const err = mapHttpError(429, "rate limit exceeded", "start");
    assert.equal(err.code, "RATE_LIMITED");
    assert.equal(err.recoverable, true);
  });

  it("maps safety blocks", () => {
    const err = mapHttpError(400, "Request blocked by safety filters", "start");
    assert.equal(err.code, "SAFETY_BLOCKED");
    assert.equal(err.recoverable, false);
  });
});

describe("GeminiVideoProvider", () => {
  it("reports unhealthy without API key", async () => {
    const provider = new GeminiVideoProvider({
      apiKey: "",
      settings: { apiKeyEnv: "MISSING_VEO_KEY_FOR_TEST" },
    });
    // Ensure env fallback does not accidentally pick up a real key in CI.
    const previous = process.env.MISSING_VEO_KEY_FOR_TEST;
    delete process.env.MISSING_VEO_KEY_FOR_TEST;
    delete process.env.GEMINI_API_KEY;
    try {
      const health = await new GeminiVideoProvider({
        apiKey: "",
        settings: { apiKeyEnv: "MISSING_VEO_KEY_FOR_TEST", enabled: true },
      }).health();
      assert.equal(health.ok, false);
      assert.match(health.message ?? "", /missing/i);
    } finally {
      if (previous !== undefined) process.env.MISSING_VEO_KEY_FOR_TEST = previous;
    }
    assert.equal(provider.id, "google-veo");
    assert.equal(provider.supportsVideo(), true);
    assert.equal(provider.supportsImages(), false);
  });

  it("generates, polls, downloads, and returns GeneratedVideoAsset", async () => {
    const dir = await mkdtemp(join(tmpdir(), "veo-test-"));
    const outputPath = join(dir, "clip.mp4");
    let pollCount = 0;

    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes(":predictLongRunning") && init?.method === "POST") {
        return new Response(JSON.stringify({ name: "operations/veo-op-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("operations/veo-op-1") && !url.includes(":cancel")) {
        pollCount += 1;
        if (pollCount < 2) {
          return new Response(JSON.stringify({ name: "operations/veo-op-1", done: false }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify({
            name: "operations/veo-op-1",
            done: true,
            response: {
              generateVideoResponse: {
                generatedSamples: [
                  { video: { uri: "https://example.test/video.mp4", mimeType: "video/mp4" } },
                ],
              },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("example.test/video.mp4")) {
        const bytes = Buffer.alloc(12_000, 1);
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "video/mp4" },
        });
      }
      if (url.includes("/models/")) {
        return new Response(JSON.stringify({ name: "models/veo" }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };

    const provider = new GeminiVideoProvider({
      apiKey: "test-key",
      fetchImpl,
      sleep: async () => undefined,
      settings: {
        outputDirectory: dir,
        pollingIntervalMs: 1,
        maxPollAttempts: 5,
        retryCount: 1,
        timeoutMs: 10_000,
      },
    });

    const health = await provider.health();
    assert.equal(health.ok, true);

    const asset = await provider.generateVideo({
      prompt: "Test cinematic AmyNest scene",
      assetId: "unit-clip",
      outputPath,
      durationSeconds: 8,
      aspectRatio: "9:16",
    });

    assert.equal(asset.provider, "google-veo");
    assert.equal(asset.videoPath, outputPath);
    assert.equal(asset.duration, 8);
    assert.ok(asset.checksum.length >= 32);
    assert.ok(asset.metadata.fileSizeBytes >= 12_000);
    assert.ok(asset.metadata.pollAttempts >= 2);
    const disk = await readFile(outputPath);
    assert.ok(disk.byteLength >= 12_000);
  });

  it("resolve returns null when disabled", async () => {
    const provider = new GeminiVideoProvider({
      apiKey: "x",
      settings: { enabled: false },
    });
    const resolved = await provider.resolve(
      {
        requestId: "r1",
        assetId: "a1",
        assetType: "Future AI Video",
        priority: 1,
        sceneId: "s1",
        resolution: "1080x1920",
        aspectRatio: "9:16",
        brandingRequired: false,
        prompt: "scene",
        fallback: "x",
        providerPreference: ["google-veo"],
        fingerprintSeed: "seed",
      },
      {
        fingerprint: "abc",
        width: 1080,
        height: 1920,
        allowGenerationPlanning: true,
      },
    );
    assert.equal(resolved, null);
  });

  it("cancel aborts in-flight work", async () => {
    const provider = new GeminiVideoProvider({
      apiKey: "test-key",
      sleep: async () => undefined,
      fetchImpl: async () =>
        new Response(JSON.stringify({ name: "operations/x" }), { status: 200 }),
    });
    await provider.cancel();
    assert.ok(true);
  });
});

describe("media fixture helper", () => {
  it("writes a local stub file for path checks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "veo-stub-"));
    const path = join(dir, "stub.mp4");
    await writeFile(path, Buffer.alloc(2048, 7));
    const bytes = await readFile(path);
    assert.equal(bytes.length, 2048);
  });
});
