import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GeminiModelHealth } from "../../types/gemini-media.js";
import type { ClassifiedGeminiFailure } from "./failure.js";

export interface FinalMp4Metadata {
  fileSizeBytes?: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  fps?: number | null;
  verticalCompatible?: boolean;
  corrupt?: boolean;
}

export interface TestGeminiReportInput {
  ok: boolean;
  recommendation: "READY" | "NOT READY";
  startedAt: string;
  finishedAt: string;
  generationTimeMs: number;
  models: {
    script: string;
    image: string;
    video: string;
    voice: string;
    music: string;
  };
  modelHealth: GeminiModelHealth[];
  prompt: string;
  scriptText: string;
  latencies: Record<string, number>;
  costEstimateUsd: number;
  assets: {
    imagePath?: string;
    videoPath?: string;
    ttsPath?: string;
    musicPath?: string;
    finalVideoPath?: string;
  };
  finalMp4?: FinalMp4Metadata;
  renderPackageId?: string;
  renderDurationMs?: number;
  quotaNotes?: string[];
  failures?: ClassifiedGeminiFailure[];
  errors: string[];
  warnings: string[];
}

export async function writeTestGeminiReport(
  reportPath: string,
  input: TestGeminiReportInput,
): Promise<string> {
  const md = renderTestGeminiReportMarkdown(input);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, md, "utf8");
  return md;
}

export function renderTestGeminiReportMarkdown(input: TestGeminiReportInput): string {
  const mp4 = input.finalMp4 ?? {};
  const lines = [
    `# TEST_GEMINI_REPORT`,
    ``,
    `**Status:** ${input.ok ? "PASS" : "FAIL"}`,
    `**Production recommendation:** ${input.recommendation}`,
    `**Started:** ${input.startedAt}`,
    `**Finished:** ${input.finishedAt}`,
    `**Total generation time:** ${input.generationTimeMs} ms`,
    `**Render duration:** ${input.renderDurationMs ?? "n/a"} ms`,
    `**Cost estimate:** $${input.costEstimateUsd.toFixed(2)}`,
    ``,
    `## Models used`,
    ``,
    `| Role | Model |`,
    `|------|-------|`,
    `| Script | \`${input.models.script}\` |`,
    `| Image | \`${input.models.image}\` |`,
    `| Video | \`${input.models.video}\` |`,
    `| Voice | \`${input.models.voice}\` |`,
    `| Music | \`${input.models.music}\` |`,
    ``,
    `## Model health / latency`,
    ``,
    `| Model | OK | Latency | Message |`,
    `|-------|----|---------|---------|`,
    ...input.modelHealth.map(
      (m) =>
        `| \`${m.model}\` | ${m.ok} | ${m.latencyMs} ms | ${m.message.replace(/\|/g, "/")} |`,
    ),
    ``,
    `## Prompt`,
    ``,
    "```",
    input.prompt,
    "```",
    ``,
    `## Script`,
    ``,
    "```",
    input.scriptText,
    "```",
    ``,
    `## Provider latency`,
    ``,
    ...Object.entries(input.latencies).map(([k, v]) => `- ${k}: **${v} ms**`),
    ``,
    `## Generation status`,
    ``,
    `- Image generation: ${input.assets.imagePath ? "OK" : "FAIL"}`,
    `- Video generation: ${input.assets.videoPath ? "OK" : "FAIL"}`,
    `- TTS narration: ${input.assets.ttsPath ? "OK" : "FAIL"}`,
    `- Render pipeline: ${input.renderPackageId ? "OK" : "FAIL"}`,
    `- Final MP4: ${input.assets.finalVideoPath ? "OK" : "FAIL"}`,
    ``,
    `## Final MP4 metadata`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Path | \`${input.assets.finalVideoPath ?? "n/a"}\` |`,
    `| File size | ${mp4.fileSizeBytes != null ? `${mp4.fileSizeBytes} bytes` : "n/a"} |`,
    `| Resolution | ${mp4.width != null && mp4.height != null ? `${mp4.width}x${mp4.height}` : "n/a"} |`,
    `| Duration | ${mp4.durationSeconds != null ? `${mp4.durationSeconds.toFixed(2)}s` : "n/a"} |`,
    `| FPS | ${mp4.fps != null ? String(mp4.fps) : "n/a"} |`,
    `| Vertical 9:16 compatible | ${mp4.verticalCompatible ?? "n/a"} |`,
    `| Corrupt | ${mp4.corrupt ?? "n/a"} |`,
    ``,
    `## Downloaded assets`,
    ``,
    `| Asset | Path |`,
    `|-------|------|`,
    `| Image | \`${input.assets.imagePath ?? "n/a"}\` |`,
    `| Video | \`${input.assets.videoPath ?? "n/a"}\` |`,
    `| TTS | \`${input.assets.ttsPath ?? "n/a"}\` |`,
    `| Music | \`${input.assets.musicPath ?? "n/a"}\` |`,
    `| Final MP4 | \`${input.assets.finalVideoPath ?? "n/a"}\` |`,
    `| Render package | \`${input.renderPackageId ?? "n/a"}\` |`,
    ``,
    `## API quota`,
    ``,
    ...((input.quotaNotes?.length ?? 0) > 0
      ? (input.quotaNotes ?? []).map((n) => `- ${n}`)
      : ["- No quota headers returned by provider responses in this run."]),
    ``,
    `## Validation checklist`,
    ``,
    `- Script generated: ${Boolean(input.scriptText)}`,
    `- Image generated: ${Boolean(input.assets.imagePath)}`,
    `- Video generated: ${Boolean(input.assets.videoPath)}`,
    `- Voice generated: ${Boolean(input.assets.ttsPath)}`,
    `- Final MP4: ${Boolean(input.assets.finalVideoPath)}`,
    `- Target ~10s / 1080x1920: ${
      mp4.width === 1080 &&
      mp4.height === 1920 &&
      mp4.durationSeconds != null &&
      Math.abs(mp4.durationSeconds - 10) <= 2
        ? "PASS"
        : "REVIEW"
    }`,
    ``,
    `## Classified failures`,
    ``,
    ...((input.failures?.length ?? 0) > 0
      ? (input.failures ?? []).flatMap((f) => [
          `- **${f.classification}:** ${f.message}`,
          ...(f.rawSnippet
            ? ["", "```", f.rawSnippet.slice(0, 800), "```", ""]
            : []),
        ])
      : ["- None"]),
    ``,
    `## Errors`,
    ``,
    ...(input.errors.length ? input.errors.map((e) => `- ${e}`) : ["- None"]),
    ``,
    `## Warnings`,
    ``,
    ...(input.warnings.length ? input.warnings.map((w) => `- ${w}`) : ["- None"]),
    ``,
    `## Notes`,
    ``,
    `- Gemini media stack remains opt-in (\`AMYNEST_GEMINI_ENABLED=true\`) until READY.`,
    `- OpenAI remains available as script fallback.`,
    `- Veo API clips are 4/6/8s; final Short is padded toward ~10s with end-card.`,
    `- \`GEMINI_API_KEY\` must stay separate from \`OPENAI_API_KEY\`.`,
    ``,
  ];
  return lines.join("\n");
}
