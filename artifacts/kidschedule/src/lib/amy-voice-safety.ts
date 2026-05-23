/**
 * Global speak safety: request versioning, strict mutex, play-token guard.
 * Used by useAmyVoice + amy-voice-pipeline to prevent race-condition playback.
 */

let currentRequestId = 0;
let isBusy = false;
let speakMutexTail: Promise<void> = Promise.resolve();
let activePlayToken: symbol | null = null;

export function bumpSpeakRequestId(): number {
  currentRequestId += 1;
  activePlayToken = null;
  return currentRequestId;
}

export function getSpeakRequestId(): number {
  return currentRequestId;
}

export function isSpeakRequestCurrent(requestId: number): boolean {
  return requestId === currentRequestId;
}

export function beginSpeakPlayToken(): symbol {
  const token = Symbol("web_amy_voice_play");
  activePlayToken = token;
  return token;
}

export function isSpeakPlayTokenActive(token: symbol): boolean {
  return activePlayToken === token;
}

export function cancelAllSpeakRequests(): number {
  return bumpSpeakRequestId();
}

/** Only one speak pipeline at a time; latest queued after prior finishes or preempts via requestId. */
export function withSpeakMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    isBusy = true;
    try {
      return await fn();
    } finally {
      isBusy = false;
    }
  };
  const next = speakMutexTail.then(run, run);
  speakMutexTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function isSpeakPipelineBusy(): boolean {
  return isBusy;
}

export function abortSignalWithTimeout(
  timeoutMs: number,
  parent?: AbortSignal | null,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const clear = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onAbort);
  };
  return { signal: controller.signal, clear };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
