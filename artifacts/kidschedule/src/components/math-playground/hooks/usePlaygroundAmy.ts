import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";

const MUTE_KEY = "mp_amy_muted";

function readMuted(): boolean {
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePlaygroundAmy() {
  const { t } = useTranslation();
  const { speak, pause, speaking, loading } = useAmyVoice({ playbackRate: 0.95 });
  const [muted, setMutedState] = useState(readMuted);

  const setMuted = useCallback(
    (next: boolean) => {
      setMutedState(next);
      if (next) pause();
      try {
        if (next) sessionStorage.setItem(MUTE_KEY, "1");
        else sessionStorage.removeItem(MUTE_KEY);
      } catch {
        /* ignore */
      }
    },
    [pause],
  );

  const queueCue = useCallback(
    (textKey: string, vars?: Record<string, string | number>) => {
      if (muted) return;
      const text = t(`components.math_playground.${textKey}`, vars ?? {});
      void speak(text);
    },
    [speak, t, muted],
  );

  const primeCue = useCallback(
    (textKey: string, vars?: Record<string, string | number>) => {
      if (muted) return;
      const text = t(`components.math_playground.${textKey}`, vars ?? {});
      primeStaticAudioInUserGesture(text);
    },
    [t, muted],
  );

  return { queueCue, primeCue, pause, speaking, loading, muted, setMuted };
}
