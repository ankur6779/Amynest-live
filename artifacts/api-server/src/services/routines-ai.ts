import { getOpenAiClient } from "./ai-runtime.js";

export type OpenAiJsonClient = {
  chat: {
    completions: {
      create: (p: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: string };
        max_completion_tokens?: number;
      }) => Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
};

/** Worker-safe OpenAI JSON completion (used by routine generation + meal enrichment). */
export async function runOpenAiJsonChat(
  messages: Array<{ role: "system" | "user"; content: string }>,
  maxCompletionTokens: number,
  client?: OpenAiJsonClient,
): Promise<string> {
  const openai = client ?? (await getOpenAiClient());
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: { type: "json_object" },
    max_completion_tokens: maxCompletionTokens,
  });
  return completion.choices[0]?.message?.content ?? "{}";
}
