import { useCallback, useState } from "react";
import type { PlaygroundPlayMode } from "@workspace/math-playground";
import { requestMicrophoneAccess } from "@/lib/microphone-permission";
import { isMpVoiceModeEnabled } from "../lib/feature-flags";
import type { PlaygroundStateApi } from "../hooks/usePlaygroundState";

const MODE_KEY = "mp_play_mode";

function readStoredMode(fallback?: PlaygroundPlayMode): PlaygroundPlayMode {
  try {
    const stored = sessionStorage.getItem(MODE_KEY);
    if (stored === "voice" || stored === "touch") return stored;
  } catch {
    /* ignore */
  }
  return fallback ?? "touch";
}

function writeStoredMode(mode: PlaygroundPlayMode): void {
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function usePlayMode(
  playground: Pick<PlaygroundStateApi, "preferredPlayMode" | "setPreferredPlayMode">,
) {
  const [mode, setMode] = useState<PlaygroundPlayMode>(() =>
    readStoredMode(playground.preferredPlayMode),
  );

  const persistMode = useCallback(
    (next: PlaygroundPlayMode) => {
      setMode(next);
      writeStoredMode(next);
      playground.setPreferredPlayMode(next);
    },
    [playground],
  );

  const setTouchMode = useCallback(() => {
    persistMode("touch");
  }, [persistMode]);

  const trySetVoiceMode = useCallback(async (): Promise<"granted" | "denied" | "disabled"> => {
    if (!isMpVoiceModeEnabled()) {
      persistMode("touch");
      return "disabled";
    }
    const access = await requestMicrophoneAccess({ forFeature: true });
    if (!access.granted) {
      persistMode("touch");
      return "denied";
    }
    persistMode("voice");
    return "granted";
  }, [persistMode]);

  return {
    mode,
    setTouchMode,
    trySetVoiceMode,
    isVoiceModeActive: mode === "voice" && isMpVoiceModeEnabled(),
  };
}

export type PlayModeApi = ReturnType<typeof usePlayMode>;
