import { vi } from "vitest";

const noop = () => {};

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
