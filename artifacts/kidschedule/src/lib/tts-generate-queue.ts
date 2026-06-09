/**
 * Limits parallel POST /api/tts/generate calls and retries on 429 burst limits.
 */

const MAX_CONCURRENT = 4;
const MAX_RETRIES = 3;

let active = 0;
const waiters: Array<() => void> = [];

function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

async function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(() => {
      active += 1;
      resolve();
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runTtsGenerateRequest(
  request: () => Promise<Response>,
): Promise<Response> {
  await acquireSlot();
  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await request();
      if (res.status !== 429) return res;

      const body = (await res
        .clone()
        .json()
        .catch(() => ({}))) as { retryAfterMs?: number; error?: string };
      const retryAfterMs = Math.min(
        Math.max(body.retryAfterMs ?? 1_000, 250),
        8_000,
      );
      if (attempt === MAX_RETRIES - 1) return res;
      await sleep(retryAfterMs);
    }
    return request();
  } finally {
    releaseSlot();
  }
}

/** Test-only reset. */
export function resetTtsGenerateQueueForTests(): void {
  active = 0;
  waiters.length = 0;
}
