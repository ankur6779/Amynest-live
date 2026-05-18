/**
 * OpenAI client — import only from worker-side AI handlers, never from route files.
 */
export async function getOpenAiClient() {
  const { openai } = await import("@workspace/integrations-openai-ai-server");
  return openai;
}
