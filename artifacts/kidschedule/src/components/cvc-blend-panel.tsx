import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playCvcBlendWithSpeak } from "@/lib/phonics-audio";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import { stopPhonicsPlayback } from "@/lib/phonics-player";
import {
  getCvcDisplayLetters,
  getCvcWordEntry,
  getCvcWordsByLevel,
  getPhonemeAudioText,
  type CvcBlendPhase,
  type CvcWordEntry,
} from "@workspace/phonics-sounds";
import { AudioPlayButton } from "@/components/audio-play-button";
import { ChevronRight, Sparkles, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PhonicsLevel } from "@/lib/phonics-content";

type CvcBlendPanelProps = {
  word: string;
  emoji?: string;
  onClose: () => void;
  onComplete?: () => void;
  /** Default level for word picker inside panel */
  practiceLevel?: 1 | 2 | 3;
};

export function CvcBlendPanel({
  word,
  emoji,
  onClose,
  onComplete,
  practiceLevel = 1,
}: CvcBlendPanelProps) {
  const entry = useMemo(() => getCvcWordEntry(word), [word]);

  const [level, setLevel] = useState<1 | 2 | 3>(practiceLevel);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<CvcBlendPhase | null>(null);
  const [showWord, setShowWord] = useState(false);
  const [blending, setBlending] = useState(false);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const blendSessionRef = useRef(0);

  const [levelWords, setLevelWords] = useState<CvcWordEntry[]>(() => getCvcWordsByLevel(level));
  useEffect(() => {
    setLevelWords(getCvcWordsByLevel(level));
    setWordIndex(0);
  }, [level]);

  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const idx = levelWords.findIndex((w) => w.word === word.toLowerCase());
    if (idx >= 0) setWordIndex(idx);
  }, [word, levelWords]);

  const current: CvcWordEntry =
    entry ?? levelWords[wordIndex] ?? levelWords[0] ?? { word: "cat", phonemes: ["k", "æ", "t"], level: 1 };

  const displayLetters = getCvcDisplayLetters(current.word);

  const runBlend = useCallback(
    async (opts?: { skipSlow?: boolean }) => {
      const session = ++blendSessionRef.current;
      const isCancelled = () => blendSessionRef.current !== session;

      stopPhonicsPlayback("cvc_blend_restart");
      amyVoiceController.pause();
      setBlending(true);
      setShowWord(false);
      setActiveIndex(null);
      setPhase(null);
      setCompletedIndices([]);
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
              setCompletedIndices(Array.from({ length: current.phonemes.length }, (_, i) => i));
              setShowWord(true);
              setStepHint("Say the whole word!");
            } else if (idx >= 0) {
              setActiveIndex(idx);
              setCompletedIndices(Array.from({ length: idx }, (_, i) => i));
              setStepHint(`Sound ${idx + 1} of ${current.phonemes.length}`);
            }
          },
        });
        if (!isCancelled()) onComplete?.();
      } finally {
        if (!isCancelled()) {
          setBlending(false);
          setPhase(null);
          setActiveIndex(null);
          setStepHint(null);
        }
      }
    },
    [current, onComplete],
  );

  const stopBlend = useCallback(() => {
    blendSessionRef.current += 1;
    stopPhonicsPlayback("cvc_blend_stop");
    amyVoiceController.pause();
    setBlending(false);
    setPhase(null);
    setActiveIndex(null);
    setShowWord(false);
    setStepHint(null);
  }, []);

  // Leaving / closing the panel must never leave audio hanging.
  useEffect(() => {
    return () => {
      blendSessionRef.current += 1;
      stopPhonicsPlayback("cvc_blend_unmount");
      amyVoiceController.pause();
    };
  }, []);

  const handleClose = useCallback(() => {
    stopBlend();
    onClose();
  }, [stopBlend, onClose]);

  if (!entry && !levelWords.length) {
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
            variant={level === lv ? "default" : "outline"}
            className="rounded-full text-[10px] font-bold h-7 px-3"
            onClick={() => {
              setLevel(lv);
              setWordIndex(0);
            }}
          >
            Level {lv}
          </Button>
        ))}
      </div>

      {level === 3 && (
        <p className="text-[10px] text-muted-foreground mb-2 text-center">Random word order</p>
      )}

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <Button
          type="button"
          size="sm"
          disabled={blending}
          onClick={() => void runBlend()}
          className="rounded-full text-xs font-bold"
        >
          Play blend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={blending}
          onClick={() => void runBlend({ skipSlow: true })}
          className="rounded-full text-xs font-bold"
        >
          Fast repeat
        </Button>
        {blending && (
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
        {level === 3 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={blending}
            onClick={() => setWordIndex((i) => (i + 1) % levelWords.length)}
            className="rounded-full text-xs font-bold"
          >
            Next word
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

      {/* Progression: c → a → t → cat */}
      <div
        className="flex items-center justify-center gap-1 flex-wrap mb-4 py-2"
        data-testid="cvc-blend-progression"
      >
        {displayLetters.map((grapheme, i) => {
          const isActive = activeIndex === i && phase !== "word";
          const isDone = completedIndices.includes(i) || showWord;
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
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-violet-500 animate-pulse" />
                )}
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
  const [blendLevel, setBlendLevel] = useState<1 | 2 | 3>(practiceLevel);
  const [activeWord, setActiveWord] = useState<CvcWordEntry | null>(null);
  const [levelWords, setLevelWords] = useState<CvcWordEntry[]>(() =>
    getCvcWordsByLevel(practiceLevel),
  );

  useEffect(() => {
    setLevelWords(getCvcWordsByLevel(blendLevel));
  }, [blendLevel]);

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
              variant={blendLevel === lv ? "default" : "outline"}
              className="rounded-full text-[10px] font-bold h-7"
              onClick={() => {
                setBlendLevel(lv);
                setActiveWord(null);
              }}
            >
              Level {lv}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {levelWords.map((w) => (
            <Button
              key={w.word}
              type="button"
              size="sm"
              variant={activeWord?.word === w.word ? "default" : "outline"}
              className="rounded-full font-quicksand font-bold"
              onClick={() => setActiveWord(w)}
            >
              {w.word}
            </Button>
          ))}
        </div>

        {activeWord && (
          <CvcBlendPanel
            word={activeWord.word}
            practiceLevel={blendLevel}
            onClose={() => setActiveWord(null)}
            onComplete={() => recordPlay(`cvc-${activeWord.word}`)}
          />
        )}
      </CardContent>
    </Card>
  );
}
