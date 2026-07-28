import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildFfmpegCommand } from "./command-builder.js";
import { isRealMediaPath, resolveMediaFsPath } from "./media-path.js";
import type { CompositionPlan } from "../../types/render-package.js";

describe("ffmpeg media path helpers", () => {
  it("rejects virtual schemes and accepts real files", async () => {
    assert.equal(isRealMediaPath("lavfi://x"), false);
    assert.equal(isRealMediaPath("planned://google-veo/abc"), false);
    assert.equal(isRealMediaPath("placeholder://x"), false);

    const dir = await mkdtemp(join(tmpdir(), "ffmpeg-media-"));
    const file = join(dir, "clip.mp4");
    await writeFile(file, Buffer.alloc(1024, 2));
    assert.equal(isRealMediaPath(file), true);
    assert.equal(isRealMediaPath(`file://${file}`), true);
    assert.equal(resolveMediaFsPath(`file://${file}`), file);
  });

  it("uses -i file for real media layers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ffmpeg-cmd-"));
    const file = join(dir, "hero.mp4");
    await writeFile(file, Buffer.alloc(2048, 3));

    const plan = {
      width: 1080,
      height: 1920,
      fps: 30,
      codec: "h264",
      audioCodec: "aac",
      bitrate: "6M",
      timeline: { totalSeconds: 8, totalFrames: 240, clips: [] },
      visuals: [
        {
          sceneId: "s1",
          sourceKind: "video",
          sourcePath: file,
          startFrame: 0,
          endFrame: 240,
        },
      ],
      transitions: [],
      audio: { masterVolume: 0.8, duckingLevel: 0.3 },
      subtitles: {
        mode: "none",
        cues: [],
        safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      watermark: {
        enabled: false,
        position: "bottom-right",
        endCardEnabled: false,
        ctaText: "",
      },
    } as unknown as CompositionPlan;

    const cmd = buildFfmpegCommand(plan, join(dir, "out.mp4"), "none");
    assert.ok(cmd.args.includes("-i"));
    assert.ok(cmd.args.includes(file));
    assert.match(cmd.filterComplex, /scale=1080:1920/);
  });
});
