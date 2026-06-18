/** OpenAI Realtime server_vad tuning for Speech Coach V2. */

export type SpeechCoachV2ServerVadConfig = {
  type: "server_vad";
  threshold: number;
  prefix_padding_ms: number;
  silence_duration_ms: number;
  create_response: boolean;
  interrupt_response: boolean;
};

/** Previous production defaults (noisy-room false positives). */
export const SPEECH_COACH_V2_VAD_LEGACY: SpeechCoachV2ServerVadConfig = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 500,
  create_response: true,
  interrupt_response: true,
};

/** Child listening — responsive but rejects low-level room noise. */
export const SPEECH_COACH_V2_VAD_LISTENING: SpeechCoachV2ServerVadConfig = {
  type: "server_vad",
  threshold: 0.68,
  prefix_padding_ms: 400,
  silence_duration_ms: 900,
  create_response: true,
  interrupt_response: true,
};

/** While Amy is speaking — block echo/TV/fan from interrupting. */
export const SPEECH_COACH_V2_VAD_AMY_SPEAKING: SpeechCoachV2ServerVadConfig = {
  type: "server_vad",
  threshold: 0.82,
  prefix_padding_ms: 400,
  silence_duration_ms: 1100,
  create_response: true,
  interrupt_response: false,
};

/** Ignore sub-400ms bursts when evaluating false interrupts. */
export const SPEECH_COACH_V2_MIN_SPEECH_MS = 400;

export type SpeechCoachV2MicConstraints = {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
};

export const SPEECH_COACH_V2_MIC_CONSTRAINTS: SpeechCoachV2MicConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export type SpeechCoachV2MicConstraintSupport = {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
};

// Minimal shape of the bits we use — this lib is shared with the Node API
// server (no DOM lib), so we must not rely on the global `Navigator` type.
type MediaDevicesLike = {
  getSupportedConstraints?: () => {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  };
};

/** Best-effort browser capability probe (does not guarantee runtime honor). */
export function probeSpeechCoachV2MicConstraintSupport(): SpeechCoachV2MicConstraintSupport {
  const nav = (globalThis as { navigator?: { mediaDevices?: MediaDevicesLike } }).navigator;
  const getSupported = nav?.mediaDevices?.getSupportedConstraints;
  if (!getSupported) {
    return { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  }
  const supported = getSupported.call(nav!.mediaDevices);
  return {
    echoCancellation: supported.echoCancellation ?? false,
    noiseSuppression: supported.noiseSuppression ?? false,
    autoGainControl: supported.autoGainControl ?? false,
  };
}

export function buildSpeechCoachV2MicConstraints(): SpeechCoachV2MicConstraints {
  const support = probeSpeechCoachV2MicConstraintSupport();
  return {
    echoCancellation: support.echoCancellation ? true : undefined,
    noiseSuppression: support.noiseSuppression ? true : undefined,
    autoGainControl: support.autoGainControl ? true : undefined,
  };
}

export function speechCoachV2TurnDetectionForMode(
  mode: "listening" | "amy_speaking",
): SpeechCoachV2ServerVadConfig {
  return mode === "amy_speaking"
    ? SPEECH_COACH_V2_VAD_AMY_SPEAKING
    : SPEECH_COACH_V2_VAD_LISTENING;
}

export function isLikelyFalseInterrupt(input: {
  amySpeaking: boolean;
  speechDurationMs: number;
}): boolean {
  return input.amySpeaking && input.speechDurationMs < SPEECH_COACH_V2_MIN_SPEECH_MS;
}
