import {
  buildXfadeFilterComplex,
  buildXfadeSteps,
} from "../../scene-composer/stitch.js";
import type { ComposerTransition } from "../../scene-composer/types.js";
import type { CompositionPlan, HardwareAcceleration } from "../../types/render-package.js";
import type { FfmpegFilterCapabilities } from "./capabilities.js";
import { isRealMediaPath, resolveMediaFsPath } from "./media-path.js";

export interface FfmpegCommand {
  args: string[];
  filterComplex: string;
}

export interface BuildFfmpegCommandOptions {
  subtitleAssPath?: string;
  capabilities?: Partial<FfmpegFilterCapabilities>;
}

/**
 * Build a deterministic ffmpeg command from a composition plan.
 * Virtual asset URIs map to lavfi color generators so rendering works
 * without local binary media files. Real filesystem paths (e.g. Veo MP4s)
 * are used as media inputs and scaled/padded to the composition frame.
 *
 * Text overlays (drawtext/ass) are skipped when the local ffmpeg build
 * does not include those optional filters (common on Homebrew builds).
 */
export function buildFfmpegCommand(
  plan: CompositionPlan,
  outputPath: string,
  hardwareAcceleration: HardwareAcceleration,
  subtitleAssPathOrOptions?: string | BuildFfmpegCommandOptions,
): FfmpegCommand {
  const options: BuildFfmpegCommandOptions =
    typeof subtitleAssPathOrOptions === "string" || subtitleAssPathOrOptions === undefined
      ? { subtitleAssPath: subtitleAssPathOrOptions }
      : subtitleAssPathOrOptions;
  const canDrawText = options.capabilities?.drawtext === true;
  const canAss = options.capabilities?.ass === true;
  const subtitleAssPath = options.subtitleAssPath;

  const filters: string[] = [];
  const inputs: string[] = [];
  let firstRealVideoIndex: number | null = null;

  plan.visuals.forEach((layer, index) => {
    const duration = Math.max(0.1, (layer.endFrame - layer.startFrame) / plan.fps);
    if (isRealMediaPath(layer.sourcePath)) {
      if (firstRealVideoIndex === null) firstRealVideoIndex = index;
      const fsPath = resolveMediaFsPath(layer.sourcePath);
      inputs.push("-i", fsPath);
      filters.push(
        `[${index}:v]scale=${plan.width}:${plan.height}:force_original_aspect_ratio=decrease,` +
          `pad=${plan.width}:${plan.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${plan.fps},` +
          `trim=duration=${duration.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v${index}]`,
      );
      return;
    }

    const color = (layer.gradient?.from ?? layer.color ?? "#1B4D6E").replace("#", "0x");
    inputs.push(
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=${plan.width}x${plan.height}:d=${duration.toFixed(3)}:r=${plan.fps}`,
    );
    filters.push(`[${index}:v]setsar=1,format=yuv420p[v${index}]`);
  });

  let videoLabel = "v0";
  if (plan.visuals.length === 1) {
    filters.push(`[v0]null[vbase]`);
    videoLabel = "vbase";
  } else {
    const useSeamlessXfade =
      process.env.AMYNEST_SEAMLESS_STITCH !== "0" &&
      plan.transitions.some((t) => t.type !== "Cut" && t.durationSeconds > 0);

    if (useSeamlessXfade) {
      // Scene Composer seamless stitch — xfade between clips so joins feel directed.
      const clipDurations = plan.visuals.map(
        (layer) => Math.max(0.1, (layer.endFrame - layer.startFrame) / plan.fps),
      );
      const composerTransitions: ComposerTransition[] = plan.transitions.map((t) => ({
        fromSceneId: t.fromSceneId,
        toSceneId: t.toSceneId,
        type: t.type,
        durationSeconds: t.durationSeconds,
        brandPurpleWash: t.type === "Dissolve" || t.type === "Fade",
      }));
      const steps = buildXfadeSteps({
        clipDurations,
        transitions: composerTransitions,
      });
      if (steps.length > 0) {
        filters.push(buildXfadeFilterComplex(steps));
        videoLabel = steps[steps.length - 1]!.outLabel;
      } else {
        const concatInputs = plan.visuals.map((_, i) => `[v${i}]`).join("");
        filters.push(
          `${concatInputs}concat=n=${plan.visuals.length}:v=1:a=0[vconcat]`,
        );
        videoLabel = "vconcat";
      }
    } else {
      const concatInputs = plan.visuals.map((_, i) => `[v${i}]`).join("");
      filters.push(
        `${concatInputs}concat=n=${plan.visuals.length}:v=1:a=0[vconcat]`,
      );
      videoLabel = "vconcat";

      // Approximate non-cut transitions with edge fades on the master timeline.
      const fadeTransitions = plan.transitions.filter(
        (t) => t.type !== "Cut" && t.durationSeconds > 0,
      );
      if (fadeTransitions.length > 0) {
        const first = fadeTransitions[0]!;
        filters.push(
          `[${videoLabel}]fade=t=in:st=0:d=${Math.min(0.4, first.durationSeconds).toFixed(3)}[vfade]`,
        );
        videoLabel = "vfade";
      }
    }
  }

  if (plan.subtitles.mode === "burned-in" && subtitleAssPath && canAss) {
    const escaped = subtitleAssPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    filters.push(`[${videoLabel}]ass=${escaped}[vsub]`);
    videoLabel = "vsub";
  } else if (plan.subtitles.mode === "burned-in" && canDrawText) {
    // Fallback single CTA/caption burn-in without ASS dependency.
    const cue = plan.subtitles.cues[0];
    if (cue) {
      const text = sanitizeDrawText(cue.text);
      filters.push(
        `[${videoLabel}]drawtext=text='${text}':fontsize=42:fontcolor=white:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h-${plan.subtitles.safeMargins.bottom}[vsub]`,
      );
      videoLabel = "vsub";
    }
  }

  if (plan.watermark.enabled && canDrawText) {
    const x = "w-220";
    const y = plan.watermark.position === "top-right" ? "48" : "h-96";
    filters.push(
      `[${videoLabel}]drawtext=text='AmyNest':fontsize=28:fontcolor=white@0.85:x=${x}:y=${y}[vwm]`,
    );
    videoLabel = "vwm";
    if (plan.watermark.endCardEnabled) {
      const cta = sanitizeDrawText(plan.watermark.ctaText).slice(0, 48);
      const start = Math.max(0, plan.timeline.totalSeconds - 3).toFixed(3);
      filters.push(
        `[${videoLabel}]drawtext=text='${cta}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=h-260:enable='gte(t\\,${start})'[vend]`,
      );
      videoLabel = "vend";
    }
  }

  filters.push(`[${videoLabel}]format=yuv420p[vout]`);

  const videoInputCount = plan.visuals.length;
  const totalSeconds = plan.timeline.totalSeconds.toFixed(3);
  inputs.push(
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:sample_rate=48000:duration=${totalSeconds}`,
  );
  inputs.push(
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=220:sample_rate=48000:duration=${totalSeconds}`,
  );
  const narrIdx = videoInputCount;
  const musicIdx = videoInputCount + 1;
  // Keep synthetic audio mix for reliability across lavfi + file inputs.
  // Real Veo clips retain native audio in the raw download / test-veo pad path.
  void firstRealVideoIndex;
  filters.push(
    `[${narrIdx}:a]volume=${plan.audio.masterVolume.toFixed(2)}[a_narr]`,
    `[${musicIdx}:a]volume=${Math.max(0.05, 1 - plan.audio.duckingLevel).toFixed(2)}[a_music]`,
    `[a_narr][a_music]amix=inputs=2:duration=longest:dropout_transition=0.2[aout]`,
  );

  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-r",
    String(plan.fps),
    "-c:v",
    mapVideoCodec(plan.codec, hardwareAcceleration),
    "-b:v",
    plan.bitrate,
    "-c:a",
    mapAudioCodec(plan.audioCodec),
    "-shortest",
    outputPath,
  ];

  return { args, filterComplex: filters.join(";") };
}

function sanitizeDrawText(text: string): string {
  return text
    .replace(/\n/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "")
    .replace(/:/g, "\\:")
    .replace(/,/g, " ")
    .replace(/'/g, "")
    .replace(/%/g, "")
    .trim();
}

function mapVideoCodec(codec: CompositionPlan["codec"], hw: HardwareAcceleration): string {
  if (hw === "videotoolbox" && (codec === "h264" || codec === "h265")) {
    return codec === "h265" ? "hevc_videotoolbox" : "h264_videotoolbox";
  }
  if (hw === "nvenc" && (codec === "h264" || codec === "h265")) {
    return codec === "h265" ? "hevc_nvenc" : "h264_nvenc";
  }
  switch (codec) {
    case "h265":
      return "libx265";
    case "vp9":
      return "libvpx-vp9";
    case "prores":
      return "prores_ks";
    default:
      return "libx264";
  }
}

function mapAudioCodec(codec: CompositionPlan["audioCodec"]): string {
  switch (codec) {
    case "opus":
      return "libopus";
    case "pcm_s16le":
      return "pcm_s16le";
    default:
      return "aac";
  }
}
