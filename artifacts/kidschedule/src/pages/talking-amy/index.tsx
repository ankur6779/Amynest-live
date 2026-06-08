// audit-block-ignore-start -- immersive Talking Amy uses intentional neon dark UI accents.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AppLink } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
import { AchievementUnlockCard } from "@/components/talking-amy/achievement-unlock-card";
import { TalkingAmyHero } from "@/components/talking-amy/talking-amy-hero";
import { Button } from "@/components/ui/button";
import { useListChildren } from "@workspace/api-client-react";
import { ArrowLeft, Dices, Hand, Mic, RefreshCw, Sparkles, Star, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { microphoneSessionManager } from "@/lib/microphone-session-manager";
import { playTalkingAmyEcho, stopTalkingAmyEcho } from "@/lib/talking-amy-echo";
import {
  mergeUnlockedAchievements,
  type TalkingAmyAchievement,
} from "@/lib/talking-amy-achievements";
import {
  dailyFeaturedAchievementBonus,
  getDailySpecialAmyMode,
  getDailySpecialAmyModeId,
  isDailyFeaturedMode,
} from "@/lib/talking-amy-daily-special";
import {
  getCollectionProgress,
  loadTalkingAmyCollection,
  recordTalkingAmyCollectionUse,
  discoverTalkingAmyMode,
  type TalkingAmyCollection,
} from "@/lib/talking-amy-collection";
import {
  getActiveSecretModeId,
  getSecretModeRemainingMs,
  tryTriggerSecretMode,
} from "@/lib/talking-amy-secrets";
import {
  loadTalkingAmyInputMode,
  saveTalkingAmyInputMode,
  type TalkingAmyInputMode,
} from "@/lib/talking-amy-input-mode";
import {
  TALKING_AMY_MODES,
  getTalkingAmyMode,
  resolveTalkingAmyPlaybackMode,
  type TalkingAmyModeId,
  type TalkingAmyRegularModeId,
  type TalkingAmySecretModeId,
} from "@/lib/talking-amy-modes";
import {
  getTalkingAmyPersonalitySnapshot,
  pickContextualTalkingAmyReaction,
} from "@/lib/talking-amy-personality";
import { recordTalkingAmyVisit } from "@/lib/talking-amy-streak";
import {
  miniSurpriseDurationMs,
  tryTalkingAmyMiniSurprise,
  type TalkingAmyMiniSurpriseId,
} from "@/lib/talking-amy-surprises";
import {
  loadFavoriteTalkingAmyMode,
  pickSurpriseTalkingAmyMode,
  randomCelebrateDurationMs,
  recordTalkingAmyReplay,
  recordTalkingAmyRepeat,
  recordTalkingAmySessionStart,
  resolveInitialTalkingAmyMode,
  saveFavoriteTalkingAmyMode,
  type TalkingAmyLocalStats,
} from "@/lib/talking-amy-session";
import {
  trackTalkingAmyModeSelected,
  trackTalkingAmyReplay,
  trackTalkingAmySessionStarted,
  trackTalkingAmySurpriseMode,
} from "@/lib/talking-amy-telemetry";
import { createSilenceWatcher } from "@/lib/talking-amy-vad";
import { openAndroidMicrophoneSettings } from "@/lib/microphone-permission";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { useReducedMotion } from "@/lib/reduced-motion";
import { usePrimeIosMicrophone } from "@/hooks/use-prime-ios-microphone";
import { useMicLevelRef } from "@/lib/amy-3d/use-mic-level";

type AnyChild = { id: number; name: string; age: number; ageMonths?: number | null };

type Phase = "idle" | "recording" | "thinking" | "echoing" | "celebrate";

const MIN_RECORD_MS = 400;
const MAX_RECORD_MS = 10_000;
const ACHIEVEMENT_UNLOCK_MS = 1500;

const FUN_PROMPTS = [
  "Say hello, Amy!",
  "Try a silly sound!",
  "Roar like a lion!",
  "Laugh out loud!",
  "Say your name!",
  "Make a funny noise!",
  "Whisper a secret!",
  "Sing la-la-la!",
] as const;

function cloneEchoBlob(blob: Blob): Blob {
  return new Blob([blob], { type: blob.type || "audio/webm" });
}

function SparkleBurst({
  show,
  emoji,
  reducedMotion,
}: {
  show: boolean;
  emoji: string;
  reducedMotion: boolean;
}) {
  if (!show) return null;
  const dots = reducedMotion ? 4 : 8;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: dots }, (_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: reducedMotion ? [0.6, 1, 0.6] : [0.4, 1.2, 0.6],
            x: Math.cos((i / dots) * Math.PI * 2) * (reducedMotion ? 48 : 72),
            y: Math.sin((i / dots) * Math.PI * 2) * (reducedMotion ? 48 : 72),
          }}
          transition={{ duration: reducedMotion ? 0.6 : 0.9, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 text-2xl"
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}

function ModeSelector({
  selected,
  favorite,
  dailySpecialId,
  discoveredIds,
  onSelect,
  disabled,
}: {
  selected: TalkingAmyRegularModeId;
  favorite: TalkingAmyRegularModeId | null;
  dailySpecialId: TalkingAmyRegularModeId;
  discoveredIds: readonly TalkingAmyModeId[];
  onSelect: (id: TalkingAmyRegularModeId) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-3"
      data-testid="talking-amy-mode-selector"
      role="radiogroup"
      aria-label="Amy voice mode"
    >
      {TALKING_AMY_MODES.map((m) => {
        const active = m.id === selected;
        const isFavorite = m.id === favorite;
        const isDaily = m.id === dailySpecialId;
        const isNew = !discoveredIds.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(m.id as TalkingAmyRegularModeId)}
            className={[
              "relative rounded-2xl border px-2 py-2.5 text-center transition active:scale-[0.98]",
              active
                ? "border-white/50 bg-white/20 shadow-lg ring-2 ring-white/30"
                : "border-white/15 bg-white/5 hover:bg-white/10",
              isDaily ? "ring-1 ring-amber-200/40" : "",
              disabled ? "opacity-50 pointer-events-none" : "",
            ].join(" ")}
          >
            {isFavorite ? (
              <Star className="absolute right-1.5 top-1.5 h-3 w-3 fill-amber-300 text-amber-300" />
            ) : null}
            {isDaily ? (
              <span className="absolute left-1.5 top-1.5 text-[9px]">✨</span>
            ) : null}
            {isNew ? (
              <span className="absolute bottom-1 right-1.5 text-[8px] text-amber-200/80">NEW</span>
            ) : null}
            <div className="text-2xl leading-none">{m.emoji}</div>
            <div className="mt-1 text-[10px] font-black leading-tight">{m.label}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function TalkingAmyPage() {
  usePrimeIosMicrophone();
  const reducedMotion = useReducedMotion();
  const dailySpecialId = useMemo(() => getDailySpecialAmyModeId(), []);
  const dailySpecial = useMemo(() => getDailySpecialAmyMode(), []);
  const personality = useMemo(() => getTalkingAmyPersonalitySnapshot(), []);
  const { data: children = [], isLoading } = useListChildren();
  const [childIdx, setChildIdx] = useState(0);
  const child = (children[childIdx] ?? children[0]) as AnyChild | undefined;

  const [modeId, setModeId] = useState<TalkingAmyRegularModeId>(() => resolveInitialTalkingAmyMode());
  const [favoriteMode, setFavoriteMode] = useState<TalkingAmyRegularModeId | null>(() =>
    loadFavoriteTalkingAmyMode(),
  );
  const [activeSecretId, setActiveSecretId] = useState<TalkingAmySecretModeId | null>(() =>
    getActiveSecretModeId(),
  );
  const [inputMode, setInputMode] = useState<TalkingAmyInputMode>(() => loadTalkingAmyInputMode());
  const [stats, setStats] = useState<TalkingAmyLocalStats>({
    repeatCount: 0,
    replayCount: 0,
    sessionCount: 0,
  });
  const [collection, setCollection] = useState<TalkingAmyCollection>(() => loadTalkingAmyCollection(0));
  const playbackModeId = resolveTalkingAmyPlaybackMode(modeId, activeSecretId);
  const mode = getTalkingAmyMode(playbackModeId);
  const collectionProgress = useMemo(() => getCollectionProgress(collection), [collection]);
  const isFeaturedToday = isDailyFeaturedMode(modeId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [promptIdx, setPromptIdx] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<TalkingAmyAchievement | null>(null);
  const [isFirstUseToday, setIsFirstUseToday] = useState(false);
  const [streakDay, setStreakDay] = useState(0);
  const [miniSurprise, setMiniSurprise] = useState<TalkingAmyMiniSurpriseId | null>(null);

  const startedAtRef = useRef(0);
  const consecutiveRepeatsRef = useRef(0);
  const lastDurationMsRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const modeIdRef = useRef(modeId);
  const lastBlobRef = useRef<Blob | null>(null);
  const celebrateTimerRef = useRef<number | null>(null);
  const vadCleanupRef = useRef<(() => void) | null>(null);
  const sessionTrackedRef = useRef(false);
  const [hasReplay, setHasReplay] = useState(false);

  const audioLevelRef = useMicLevelRef(phase === "recording");
  const prompt = FUN_PROMPTS[promptIdx % FUN_PROMPTS.length];
  const modeLocked = phase === "recording" || phase === "thinking" || phase === "echoing";
  const canReplay = hasReplay && phase === "idle";

  const clearVadWatcher = useCallback(() => {
    vadCleanupRef.current?.();
    vadCleanupRef.current = null;
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    modeIdRef.current = modeId;
  }, [modeId]);

  useEffect(() => {
    if (!child) return;
    if (sessionTrackedRef.current) return;
    sessionTrackedRef.current = true;
    const visit = recordTalkingAmyVisit(child.id);
    setIsFirstUseToday(visit.isFirstUseToday);
    setStreakDay(visit.streakDay);
    consecutiveRepeatsRef.current = 0;
    const next = recordTalkingAmySessionStart(child.id);
    setStats(next);
    setCollection(loadTalkingAmyCollection(child.id));
    trackTalkingAmySessionStarted(child.id, next.sessionCount);
  }, [child]);

  useEffect(() => {
    if (!child) return;
    setCollection(loadTalkingAmyCollection(child.id));
    setActiveSecretId(getActiveSecretModeId());
  }, [child?.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const secret = getActiveSecretModeId();
      setActiveSecretId(secret);
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (phaseRef.current === "idle") setPromptIdx((n) => n + 1);
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (maxTimerRef.current != null) window.clearTimeout(maxTimerRef.current);
      if (celebrateTimerRef.current != null) window.clearTimeout(celebrateTimerRef.current);
      clearVadWatcher();
      stopTalkingAmyEcho();
      lastBlobRef.current = null;
      setHasReplay(false);
      if (microphoneSessionManager.getState() === "recording") {
        void microphoneSessionManager.stopRecording();
      } else {
        microphoneSessionManager.cleanup();
      }
    };
  }, [clearVadWatcher]);

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current != null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const rotatePrompt = useCallback(() => {
    setPromptIdx((n) => n + 1);
  }, []);

  const selectMode = useCallback(
    (id: TalkingAmyRegularModeId) => {
      setModeId(id);
      if (child) {
        trackTalkingAmyModeSelected(child.id, id);
        setCollection(discoverTalkingAmyMode(child.id, id));
      }
    },
    [child],
  );

  const toggleInputMode = useCallback(() => {
    if (modeLocked) return;
    const next: TalkingAmyInputMode = inputMode === "hold" ? "tap" : "hold";
    setInputMode(next);
    saveTalkingAmyInputMode(next);
    setStatusHint(next === "tap" ? "Tap mode — tap once and talk!" : "Hold mode — press and hold!");
    window.setTimeout(() => setStatusHint(null), 1800);
  }, [inputMode, modeLocked]);

  const runCelebrate = useCallback(
    (
      activeMode: ReturnType<typeof getTalkingAmyMode>,
      durationMs: number,
      opts?: {
        achievement?: TalkingAmyAchievement | null;
        secretDiscovered?: boolean;
        isReplay?: boolean;
        miniSurpriseId?: TalkingAmyMiniSurpriseId | null;
      },
    ) => {
      const achievement = opts?.achievement ?? null;
      const msg = pickContextualTalkingAmyReaction(activeMode, durationMs, {
        achievement,
        secretDiscovered: opts?.secretDiscovered,
        isFirstUseToday,
        consecutiveRepeats: consecutiveRepeatsRef.current,
        streakDay,
        isReplay: opts?.isReplay,
      });
      setCelebration(msg);
      setUnlockedAchievement(achievement);
      setMiniSurprise(opts?.miniSurpriseId ?? null);
      setPhase("celebrate");
      rotatePrompt();
      if (celebrateTimerRef.current != null) window.clearTimeout(celebrateTimerRef.current);
      const surpriseMs = opts?.miniSurpriseId ? miniSurpriseDurationMs() : 0;
      const duration = achievement
        ? ACHIEVEMENT_UNLOCK_MS
        : Math.max(randomCelebrateDurationMs(), surpriseMs);
      celebrateTimerRef.current = window.setTimeout(() => {
        setPhase("idle");
        setCelebration(null);
        setUnlockedAchievement(null);
        setMiniSurprise(null);
      }, duration);
    },
    [isFirstUseToday, rotatePrompt, streakDay],
  );

  const playEcho = useCallback(
    async (blob: Blob, opts?: { isReplay?: boolean; durationMs?: number }) => {
      const secretNow = getActiveSecretModeId();
      const effectiveId = resolveTalkingAmyPlaybackMode(modeIdRef.current, secretNow);
      const activeMode = getTalkingAmyMode(effectiveId);
      const durationMs = opts?.durationMs ?? lastDurationMsRef.current;
      setPhase("thinking");
      setCelebration(null);
      setUnlockedAchievement(null);

      const result = await playTalkingAmyEcho(blob, {
        mode: effectiveId,
        onPlaybackStart: () => setPhase("echoing"),
      });

      if (result.ok) {
        let achievement: TalkingAmyAchievement | null = null;
        let triggeredSecret: TalkingAmySecretModeId | null = null;
        if (child) {
          const featuredBonus = dailyFeaturedAchievementBonus(modeIdRef.current);
          const nextCollection = recordTalkingAmyCollectionUse(child.id, effectiveId, {
            isReplay: opts?.isReplay,
            dailyFeaturedBonus: featuredBonus && !opts?.isReplay,
          });
          setCollection(nextCollection);

          if (opts?.isReplay) {
            const next = recordTalkingAmyReplay(child.id);
            setStats(next);
            trackTalkingAmyReplay(child.id, next.replayCount);
          } else {
            const next = recordTalkingAmyRepeat(child.id);
            setStats(next);
            triggeredSecret = tryTriggerSecretMode();
            if (triggeredSecret) {
              setActiveSecretId(triggeredSecret);
              const withSecret = discoverTalkingAmyMode(child.id, triggeredSecret);
              setCollection(withSecret);
            }
            consecutiveRepeatsRef.current += 1;
            const merged = mergeUnlockedAchievements(
              child.id,
              next.repeatCount,
              triggeredSecret
                ? discoverTalkingAmyMode(child.id, triggeredSecret)
                : nextCollection,
            );
            achievement = merged.newlyUnlocked[0] ?? null;
          }
        }
        if (triggeredSecret) {
          const secretMode = getTalkingAmyMode(triggeredSecret);
          setStatusHint(`✨ Secret Mode Active — ${secretMode.emoji} ${secretMode.label}!`);
          window.setTimeout(() => setStatusHint(null), 2800);
        }
        const miniSurpriseId = tryTalkingAmyMiniSurprise();
        runCelebrate(activeMode, durationMs, {
          achievement,
          secretDiscovered: !!triggeredSecret,
          isReplay: opts?.isReplay,
          miniSurpriseId,
        });
      } else {
        setPhase("idle");
        setStatusHint("Oops! Try again.");
        window.setTimeout(() => setStatusHint(null), 2200);
      }
    },
    [child, runCelebrate],
  );

  const handleEchoFromBlob = useCallback(
    async (blob: Blob | null, elapsedMs: number) => {
      lastDurationMsRef.current = elapsedMs;
      if (!blob || elapsedMs < MIN_RECORD_MS) {
        setPhase("idle");
        setStatusHint(inputMode === "tap" ? "Say a little more — tap and try again!" : "Hold a little longer and try again!");
        window.setTimeout(() => setStatusHint(null), 2200);
        rotatePrompt();
        return;
      }

      lastBlobRef.current = cloneEchoBlob(blob);
      setHasReplay(true);
      await playEcho(blob, { durationMs: elapsedMs });
    },
    [inputMode, playEcho, rotatePrompt],
  );

  const finishRecording = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    clearMaxTimer();
    clearVadWatcher();
    holdActiveRef.current = false;
    const elapsed = Date.now() - startedAtRef.current;
    const blob = await microphoneSessionManager.stopRecording();
    await handleEchoFromBlob(blob, elapsed);
  }, [clearMaxTimer, clearVadWatcher, handleEchoFromBlob]);

  const startVadWatcher = useCallback(() => {
    clearVadWatcher();
    vadCleanupRef.current = createSilenceWatcher({
      startedAtMs: startedAtRef.current,
      onSilence: () => {
        void finishRecording();
      },
    });
  }, [clearVadWatcher, finishRecording]);

  const startRecording = useCallback(async () => {
    if (holdActiveRef.current || phaseRef.current === "echoing" || phaseRef.current === "thinking") {
      return;
    }
    recordTtsUserGesture();
    stopTalkingAmyEcho();
    clearVadWatcher();
    setMicDenied(false);
    setStatusHint(null);
    setCelebration(null);
    holdActiveRef.current = true;
    startedAtRef.current = Date.now();
    setPhase("recording");

    const success = await microphoneSessionManager.startRecording({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      timeslice: 200,
      onError: (_err, mappedCode) => {
        holdActiveRef.current = false;
        clearMaxTimer();
        clearVadWatcher();
        setPhase("idle");
        const denied = mappedCode === "microphone_denied" || mappedCode === "microphone_blocked";
        setMicDenied(denied);
        setStatusHint(
          denied
            ? "Microphone is off — ask a grown-up to turn it on in Settings."
            : "Microphone busy — try again in a moment.",
        );
      },
    });

    if (!success) {
      holdActiveRef.current = false;
      setPhase("idle");
      return;
    }

    if (inputMode === "tap") {
      startVadWatcher();
    }

    clearMaxTimer();
    maxTimerRef.current = window.setTimeout(() => {
      void finishRecording();
    }, MAX_RECORD_MS);
  }, [clearMaxTimer, clearVadWatcher, finishRecording, inputMode, startVadWatcher]);

  const handleHearAgain = useCallback(async () => {
    const blob = lastBlobRef.current;
    if (!blob || phaseRef.current !== "idle") return;
    recordTtsUserGesture();
    stopTalkingAmyEcho();
    await playEcho(blob, { isReplay: true, durationMs: lastDurationMsRef.current });
  }, [playEcho]);

  const handleSurpriseMe = useCallback(() => {
    if (modeLocked) return;
    const next = pickSurpriseTalkingAmyMode(modeIdRef.current);
    selectMode(next);
    if (child) trackTalkingAmySurpriseMode(child.id, next);
    setStatusHint(`${getTalkingAmyMode(next).emoji} Surprise mode!`);
    window.setTimeout(() => setStatusHint(null), 1600);
  }, [child, modeLocked, selectMode]);

  const handleSaveFavorite = useCallback(() => {
    saveFavoriteTalkingAmyMode(modeId);
    setFavoriteMode(modeId);
    setStatusHint(`⭐ ${mode.label} is your favorite!`);
    window.setTimeout(() => setStatusHint(null), 1800);
  }, [mode.label, modeId]);

  const handleMicTap = useCallback(() => {
    if (phase === "recording") {
      void finishRecording();
      return;
    }
    if (phase === "idle") void startRecording();
  }, [finishRecording, phase, startRecording]);

  const onHoldStart = useCallback(
    (e: ReactPointerEvent) => {
      if (inputMode !== "hold") return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      void startRecording();
    },
    [inputMode, startRecording],
  );

  const onHoldEnd = useCallback(
    (e: ReactPointerEvent) => {
      if (inputMode !== "hold") return;
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (holdActiveRef.current) void finishRecording();
    },
    [finishRecording, inputMode],
  );

  const childTabs = useMemo(
    () =>
      children.map((c, i) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setChildIdx(i)}
          className={[
            "shrink-0 rounded-full px-3 py-1 text-xs font-black transition",
            i === childIdx
              ? "bg-white text-violet-700 shadow"
              : "bg-white/10 text-white/80 hover:bg-white/20",
          ].join(" ")}
        >
          {c.name}
        </button>
      )),
    [children, childIdx],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#1a0533] via-[#2d0b4e] to-[#120828] text-white">
        <p className="font-quicksand text-lg font-bold animate-pulse">Loading Amy…</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#1a0533] via-[#2d0b4e] to-[#120828] px-6 text-center text-white">
        <p className="font-quicksand text-xl font-black">Add a child to play Talking Amy!</p>
        <AddChildLink source="talking-amy-no-child">Add a child</AddChildLink>
        <AppLink href="/parenting-hub" replace source="talking-amy-no-child">
          <Button variant="outline" className="rounded-full border-white/20 bg-white/10 text-white">
            Back to Parent Hub
          </Button>
        </AppLink>
      </div>
    );
  }

  const micLabel =
    phase === "recording"
      ? inputMode === "tap"
        ? "Tap to stop"
        : "Keep holding…"
      : phase === "thinking"
        ? "Amy is thinking…"
        : phase === "echoing"
          ? "Amy is talking!"
          : inputMode === "tap"
            ? "Tap to talk"
            : "Hold to talk";

  const headline =
    celebration ??
    (phase === "recording"
      ? "I'm listening…"
      : phase === "thinking"
        ? "Getting ready…"
        : phase === "echoing"
          ? `${mode.emoji} ${mode.label}!`
          : `Hi ${child.name}!`);

  const burstEmoji =
    mode.id === "robot" ? "🤖" : mode.id === "alien" ? "👽" : mode.id === "monster" ? "🦖" : "✨";

  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-[#1a0533] via-[#3b0d6b] to-[#120828] text-white"
      data-testid="talking-amy-page"
    >
      <div className={["pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full blur-3xl", mode.theme.pageAccent].join(" ")} />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <AppLink href="/parenting-hub" replace source="talking-amy-back">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </AppLink>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200/85">
              {personality.mood.emoji} {personality.mood.label} · {mode.tagline}
            </p>
            <h1 className="truncate font-quicksand text-xl font-black">Talking Amy</h1>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-200/90">
            🔒 Private · On Device
          </div>
        </header>

        {children.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{childTabs}</div>
        ) : null}

        {personality.bedtime ? (
          <div
            className="mt-3 rounded-2xl border border-indigo-300/30 bg-indigo-500/12 px-3 py-2"
            data-testid="talking-amy-bedtime-banner"
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-indigo-100/90">
              🌙 Sleepy Amy is here — soft glows and gentle echoes tonight
            </p>
          </div>
        ) : null}

        {streakDay >= 2 ? (
          <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-amber-200/75">
            🔥 {streakDay}-day Amy streak
          </div>
        ) : null}

        <div
          className="mt-3 rounded-2xl border border-amber-200/25 bg-gradient-to-r from-amber-400/15 via-fuchsia-500/10 to-violet-500/15 px-3 py-2"
          data-testid="talking-amy-daily-special"
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-100/90">
            ✨ Featured Today: {dailySpecial.emoji} {dailySpecial.label}
            {isFeaturedToday ? " — bonus sparkle & progress!" : ""}
          </p>
        </div>

        {activeSecretId ? (
          <div
            className="mt-2 rounded-2xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-3 py-2"
            data-testid="talking-amy-secret-badge"
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-fuchsia-100">
              ✨ Secret Mode Active — {getTalkingAmyMode(activeSecretId).emoji}{" "}
              {getTalkingAmyMode(activeSecretId).label}
              <span className="ml-2 text-[10px] font-bold text-white/60 tabular-nums">
                {Math.ceil(getSecretModeRemainingMs() / 60_000)}m left
              </span>
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-white/70">
            🏆 Amy repeated you: <span className="text-amber-200">{stats.repeatCount}</span>
          </div>
          <div
            className="text-[11px] font-black uppercase tracking-wider text-white/70"
            data-testid="talking-amy-collection"
          >
            🎁 Collection:{" "}
            <span className="text-emerald-200">
              {collectionProgress.unlocked} / {collectionProgress.total}
            </span>
          </div>
          <div className="text-[10px] text-white/45 tabular-nums">
            {stats.replayCount} replays · {collectionProgress.secretUnlocked} secrets
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <ModeSelector
            selected={modeId}
            favorite={favoriteMode}
            dailySpecialId={dailySpecialId}
            discoveredIds={collection.discoveredModeIds}
            onSelect={selectMode}
            disabled={modeLocked}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canReplay}
              onClick={() => void handleHearAgain()}
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
              data-testid="talking-amy-hear-again"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Hear Again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={modeLocked}
              onClick={handleSurpriseMe}
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
              data-testid="talking-amy-surprise"
            >
              <Dices className="mr-1.5 h-3.5 w-3.5" />
              Surprise Me
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={modeLocked}
              onClick={handleSaveFavorite}
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
              data-testid="talking-amy-favorite"
            >
              <Star className="mr-1.5 h-3.5 w-3.5" />
              Favorite Mode
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={modeLocked}
              onClick={toggleInputMode}
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
              data-testid="talking-amy-input-mode"
            >
              {inputMode === "tap" ? (
                <Mic className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Hand className="mr-1.5 h-3.5 w-3.5" />
              )}
              {inputMode === "tap" ? "Tap to Talk" : "Hold to Talk"}
            </Button>
          </div>
        </div>

        <section className="relative mt-4 flex flex-1 flex-col overflow-visible rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_-30px_rgba(251,191,36,0.55)] backdrop-blur-xl">
          <AchievementUnlockCard
            achievement={unlockedAchievement}
            show={phase === "celebrate" && !!unlockedAchievement}
            reducedMotion={reducedMotion}
          />
          <SparkleBurst show={phase === "celebrate"} emoji={burstEmoji} reducedMotion={reducedMotion} />
          <TalkingAmyHero
            phase={phase}
            mode={mode}
            audioLevelRef={audioLevelRef}
            reducedMotion={reducedMotion}
            featured={isFeaturedToday && !activeSecretId}
            secretActive={!!activeSecretId}
            mood={personality.mood}
            bedtime={personality.bedtime}
            glowOpacityScale={personality.glowOpacityScale}
            animationSpeedScale={personality.animationSpeedScale}
            miniSurprise={miniSurprise}
          />

          <div className="space-y-2 text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={headline}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
                className="font-quicksand text-2xl font-black leading-tight"
              >
                {headline}
              </motion.p>
            </AnimatePresence>

            {!celebration && phase === "idle" && (
              <motion.p
                key={prompt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/75"
              >
                {prompt}
              </motion.p>
            )}

            {phase === "recording" && (
              <p className="text-sm font-bold text-white/85">
                {inputMode === "tap" ? "Amy hears you — pause 1 sec to finish!" : "Say something silly!"}
              </p>
            )}

            {phase === "thinking" && (
              <p className="text-sm text-white/70">Amy is getting your voice ready…</p>
            )}

            {(phase === "echoing" || phase === "celebrate") && (
              <p className="flex items-center justify-center gap-2 text-sm text-white/80">
                <Volume2 className="h-4 w-4" />
                {mode.echoHint}
              </p>
            )}

            {statusHint && (
              <p className="text-sm text-amber-100/80" data-testid="talking-amy-status">
                {statusHint}
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 space-y-3 pb-6">
          <div className="relative flex justify-center">
            <motion.button
              type="button"
              data-testid="talking-amy-hold-button"
              disabled={phase === "echoing" || phase === "thinking"}
              onClick={inputMode === "tap" ? handleMicTap : undefined}
              onPointerDown={onHoldStart}
              onPointerUp={onHoldEnd}
              onPointerCancel={onHoldEnd}
              onContextMenu={(e) => e.preventDefault()}
              animate={
                reducedMotion
                  ? { scale: 1 }
                  : phase === "recording"
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
              }
              transition={
                phase === "recording" && !reducedMotion
                  ? { duration: mode.theme.haloPulseSec, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={[
                "relative flex h-28 w-28 touch-none select-none flex-col items-center justify-center rounded-full border-4 shadow-2xl transition-colors",
                phase === "recording"
                  ? `border-white/40 bg-gradient-to-br ${mode.theme.micButtonRecording}`
                  : phase === "echoing" || phase === "thinking"
                    ? "border-white/25 bg-white/10 opacity-75"
                    : `border-white/30 bg-gradient-to-br ${mode.theme.micButtonGradient} active:scale-95`,
              ].join(" ")}
              style={{ touchAction: "none" }}
            >
              <Mic className="h-10 w-10 text-white drop-shadow" />
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/90">
                {micLabel}
              </span>
              {phase === "idle" && !reducedMotion && (
                <motion.span
                  className="absolute -inset-1 rounded-full border-2 border-white/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </motion.button>
          </div>

          <p className="text-center text-xs text-white/55">
            {inputMode === "tap"
              ? "Tap to talk — Amy stops after 1 second of quiet (or tap again). Up to 10 seconds. On-device only."
              : "Hold up to 10 seconds — Amy transforms your voice on this device only. Nothing is saved or uploaded."}
          </p>

          {micDenied && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-white/20 bg-white/10 text-white"
                onClick={() => void openAndroidMicrophoneSettings()}
              >
                Open microphone settings
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/80" />
            9 fun voices · 3 secrets · zero cloud
          </div>
        </section>
      </div>
    </div>
  );
}
// audit-block-ignore-end
