/**
 * Runtime trace + duplication guard for infant sleep library playback.
 */

export type InfantSleepContentType = "lullaby" | "poem" | "story" | "white_noise";

export type InfantSleepPlaybackRequest = {
  selectedId?: string;
  resolvedAudioUrl?: string;
  contentType: InfantSleepContentType;
  pipeline: "bundled_mp3" | "tts_narration" | "procedural";
};

let lastPlayback: {
  id: string;
  audioSource: string;
} | null = null;

const playbackTraceLog: InfantSleepPlaybackRequest[] = [];

export function getInfantSleepPlaybackTraceLog(): readonly InfantSleepPlaybackRequest[] {
  return playbackTraceLog;
}

export function logInfantSleepPlaybackRequest(req: InfantSleepPlaybackRequest): void {
  const payload = {
    selectedId: req.selectedId ?? "(unknown)",
    resolvedAudioUrl: req.resolvedAudioUrl ?? "(tts)",
    contentType: req.contentType,
    pipeline: req.pipeline,
  };
  playbackTraceLog.push(req);
  if (import.meta.env.DEV) {
    console.info(`[InfantSleepPlayback] ${JSON.stringify(payload)}`);
  }
}

/**
 * Warn when two different items resolve to the same audio source.
 * Returns true when duplication was detected.
 */
export function warnIfAudioSourceDuplicated(
  itemId: string,
  audioSource: string,
): boolean {
  const id = (itemId ?? "").trim();
  const source = (audioSource ?? "").trim();
  if (!id || !source) return false;

  const prev = lastPlayback;
  lastPlayback = { id, audioSource: source };

  if (prev && prev.id !== id && prev.audioSource === source) {
    console.warn("AUDIO CONTENT DUPLICATION DETECTED", {
      previousItemId: prev.id,
      selectedItemId: id,
      sharedAudioSource: source,
    });
    return true;
  }
  return false;
}

/** Test helper — reset module state between assertions. */
export function resetInfantSleepPlaybackTraceForTests(): void {
  lastPlayback = null;
  playbackTraceLog.length = 0;
}
