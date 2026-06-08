// audit-block-ignore-start -- immersive Talking Amy uses intentional neon dark UI accents.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AppLink } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
import { AmyAvatar } from "@/components/amy-3d/amy-avatar";
import type { Amy3DState } from "@/lib/amy-3d/use-amy-3d-state";
import { useMicLevelRef } from "@/lib/amy-3d/use-mic-level";
import { Button } from "@/components/ui/button";
import { useListChildren } from "@workspace/api-client-react";
import { ArrowLeft, Mic, Sparkles, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { microphoneSessionManager } from "@/lib/microphone-session-manager";
import {
  playTalkingAmyEcho,
  stopTalkingAmyEcho,
} from "@/lib/talking-amy-echo";
import { openAndroidMicrophoneSettings } from "@/lib/microphone-permission";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { usePrimeIosMicrophone } from "@/hooks/use-prime-ios-microphone";

type AnyChild = { id: number; name: string; age: number; ageMonths?: number | null };

type Phase = "idle" | "recording" | "echoing" | "celebrate";

const MIN_RECORD_MS = 400;
const MAX_RECORD_MS = 6000;

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

const CELEBRATIONS = [
  "Haha! So funny!",
  "Amy heard you!",
  "That was awesome!",
  "Do it again!",
  "You're a star!",
] as const;

function useHeroSize() {
  const [size, setSize] = useState(300);
  useEffect(() => {
    const calc = () => {
      const s = Math.min(window.innerWidth * 0.68, 400);
      setSize(Math.max(220, Math.round(s)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

function TalkingAmyHero({
  phase,
  audioLevelRef,
}: {
  phase: Phase;
  audioLevelRef: RefObject<number>;
}) {
  const avatar = useHeroSize();
  const glass = Math.round(avatar * 1.16);
  const glow = Math.round(avatar * 1.5);
  const listening = phase === "recording";
  const speaking = phase === "echoing" || phase === "celebrate";
  const state: Amy3DState = speaking ? "speaking" : listening ? "listening" : "idle";

  return (
    <div
      className="relative flex flex-1 items-center justify-center"
      style={{ minHeight: glass + 24 }}
      data-testid="talking-amy-hero"
    >
      <div
        className={[
          "absolute rounded-full blur-3xl transition-all duration-500",
          listening ? "bg-amber-400/35" : speaking ? "bg-fuchsia-500/40" : "bg-violet-500/25",
        ].join(" ")}
        style={{ width: glow, height: glow }}
      />
      {listening && (
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full border-2 border-amber-300/60"
          style={{ width: glass, height: glass }}
        />
      )}
      <div
        className={[
          "relative grid place-items-center rounded-full border bg-white/10 shadow-2xl backdrop-blur-xl transition-all duration-500",
          speaking ? "scale-105 border-fuchsia-300/70" : "",
          listening ? "scale-110 border-amber-300/80" : "",
        ].join(" ")}
        style={{ width: glass, height: glass }}
      >
        <AmyAvatar
          tier="hero"
          size={avatar}
          ring
          bounce={speaking}
          state={state}
          audioLevelRef={audioLevelRef}
        />
      </div>
    </div>
  );
}

function SparkleBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const dots = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.4, 1.2, 0.6],
            x: Math.cos((i / dots.length) * Math.PI * 2) * 72,
            y: Math.sin((i / dots.length) * Math.PI * 2) * 72,
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 text-2xl"
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}

export default function TalkingAmyPage() {
  usePrimeIosMicrophone();
  const { data: children = [], isLoading } = useListChildren();
  const [childIdx, setChildIdx] = useState(0);
  const child = (children[childIdx] ?? children[0]) as AnyChild | undefined;

  const [phase, setPhase] = useState<Phase>("idle");
  const [promptIdx, setPromptIdx] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");

  const audioLevelRef = useMicLevelRef(phase === "recording");
  const prompt = FUN_PROMPTS[promptIdx % FUN_PROMPTS.length];

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (phaseRef.current === "idle") {
        setPromptIdx((n) => n + 1);
      }
    }, 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (maxTimerRef.current != null) window.clearTimeout(maxTimerRef.current);
      stopTalkingAmyEcho();
      if (microphoneSessionManager.getState() === "recording") {
        void microphoneSessionManager.stopRecording();
      } else {
        microphoneSessionManager.cleanup();
      }
    };
  }, []);

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current != null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const rotatePrompt = useCallback(() => {
    setPromptIdx((n) => n + 1);
  }, []);

  const handleEchoFromBlob = useCallback(
    async (blob: Blob | null, elapsedMs: number) => {
      if (!blob || elapsedMs < MIN_RECORD_MS) {
        setPhase("idle");
        setStatusHint("Hold a little longer and try again!");
        window.setTimeout(() => setStatusHint(null), 2200);
        rotatePrompt();
        return;
      }

      setPhase("echoing");
      setCelebration(null);
      const result = await playTalkingAmyEcho(blob);
      if (result.ok) {
        const msg = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
        setCelebration(msg);
        setPhase("celebrate");
        rotatePrompt();
        window.setTimeout(() => {
          setPhase("idle");
          setCelebration(null);
        }, 1600);
      } else {
        setPhase("idle");
        setStatusHint("Oops! Tap and hold to try again.");
        window.setTimeout(() => setStatusHint(null), 2200);
      }
    },
    [rotatePrompt],
  );

  const finishRecording = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    clearMaxTimer();
    holdActiveRef.current = false;
    const elapsed = Date.now() - startedAtRef.current;
    const blob = await microphoneSessionManager.stopRecording();
    await handleEchoFromBlob(blob, elapsed);
  }, [clearMaxTimer, handleEchoFromBlob]);

  const startRecording = useCallback(async () => {
    if (holdActiveRef.current || phaseRef.current === "echoing") return;
    recordTtsUserGesture();
    stopTalkingAmyEcho();
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

    clearMaxTimer();
    maxTimerRef.current = window.setTimeout(() => {
      void finishRecording();
    }, MAX_RECORD_MS);
  }, [clearMaxTimer, finishRecording]);

  const onHoldStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      void startRecording();
    },
    [startRecording],
  );

  const onHoldEnd = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (holdActiveRef.current) void finishRecording();
    },
    [finishRecording],
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
        <AddChildLink source="talking-amy-no-child">
          Add a child
        </AddChildLink>
        <AppLink href="/speech-coach" replace source="talking-amy-no-child">
          <Button variant="outline" className="rounded-full border-white/20 bg-white/10 text-white">
            Back to Speech Coach
          </Button>
        </AppLink>
      </div>
    );
  }

  const holdLabel =
    phase === "recording"
      ? "Keep holding…"
      : phase === "echoing"
        ? "Amy is talking!"
        : "Hold to talk";

  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-[#1a0533] via-[#3b0d6b] to-[#120828] text-white"
      data-testid="talking-amy-page"
    >
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-4">
        <header className="flex items-center gap-3">
          <AppLink href="/speech-coach" replace source="talking-amy-back">
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
              Fun echo game
            </p>
            <h1 className="truncate font-quicksand text-xl font-black">Talking Amy</h1>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-200/90">
            Private · on device
          </div>
        </header>

        {children.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{childTabs}</div>
        ) : null}

        <section className="relative mt-4 flex flex-1 flex-col rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_24px_80px_-30px_rgba(251,191,36,0.55)] backdrop-blur-xl">
          <SparkleBurst show={phase === "celebrate"} />
          <TalkingAmyHero phase={phase} audioLevelRef={audioLevelRef} />

          <div className="space-y-2 text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={celebration ?? prompt}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="font-quicksand text-2xl font-black leading-tight"
              >
                {celebration ?? (phase === "recording" ? "I'm listening…" : `Hi ${child.name}!`)}
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
              <p className="text-sm font-bold text-amber-200/90">Say something silly!</p>
            )}

            {phase === "echoing" && (
              <p className="flex items-center justify-center gap-2 text-sm text-fuchsia-200/90">
                <Volume2 className="h-4 w-4" />
                Amy is repeating you super fast!
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
              disabled={phase === "echoing"}
              onPointerDown={onHoldStart}
              onPointerUp={onHoldEnd}
              onPointerCancel={onHoldEnd}
              onContextMenu={(e) => e.preventDefault()}
              animate={
                phase === "recording"
                  ? { scale: [1, 1.06, 1] }
                  : { scale: 1 }
              }
              transition={
                phase === "recording"
                  ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={[
                "relative flex h-28 w-28 touch-none select-none flex-col items-center justify-center rounded-full border-4 shadow-2xl transition-colors",
                phase === "recording"
                  ? "border-amber-300 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
                  : phase === "echoing"
                    ? "border-fuchsia-300/50 bg-gradient-to-br from-fuchsia-600/60 to-violet-700/60 opacity-80"
                    : "border-white/30 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 active:scale-95",
              ].join(" ")}
              style={{ touchAction: "none" }}
            >
              <Mic className="h-10 w-10 text-white drop-shadow" />
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/90">
                {holdLabel}
              </span>
              {phase === "idle" && (
                <motion.span
                  className="absolute -inset-1 rounded-full border-2 border-white/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </motion.button>
          </div>

          <p className="text-center text-xs text-white/55">
            Hold the big button, say something, then let go — Amy repeats it in a funny fast voice.
            Nothing is saved.
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
            Like Talking Tom — but with Amy!
          </div>
        </section>
      </div>
    </div>
  );
}
// audit-block-ignore-end
