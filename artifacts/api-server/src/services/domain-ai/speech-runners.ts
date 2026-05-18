import { speechToText, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server";

export async function runSpeechTranscribe(input: {
  audioBase64: string;
  mimeType: string;
}): Promise<{ text: string }> {
  const buffer = Buffer.from(input.audioBase64, "base64");
  const compatible = await ensureCompatibleFormat(buffer);
  const text = await speechToText(compatible.buffer, compatible.format);
  return { text };
}
