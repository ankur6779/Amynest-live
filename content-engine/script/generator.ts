import type { AIProvider } from "../ai/provider.js";
import { ContentEngineError } from "../ai/errors.js";
import { renderPromptTemplate } from "../prompts/index.js";
import {
  getPromptTemplatesByFamily,
  resolvePromptFamily,
  type PromptTemplate,
} from "../prompts/library/templates.js";
import type { ContentGenerationInput, GeneratedScriptPayload } from "../types/content-package.js";
import { assembleDescription, normalizeDescriptionParts } from "./description-engine.js";
import { refineHashtags } from "./hashtag-engine.js";
import { parseGeneratedScriptPayload } from "./schema.js";
import { refineTitleSet } from "./title-generator.js";

export interface ScriptGenerationResult {
  payload: GeneratedScriptPayload;
  description: string;
  provider: string;
  promptIds: string[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
}

export async function generateScriptPayload(
  input: ContentGenerationInput,
  provider: AIProvider,
  options: { rewriteHint?: string } = {},
): Promise<ScriptGenerationResult> {
  const { categoryFamily, languageFamily } = resolvePromptFamily(
    input.category,
    input.language,
  );

  const categoryPrompt =
    getPromptTemplatesByFamily(categoryFamily)[0] ??
    getPromptTemplatesByFamily("parenting")[0]!;
  const languagePrompt = getPromptTemplatesByFamily(languageFamily)[0];

  const systemPrompt = composeSystemPrompt(categoryPrompt, languagePrompt, options.rewriteHint);
  const variables = toVariables(input);
  const userPrompt = renderPromptTemplate(categoryPrompt.userPromptTemplate, variables);

  if (!provider.supportsJSON()) {
    throw new ContentEngineError(
      "CONFIG_ERROR",
      `Provider ${provider.id} does not support JSON generation`,
      { recoverable: true },
    );
  }

  const result = await provider.generate({
    systemPrompt,
    userPrompt,
    responseFormat: "json",
    temperature: options.rewriteHint ? 0.4 : 0.7,
    maxTokens: 1800,
    metadata: {
      title: input.topic.title,
      category: input.category,
      ageGroup: input.ageGroup,
      language: input.language,
      duration: String(input.duration),
      videoStyle: input.videoStyle,
      cta: input.topic.cta,
      keywords: input.topic.keywords.join(", "),
    },
  });

  const parsed = parseGeneratedScriptPayload(result.text);
  const titles = refineTitleSet(parsed.titles, input.topic.title);
  const hashtags = refineHashtags(parsed.hashtags, [
    input.category.replace(/\s+/g, ""),
    ...input.topic.keywords.map((k) => k.replace(/\s+/g, "")),
  ]);
  const descriptionParts = normalizeDescriptionParts(parsed.description);
  const description = assembleDescription(descriptionParts, hashtags);

  const payload: GeneratedScriptPayload = {
    ...parsed,
    titles,
    hashtags,
    description: descriptionParts,
    keyPoints: parsed.keyPoints.slice(0, 5),
  };

  return {
    payload,
    description,
    provider: result.provider,
    promptIds: [categoryPrompt.id, languagePrompt?.id].filter(Boolean) as string[],
    usage: result.usage,
    latencyMs: result.latencyMs,
  };
}

function composeSystemPrompt(
  categoryPrompt: PromptTemplate,
  languagePrompt: PromptTemplate | undefined,
  rewriteHint?: string,
): string {
  const parts = [categoryPrompt.systemPrompt];
  if (languagePrompt) {
    parts.push(`Language directive: ${languagePrompt.systemPrompt}`);
  }
  if (rewriteHint) {
    parts.push(`REVISION REQUIRED: ${rewriteHint}`);
  }
  return parts.join("\n\n");
}

function toVariables(input: ContentGenerationInput): Record<string, string> {
  return {
    title: input.topic.title,
    category: input.category,
    ageGroup: input.ageGroup,
    language: input.language,
    duration: String(input.duration),
    videoStyle: input.videoStyle,
    cta: input.topic.cta,
    keywords: input.topic.keywords.join(", "),
  };
}
