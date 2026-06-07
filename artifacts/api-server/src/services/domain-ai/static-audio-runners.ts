import type { StaticAudioMode } from "@workspace/static-audio";
import { generateAndPersistStaticPhrase } from "../staticAudioGeneration.js";

export async function runStaticAudioGenerate(input: {
  text: string;
  mode: StaticAudioMode;
  source?: string;
}): Promise<{ hash: string; bytes: number } | null> {
  const buffer = await generateAndPersistStaticPhrase(
    input.text,
    input.mode,
    input.source ?? "worker",
  );
  if (!buffer?.byteLength) return null;
  const { getStaticAudioHash } = await import("@workspace/static-audio");
  return { hash: getStaticAudioHash(input.text.trim(), input.mode), bytes: buffer.byteLength };
}
