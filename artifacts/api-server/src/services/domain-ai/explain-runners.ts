import { chatCompletionWithTimeout } from "../openai-chat.js";
import { resolveOpenAiChatModel } from "../openai-model-catalog.js";

export async function runExplainNarrative(input: {
  prompt: string;
}): Promise<{ narrative: string | undefined }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: resolveOpenAiChatModel("fast"),
      messages: [{ role: "user", content: input.prompt }],
      max_completion_tokens: 120,
      temperature: 0.6,
    },
    12_000,
  );
  return { narrative: outcome.content?.trim() ?? undefined };
}
