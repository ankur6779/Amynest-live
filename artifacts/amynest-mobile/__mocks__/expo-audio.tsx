import { vi } from "vitest";

const noop = () => {};

// ─── Recording API (added for STT feature) ───────────────────────────────────
export const useAudioRecorder = vi.fn(() => ({
  prepareToRecordAsync: vi.fn().mockResolvedValue(undefined),
  record: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined),
  uri: null as string | null,
}));

export const useAudioRecorderState = vi.fn(() => ({
  isRecording: false,
  durationMillis: 0,
  canRecord: true,
}));

export const AudioModule = {
  requestRecordingPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  setIsAudioActiveAsync: vi.fn().mockResolvedValue(undefined),
};

export const RecordingPresets = {
  HIGH_QUALITY: {
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: { outputFormat: "mpeg4", audioEncoder: "aac" },
    ios: { outputFormat: "aac ", audioQuality: 96, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
    web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
  },
  LOW_QUALITY: {
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 64000,
    android: { extension: ".3gp", outputFormat: "3gp", audioEncoder: "amr_nb" },
    ios: { audioQuality: 0, outputFormat: "aac ", linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
    web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
  },
};

export const useAudioPlayer = vi.fn(() => ({
  replace: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  remove: vi.fn(),
  seekTo: vi.fn(),
  currentTime: 0,
  duration: 0,
  playing: false,
  id: 0,
}));

export const useAudioPlayerStatus = vi.fn(() => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  didJustFinish: false,
  isLoaded: false,
  error: null,
}));

export const createAudioPlayer = vi.fn(() => ({
  replace: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  remove: vi.fn(),
  seekTo: vi.fn(),
  currentTime: 0,
  duration: 0,
  playing: false,
  id: 0,
  addListener: vi.fn(() => ({ remove: noop })),
}));
