import { createHash } from "node:crypto";
import type { StaticAudioMode } from "./types.js";

/** Content-addressed object key under `static-audio/` in GCS. */
export function getStaticAudioObjectKey(text: string, mode: StaticAudioMode = "default"): string {
  return getStaticAudioHash(text, mode);
}

export function getStaticAudioHash(text: string, mode: StaticAudioMode = "default"): string {
  return createHash("md5").update(`${mode}\0${text}`).digest("hex");
}

/** GCS object path (no bucket prefix). */
export function staticAudioGcsObjectName(text: string, mode: StaticAudioMode = "default"): string {
  return `static-audio/${getStaticAudioObjectKey(text, mode)}.mp3`;
}

export function staticAudioPublicUrl(
  text: string,
  bucketId: string,
  mode: StaticAudioMode = "default",
): string {
  return `https://storage.googleapis.com/${bucketId}/${staticAudioGcsObjectName(text, mode)}`;
}
