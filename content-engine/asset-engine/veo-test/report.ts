import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GeneratedVideoAsset } from "../../types/generated-video.js";
import type { VideoValidationResult } from "./validate.js";

export interface TestVeoReportInput {
  ok: boolean;
  prompt: string;
  negativePrompt?: string;
  generated?: GeneratedVideoAsset;
  rawValidation?: VideoValidationResult;
  finalVideoPath?: string;
  finalValidation?: VideoValidationResult;
  renderPackageId?: string;
  generationTimeMs?: number;
  errors: string[];
  warnings: string[];
  startedAt: string;
  finishedAt: string;
  model: string;
  provider: string;
}

export async function writeTestVeoReport(
  reportPath: string,
  input: TestVeoReportInput,
): Promise<string> {
  const md = renderTestVeoReportMarkdown(input);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, md, "utf8");
  return md;
}

export function renderTestVeoReportMarkdown(input: TestVeoReportInput): string {
  const gen = input.generated;
  const lines = [
    `# TEST_VEO_REPORT`,
    ``,
    `**Status:** ${input.ok ? "PASS" : "FAIL"}`,
    `**Started:** ${input.startedAt}`,
    `**Finished:** ${input.finishedAt}`,
    `**Provider:** ${input.provider}`,
    `**Model:** ${input.model}`,
    ``,
    `## Prompt used`,
    ``,
    "```",
    input.prompt,
    "```",
    ``,
  ];

  if (input.negativePrompt) {
    lines.push(`## Negative prompt`, ``, input.negativePrompt, ``);
  }

  lines.push(`## Generation time`, ``);
  lines.push(
    `- Wall clock: **${input.generationTimeMs ?? gen?.generationTime ?? "n/a"} ms**`,
  );
  if (gen) {
    lines.push(`- Poll attempts: **${gen.metadata.pollAttempts}**`);
    lines.push(`- Operation: \`${gen.metadata.operationName}\``);
  }
  lines.push(``);

  lines.push(`## Provider metadata`, ``);
  if (gen) {
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| videoPath | \`${gen.videoPath}\` |`);
    lines.push(`| duration (requested) | ${gen.duration}s |`);
    lines.push(`| resolution | ${gen.resolution} |`);
    lines.push(`| fps | ${gen.fps} |`);
    lines.push(`| checksum | \`${gen.checksum}\` |`);
    lines.push(`| file size | ${gen.metadata.fileSizeBytes} bytes |`);
    lines.push(`| cost estimate | $${gen.metadata.costEstimateUsd} |`);
    lines.push(`| hasAudio | ${gen.metadata.hasAudio} |`);
    lines.push(`| mimeType | ${gen.metadata.mimeType} |`);
  } else {
    lines.push(`_No generated asset (generation did not complete)._`);
  }
  lines.push(``);

  lines.push(`## Validation (raw Veo clip)`, ``);
  lines.push(...formatValidation(input.rawValidation));
  lines.push(``);

  lines.push(`## Final render`, ``);
  lines.push(`- Path: \`${input.finalVideoPath ?? "n/a"}\``);
  lines.push(`- Render package id: \`${input.renderPackageId ?? "n/a"}\``);
  lines.push(``);
  lines.push(...formatValidation(input.finalValidation));
  lines.push(``);

  lines.push(`## Errors`, ``);
  if (input.errors.length === 0) lines.push(`- None`);
  else for (const e of input.errors) lines.push(`- ${e}`);
  lines.push(``);

  lines.push(`## Warnings`, ``);
  if (input.warnings.length === 0) lines.push(`- None`);
  else for (const w of input.warnings) lines.push(`- ${w}`);
  lines.push(``);

  lines.push(`## Notes`, ``);
  lines.push(
    `- Veo API duration is limited to 4/6/8 seconds; AmyNest pads the final Short toward ~10 seconds with an end-card beat.`,
  );
  lines.push(
    `- \`OPENAI_API_KEY\` (GPT) is separate from \`GEMINI_API_KEY\` (Veo). Do not mix them.`,
  );
  lines.push(``);

  return lines.join("\n");
}

function formatValidation(result?: VideoValidationResult): string[] {
  if (!result) return ["_Not run._"];
  return [
    `| Check | Result |`,
    `|-------|--------|`,
    `| ok | ${result.ok} |`,
    `| exists | ${result.exists} |`,
    `| file size | ${result.fileSizeBytes} bytes |`,
    `| duration | ${result.durationSeconds ?? "n/a"} s |`,
    `| resolution | ${result.width ?? "?"}x${result.height ?? "?"} |`,
    `| fps | ${result.fps ?? "n/a"} |`,
    `| vertical compatible | ${result.verticalCompatible} |`,
    `| corrupt | ${result.corrupt} |`,
    `| empty frames suspected | ${result.emptyFramesSuspected} |`,
    ``,
    ...(result.errors.length
      ? [`Errors: ${result.errors.join("; ")}`]
      : ["Errors: none"]),
    ...(result.warnings.length
      ? [`Warnings: ${result.warnings.join("; ")}`]
      : ["Warnings: none"]),
  ];
}
