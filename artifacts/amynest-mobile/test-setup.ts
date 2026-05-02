import "@testing-library/jest-dom";
import { vi } from "vitest";

// React Native ships a global `__DEV__` flag (set by Metro at bundle time)
// that the hub uses to gate dev-only debug overlays. Define it as `false`
// in the jsdom test environment so production-like rendering is exercised
// and the dev-only `HubDebugOverlay` stays out of the tree.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

vi.mock("@/i18n", () => ({
  default: {
    language: "en",
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    t: (key: string) => key,
  },
  setLanguage: vi.fn().mockResolvedValue(undefined),
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English", native: "English" },
    { code: "hi", label: "Hindi", native: "हिंदी" },
    { code: "hinglish", label: "Hinglish", native: "Hinglish" },
  ],
}));
