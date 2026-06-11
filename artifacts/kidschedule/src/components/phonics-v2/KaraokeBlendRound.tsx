import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { phonicsEngineStop } from "@/lib/phonics-audio-engine";
import { playCvcBlendWithSpeak } from "@/lib/phonics-audio";
import { audioManager } from "@/lib/audio-manager";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  getCvcDisplayLetters,
  getCvcWordEntry,
  getPhonemeAudioText,
  type CvcBlendPhase,
} from "@workspace/phonics-sounds";
import { ChevronRight, RotateCcw, Snail, Zap } from "lucide-react";
import { prefetchCvcWordAudio } from "@/lib/phonics-v2/audio-prefetch";
import { subscribePhonicsPlayback } from "@/lib/phonics-player";
import { PRESS_FEEDBACK } from "@/lib/experience-system";

export type KaraokeBlendResult = {
  accuracy: number;
  completedFullBlend: boolean;
  phonemesHeard: number;
  phonemeTotal: number;
};

type KaraokeBlendRoundProps = {
  word: string;
  emoji?: string;
  slowMode?: boolean;
  autoStart?: boolean;
  onComplete?: (result: KaraokeBlendResult) => void;
  onStepChange?: (step: number) => void;
};

/**
 * Karaoke blending — step-by-step phoneme highlight with whole-word finale.
 * Uses phonics-engine only (no Amy lesson fallback).
 */
export function KaraokeBlendRound({
  word,
  emoji,
  slowMode: slowModeProp,
  autoStart,
  onComplete,
  onStepChange,
}: KaraokeBlendRoundProps) {
  const entry = getCvcWordEntry(word.trim().toLowerCase());
  const [slowMode, setSlowMode] = useState(slowModeProp ?? true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<CvcBlendPhase | null>(null);
  const [showWord, setShowWord] = useState(false);
  const [playing, setPlaying] = useState(false);
  const sessionRef = useRef(0);
  const autoStartedRef = useRef(false);
  const phonemesHeardRef = useRef(new Set<number>());
  const completedWordRef = useRef(false);

  const displayLetters = entry ? getCvcDisplayLetters(entry.word) : word.split("");

  useEffect(() => {
    if (entry) prefetchCvcWordAudio(entry.word);
  }, [entry]);

  useEffect(() => {
    return subscribePhonicsPlayback(({ playing: p }) => setPlaying(p));
  }, []);

  const runBlend = useCallback(
    async (opts?: { slow?: boolean }) => {
      if (!entry) return;
      const session = ++sessionRef.current;
      const isCancelled = () => sessionRef.current !== session;
      const useSlow = opts?.slow ?? slowMode;

      recordTtsUserGesture();
      audioManager.unlockFromUserGesture();
      await phonicsEngineStop("karaoke_blend");
      amyVoiceController.pause();
      setShowWord(false);
      setActiveIndex(null);
      setPhase(null);
      phonemesHeardRef.current = new Set();
      completedWordRef.current = false;

      try {
        await playCvcBlendWithSpeak(entry, {
          skipSlowPass: !useSlow,
          isCancelled,
          onPhoneme: (idx, p) => {
            if (isCancelled()) return;
            setPhase(p);
            if (p === "word") {
              setActiveIndex(null);
              setShowWord(true);
              completedWordRef.current = true;
              onStepChange?.(-1);
            } else if (idx >= 0) {
              phonemesHeardRef.current.add(idx);
              setActiveIndex(idx);
              onStepChange?.(idx);
            }
          },
        });
        if (!isCancelled()) {
          const phonemeTotal = entry.phonemes.length;
          const phonemesHeard = phonemesHeardRef.current.size;
          const completedFullBlend = completedWordRef.current && phonemesHeard >= phonemeTotal;
          const accuracy =
            phonemeTotal > 0
              ? Math.min(1, (phonemesHeard / phonemeTotal) * (completedWordRef.current ? 1 : 0.5))
              : 0;
          onComplete?.({
            accuracy,
            completedFullBlend,
            phonemesHeard,
            phonemeTotal,
          });
        }
      } finally {
        if (sessionRef.current === session) {
          setPhase(null);
        }
      }
    },
    [entry, slowMode, onComplete, onStepChange],
  );

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !entry) return;
    autoStartedRef.current = true;
    void runBlend();
  }, [autoStart, entry, runBlend]);

  if (!entry) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Word &quot;{word}&quot; is not in the blend library yet.
      </p>
    );
  }

  return (
    <div data-testid="karaoke-blend-round" className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={slowMode ? "default" : "outline"}
          disabled={playing}
          className={cn("rounded-full text-xs font-bold", PRESS_FEEDBACK)}
          onClick={() => {
            setSlowMode(true);
            void runBlend({ slow: true });
          }}
        >
          <Snail className="h-3.5 w-3.5 mr-1" />
          Slow
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!slowMode ? "default" : "outline"}
          disabled={playing}
          className={cn("rounded-full text-xs font-bold", PRESS_FEEDBACK)}
          onClick={() => {
            setSlowMode(false);
            void runBlend({ slow: false });
          }}
        >
          <Zap className="h-3.5 w-3.5 mr-1" />
          Normal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={playing}
          className="rounded-full text-xs font-bold"
          onClick={() => void runBlend({ slow: slowMode })}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Replay
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 flex-wrap py-2">
        {displayLetters.map((g, i) => {
          const isActive = activeIndex === i && phase !== "word";
          const isDone = showWord || (activeIndex != null && i < activeIndex);
          const phoneme = entry.phonemes[i];
          return (
            <span key={`k-${i}`} className="flex items-center gap-1">
              <span
                className={cn(
                  "font-quicksand text-3xl font-bold rounded-xl px-4 py-3 border transition-all duration-300",
                  isActive
                    ? "border-violet-500 bg-violet-500/20 ring-4 ring-violet-400/40 scale-110"
                    : isDone
                      ? "border-emerald-400/70 bg-emerald-500/10"
                      : "border-border bg-card/80 opacity-70",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {g}
                {phoneme && isActive && (
                  <span className="block text-[10px] font-medium text-violet-600 dark:text-violet-300 mt-0.5">
                    {getPhonemeAudioText(phoneme)}
                  </span>
                )}
              </span>
              {i < displayLetters.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </span>
          );
        })}
        <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
        <span
          className={cn(
            "font-quicksand text-3xl font-bold rounded-xl px-4 py-3 border flex items-center gap-2 transition-all",
            showWord || phase === "word"
              ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-400/50 scale-105"
              : "border-dashed border-muted-foreground/40 text-muted-foreground",
          )}
        >
          {emoji && <span className="text-2xl">{emoji}</span>}
          {entry.word.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
