const MAX_CONCURRENT_GCS_READS = Number(process.env.STATIC_AUDIO_MAX_GCS_READS ?? "20");

let activeGcsReads = 0;

export function getActiveGcsReads(): number {
  return activeGcsReads;
}

export function getMaxConcurrentGcsReads(): number {
  return MAX_CONCURRENT_GCS_READS;
}

export function tryAcquireGcsReadSlot(): boolean {
  if (activeGcsReads >= MAX_CONCURRENT_GCS_READS) return false;
  activeGcsReads += 1;
  return true;
}

export function releaseGcsReadSlot(): void {
  if (activeGcsReads > 0) activeGcsReads -= 1;
}

export async function withGcsReadSlot<T>(fn: () => Promise<T>): Promise<T | "too_many_requests"> {
  if (!tryAcquireGcsReadSlot()) return "too_many_requests";
  try {
    return await fn();
  } finally {
    releaseGcsReadSlot();
  }
}
