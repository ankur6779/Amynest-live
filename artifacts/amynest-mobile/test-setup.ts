import "@testing-library/jest-dom";
import { vi } from "vitest";

// React Native exposes `__DEV__` as a global. jsdom doesn't, so any module
// that references it (expo-localization, ErrorFallback, HubDebugOverlay,
// react-native libs, etc.) throws "ReferenceError: __DEV__ is not defined"
// the moment it's imported in a test. Define it here so all suites can
// safely import RN-aware code.
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

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
