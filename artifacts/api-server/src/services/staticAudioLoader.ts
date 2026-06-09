import { getStaticAudioObjectKey, normalizeStaticAudioKey } from "@workspace/static-audio";
import { getRedisConnection, isRedisQueueEnabled } from "../queue/redis.js";
import { logger } from "../lib/logger.js";
import { recordGcsRead } from "./staticAudioMetrics.js";
import { readStaticAudioFromGcs } from "./ttsAudioStore.js";
import {
  getCachedStaticAudioBuffer,
  getInflightStaticAudioLoad,
  hasCachedStaticAudioBuffer,
  setCachedStaticAudioBuffer,
  setInflightStaticAudioLoad,
} from "./staticAudioBufferCache.js";

export { hasCachedStaticAudioBuffer };
import { withGcsReadSlot } from "./staticAudioConcurrency.js";

/** Top catalog phrases to pre-warm into memory on boot. */
const PREWARM_ENTRIES: Array<{ text: string; mode: "default" | "phonics" }> = [
  { text: "good job!", mode: "default" },
  { text: "great job!", mode: "default" },
  { text: "listen carefully", mode: "default" },
  { text: "let's try again", mode: "default" },
  { text: "almost there!", mode: "default" },
  { text: "tap to hear amy", mode: "default" },
  { text: "correct! well done!", mode: "default" },
  { text: "keep going!", mode: "default" },
  { text: "nice work!", mode: "default" },
  { text: "let's learn phonics", mode: "default" },
  { text: "buh", mode: "phonics" },
  { text: "ah", mode: "phonics" },
];

function prewarmHashesFromEnv(): string[] {
  const raw = process.env.STATIC_AUDIO_PREWARM_HASHES?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => /^[a-f0-9]{32}$/.test(h));
}

export function getPrewarmHashes(): string[] {
  const fromEnv = prewarmHashesFromEnv();
  if (fromEnv.length > 0) return fromEnv.slice(0, 20);
  return PREWARM_ENTRIES.map(({ text, mode }) =>
    getStaticAudioObjectKey(normalizeStaticAudioKey(text), mode),
  );
}

async function loadFromGcs(hash: string): Promise<Buffer | null> {
  const slot = await withGcsReadSlot(async () => {
    const buffer = await readStaticAudioFromGcs(hash);
    if (buffer) recordGcsRead(buffer.byteLength);
    return buffer;
  });
  if (slot === "too_many_requests") {
    throw new Error("too_many_requests");
  }
  const buffer = slot;
  if (buffer) setCachedStaticAudioBuffer(hash, buffer);
  return buffer;
}

/** Memory LRU → coalesced in-flight → GCS (with concurrency cap). */
export async function getStaticAudioBuffer(hash: string): Promise<Buffer | null> {
  const cached = getCachedStaticAudioBuffer(hash);
  if (cached) return cached;

  const pending = getInflightStaticAudioLoad(hash);
  if (pending) return pending;

  const load = loadFromGcs(hash);
  setInflightStaticAudioLoad(hash, load);
  return load;
}

const PREWARM_LOCK_KEY = "static_audio:boot_prewarm";
const PREWARM_LOCK_TTL_SEC = 300;

async function tryAcquirePrewarmLock(): Promise<boolean> {
  if (!isRedisQueueEnabled()) return true;
  try {
    const redis = getRedisConnection();
    const ok = await redis.set(PREWARM_LOCK_KEY, String(process.pid), "EX", PREWARM_LOCK_TTL_SEC, "NX");
    return ok === "OK";
  } catch {
    return true;
  }
}

export async function prewarmStaticAudioBuffers(): Promise<void> {
  const acquired = await tryAcquirePrewarmLock();
  if (!acquired) {
    logger.info({ evt: "static_audio.prewarm_skipped" }, "static audio prewarm skipped — lock held");
    return;
  }
  const hashes = getPrewarmHashes();
  let warmed = 0;
  for (const hash of hashes) {
    try {
      const buf = await getStaticAudioBuffer(hash);
      if (buf) warmed += 1;
    } catch (err) {
      logger.warn(
        {
          evt: "static_audio.prewarm_failed",
          hash,
          message: err instanceof Error ? err.message : String(err),
        },
        "static audio prewarm failed for hash",
      );
    }
  }
  console.log("[STATIC AUDIO PREWARM]", { requested: hashes.length, warmed });
  logger.info({ evt: "static_audio.prewarm", warmed, requested: hashes.length }, "static audio prewarm complete");
}
