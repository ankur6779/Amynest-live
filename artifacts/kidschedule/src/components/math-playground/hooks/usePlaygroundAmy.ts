import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ageYearsToBand } from "@workspace/math-playground";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { primeStaticAudioInUserGesture } from "@/lib/static-audio";
import { catalogPlaybackSpeakOptions } from "@/lib/unified-catalog-playback";
import { speakPlaygroundCue } from "../lib/playground-audio";

const MUTE_KEY = "mp_amy_muted";

function readMuted(): boolean {
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePlaygroundAmy(ageYears?: number) {
  const { t } = useTranslation();
  const { speak, playPreparedUrl, pause, speaking, loading } = useAmyVoice({ playbackRate: 0.95 });
  const [muted, setMutedState] = useState(readMuted);
  const mutedRef = useRef(muted);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const queueGenRef = useRef(0);
  const ageBand = ageYears !== undefined ? ageYearsToBand(ageYears) : undefined;

  mutedRef.current = muted;

  useEffect(() => {
    return () => {
      queueGenRef.current += 1;
      pause();
    };
  }, [pause]);

  const setMuted = useCallback(
    (next: boolean) => {
      setMutedState(next);
      if (next) {
        queueGenRef.current += 1;
        pause();
      }
      try {
        if (next) sessionStorage.setItem(MUTE_KEY, "1");
        else sessionStorage.removeItem(MUTE_KEY);
      } catch {
        /* ignore */
      }
    },
    [pause],
  );

  const enqueueCueText = useCallback(
    (text: string) => {
      if (mutedRef.current || !text.trim()) return;
      const gen = queueGenRef.current;
      queueRef.current = queueRef.current
        .then(async () => {
          if (mutedRef.current || gen !== queueGenRef.current) return;
          const isCancelled = () => gen !== queueGenRef.current || mutedRef.current;
          if (ageBand) {
            await speakPlaygroundCue(text, ageBand, {
              speak,
              playPreparedUrl,
              playbackRate: 0.95,
              isCancelled,
            });
            return;
          }
          await speak(text, {
            ...catalogPlaybackSpeakOptions(text),
            playbackRate: 0.95,
            waitUntilEnd: true,
          }).catch(() => undefined);
        })
        .catch(() => undefined);
    },
    [ageBand, speak, playPreparedUrl],
  );

  const queueCue = useCallback(
    (textKey: string, vars?: Record<string, string | number>) => {
      if (mutedRef.current) return;
      const text = t(`components.math_playground.${textKey}`, vars ?? {});
      enqueueCueText(text);
    },
    [enqueueCueText, t],
  );

  const primeCue = useCallback(
    (textKey: string, vars?: Record<string, string | number>) => {
      if (mutedRef.current) return;
      const text = t(`components.math_playground.${textKey}`, vars ?? {});
      primeStaticAudioInUserGesture(text);
    },
    [t],
  );

  return { queueCue, primeCue, pause, speaking, loading, muted, setMuted };
}
