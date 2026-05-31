/**
 * Internal request ownership for Amy voice — used by controller + pipeline only.
 * UI must not import this module.
 */

let activeRequestId = 0;
let controlledStopDepth = 0;

/** Allocate a new request id — invalidates all prior in-flight work. */
export function createSpeakRequest(): number {
  activeRequestId += 1;
  return activeRequestId;
}

export function isCurrentSpeakRequest(requestId: number): boolean {
  return requestId === activeRequestId;
}

/** Explicit pause / supersede — returns the new active request id. */
export function invalidateSpeakRequests(): number {
  bumpAudioIntentEpoch();
  return createSpeakRequest();
}

/** Monotonic epoch — latest user intent wins; stale downloads must not play. */
let audioIntentEpoch = 0;

export function bumpAudioIntentEpoch(): number {
  audioIntentEpoch += 1;
  return audioIntentEpoch;
}

export function getAudioIntentEpoch(): number {
  return audioIntentEpoch;
}

export function isCurrentAudioIntent(epoch: number): boolean {
  return epoch === audioIntentEpoch;
}

export function getActiveSpeakRequestId(): number {
  return activeRequestId;
}

/** @deprecated Prefer createSpeakRequest / invalidateSpeakRequests */
export const bumpSpeakRequestId = createSpeakRequest;
export const getSpeakRequestId = getActiveSpeakRequestId;
export const isSpeakRequestCurrent = isCurrentSpeakRequest;
export const cancelAllSpeakRequests = invalidateSpeakRequests;

export function isControlledAudioStop(): boolean {
  return controlledStopDepth > 0;
}

export function runWithControlledAudioStop<T>(fn: () => T): T {
  controlledStopDepth += 1;
  try {
    return fn();
  } finally {
    controlledStopDepth -= 1;
  }
}

export function warnExternalAudioStop(source: string): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[AmyVoice] Audio stop triggered outside controller (${source})`,
    );
  }
}
