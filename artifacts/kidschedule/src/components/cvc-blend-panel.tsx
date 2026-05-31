import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { phonicsEngineStop } from "@/lib/phonics-audio-engine";
import { playCvcBlendWithSpeak } from "@/lib/phonics-audio";
import {
  getCvcDisplayLetters,
  getPhonemeAudioText,
  type CvcBlendPhase,
} from "@workspace/phonics-sounds";
import { AudioPlayButton } from "@/components/audio-play-button";
import { ChevronRight, Sparkles, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PhonicsLevel } from "@/lib/phonics-content";
import { usePhonicsCvcLesson } from "@/lib/phonics-cvc-lesson";
import { subscribePhonicsPlayback } from "@/lib/phonics-player";

type CvcBlendPanelProps = {
  word: string;
  emoji?: string;
  onClose: () => void;
  onComplete?: () => void;
  practiceLevel: 1 | 2 | 3;
  /** Shared lesson state from parent; internal hook used when omitted. */
  lesson?: ReturnType<typeof usePhonicsCvcLesson>;
};

export function CvcBlendPanel({
  word,
  emoji,
  onClose,
  onComplete,
  practiceLevel,
  lesson: lessonProp,
}: CvcBlendPanelProps) {
  const internalLesson = usePhonicsCvcLesson(practiceLevel);
  const lesson = lessonProp ?? internalLesson;
  const blendSessionRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<CvcBlendPhase | null>(null);
  const [showWord, setShowWord] = useState(false);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const [globalPlaying, setGlobalPlaying] = useState(false);

  useEffect(() => {
    if (lesson.activeLevel !== practiceLevel) {
      lesson.selectLevel(practiceLevel);
    }
    const idx = lesson.levelWords.findIndex((w) => w.word === word.toLowerCase());
    if (idx >= 0) {
      lesson.selectWordByIndex(idx);
    }
  }, [word, practiceLevel, lesson]);

  useEffect(() => {
    return subscribePhonicsPlayback(({ playing }) => {
      setGlobalPlaying(playing);
      lesson.setIsPlaying(playing);
    });
  }, [lesson]);

  const current = lesson.selectedWord;
  const displayLetters = current ? getCvcDisplayLetters(current.word) : [];
  const controlsLocked = lesson.isPlaying || globalPlaying;

  const runBlend = useCallback(
    async (opts?: { skipSlow?: boolean }) => {
      if (!current) return;
      const session = ++blendSessionRef.current;
      const isCancelled = () => blendSessionRef.current !== session;

      await phonicsEngineStop("cvc_blend_restart");
      amyVoiceController.pause();
      lesson.beginPlayback(opts?.skipSlow ? "playing_blend" : "playing_phonemes");
      setShowWord(false);
      setActiveIndex(null);
      setPhase(null);
      setStepHint(opts?.skipSlow ? "Fast blend…" : "Listen to each sound…");

      try {
        await playCvcBlendWithSpeak(current, {
          skipSlowPass: opts?.skipSlow,
          isCancelled,
          onPhoneme: (idx, p) => {
            if (isCancelled()) return;
            setPhase(p);
            if (p === "word") {
              setActiveIndex(null);
              setShowWord(true);
              setStepHint("Say the whole word!");
            } else if (idx >= 0) {
              setActiveIndex(idx);
              setStepHint(`Sound ${idx + 1} of ${current.phonemes.length}`);
            }
          },
        });
        if (!isCancelled()) onComplete?.();
      } finally {
        if (blendSessionRef.current === session) {
          lesson.endPlayback(true);
          setPhase(null);
          setActiveIndex(null);
          setStepHint(null);
        }
      }
    },
    [current, lesson, onComplete],
  );

  const stopBlend = useCallback(() => {
    blendSessionRef.current += 1;
    void phonicsEngineStop("cvc_blend_stop");
    amyVoiceController.pause();
    lesson.resetLesson();
    setPhase(null);
    setActiveIndex(null);
    setShowWord(false);
    setStepHint(null);
  }, [lesson]);

  useEffect(() => {
    return () => {
      blendSessionRef.current += 1;
      void phonicsEngineStop("cvc_blend_unmount");
      amyVoiceController.pause();
    };
  }, []);

  const handleClose = useCallback(() => {
    stopBlend();
    onClose();
  }, [stopBlend, onClose]);

  if (!current) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label={`Blend ${current.word}`}
      className="mt-4 rounded-2xl border border-border dark:border-border bg-muted dark:bg-card p-4"
      data-testid="cvc-blend-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-primary dark:text-muted-foreground">Blend the sounds</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-7 w-7 p-0 rounded-full"
          aria-label="Close blend panel"
        >
          ×
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Practice level">
        {([1, 2, 3] as const).map((lv) => (
          <Button
            key={lv}
            type="button"
            size="sm"
            variant={lesson.activeLevel === lv ? "default" : "outline"}
            className="rounded-full text-[10px] font-bold h-7 px-3"
            disabled={controlsLocked}
            onClick={() => lesson.selectLevel(lv)}
          >
            Level {lv}
          </Button>
        ))}
      </div>

      {lesson.activeLevel === 3 && (
        <p className="text-[10px] text-muted-foreground mb-2 text-center">Random word order</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3 justify-center">
        {lesson.levelWords.map((w) => (
          <Button
            key={w.word}
            type="button"
            size="sm"
            variant={current.word === w.word ? "default" : "outline"}
            className="rounded-full font-quicksand font-bold text-xs"
            disabled={controlsLocked}
            onClick={() => lesson.selectWord(w)}
          >
            {w.word}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <Button
          type="button"
          size="sm"
          disabled={controlsLocked}
          onClick={() => void runBlend()}
          className="rounded-full text-xs font-bold"
        >
          Play blend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={controlsLocked}
          onClick={() => void runBlend({ skipSlow: true })}
          className="rounded-full text-xs font-bold"
        >
          Fast repeat
        </Button>
        {controlsLocked && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={stopBlend}
            className="rounded-full text-xs font-bold"
            aria-label="Stop sound"
          >
            <Square className="h-3.5 w-3.5 fill-current mr-1" />
            Stop
          </Button>
        )}
      </div>

      {stepHint && (
        <p
          className="text-center text-xs font-medium text-primary dark:text-violet-300 mb-2 min-h-[1rem]"
          aria-live="polite"
        >
          {stepHint}
        </p>
      )}

      <div
        className="flex items-center justify-center gap-1 flex-wrap mb-4 py-2"
        data-testid="cvc-blend-progression"
      >
        {displayLetters.map((grapheme, i) => {
          const isActive = activeIndex === i && phase !== "word";
          const isDone = showWord || (activeIndex != null && i < activeIndex);
          return (
            <span key={`g-${i}`} className="flex items-center gap-1">
              <span
                className={cn(
                  "font-quicksand text-2xl font-bold rounded-xl px-3 py-2 border transition-all duration-300 relative",
                  isActive
                    ? "border-violet-500 bg-violet-500/20 ring-4 ring-violet-400/40 scale-110 shadow-lg shadow-violet-500/20"
                    : isDone
                      ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                      : "border-border dark:border-border bg-white/80 dark:bg-white/[0.06] opacity-60",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {grapheme}
              </span>
              {i < displayLetters.length - 1 && (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isDone ? "text-emerald-500" : "text-muted-foreground/50",
                  )}
                  aria-hidden
                />
              )}
            </span>
          );
        })}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-0.5" aria-hidden />
        <span
          className={cn(
            "font-quicksand text-2xl font-bold rounded-xl px-3 py-2 border transition-all duration-300 flex items-center gap-1.5",
            showWord || phase === "word"
              ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-400/50 scale-105"
              : "border-dashed border-muted-foreground/40 text-muted-foreground",
          )}
        >
          {emoji && <span className="text-xl">{emoji}</span>}
          {current.word}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {current.phonemes.map((p, i) => (
          <div
            key={`p-${i}`}
            className={cn(
              "rounded-lg px-2 py-1 text-[10px] font-medium border",
              activeIndex === i ? "border-violet-400 text-violet-700 dark:text-violet-300" : "border-transparent text-muted-foreground",
            )}
          >
            <AudioPlayButton
              text={getPhonemeAudioText(p)}
              phonemeKey={p}
              mode="phonics"
              size="sm"
              variant="outline"
              lockWhileGlobalPlayback={controlsLocked}
              ariaLabel={`Play sound ${displayLetters[i] ?? p}`}
              onPlay={() => setActiveIndex(i)}
              onSpeakingEnd={() => setActiveIndex((a) => (a === i ? null : a))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Standalone CVC blending practice with level progression. */
export function CvcBlendingPracticeCard({
  level,
  recordPlay,
}: {
  level: PhonicsLevel;
  recordPlay: (id: string) => void;
}) {
  const practiceLevel: 1 | 2 | 3 =
    level.ageGroup === "3_4y" ? 1 : level.ageGroup === "4_5y" ? 2 : 3;
  const lesson = usePhonicsCvcLesson(practiceLevel);
  const [panelWord, setPanelWord] = useState<string | null>(null);

  useEffect(() => {
    lesson.selectLevel(practiceLevel);
  }, [practiceLevel, lesson]);

  return (
    <Card data-testid="cvc-blending-practice" className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/50 dark:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-quicksand text-base font-bold">CVC blending</h3>
            <p className="text-xs text-muted-foreground">Hear sounds, not letter names — then say the word</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {([1, 2, 3] as const).map((lv) => (
            <Button
              key={lv}
              type="button"
              size="sm"
              variant={lesson.activeLevel === lv ? "default" : "outline"}
              className="rounded-full text-[10px] font-bold h-7"
              onClick={() => {
                lesson.selectLevel(lv);
                setPanelWord(null);
              }}
            >
              Level {lv}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {lesson.levelWords.map((w) => (
            <Button
              key={w.word}
              type="button"
              size="sm"
              variant={lesson.selectedWord?.word === w.word ? "default" : "outline"}
              className="rounded-full font-quicksand font-bold"
              onClick={() => {
                lesson.selectWord(w);
                setPanelWord(w.word);
              }}
            >
              {w.word}
            </Button>
          ))}
        </div>

        {panelWord && (
          <CvcBlendPanel
            word={panelWord}
            practiceLevel={lesson.activeLevel}
            lesson={lesson}
            onClose={() => setPanelWord(null)}
            onComplete={() => recordPlay(`cvc-${panelWord}`)}
          />
        )}
      </CardContent>
    </Card>
  );
}
