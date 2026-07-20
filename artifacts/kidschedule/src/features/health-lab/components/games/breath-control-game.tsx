import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import { GUIDANCE_MESSAGES } from "../../constants";
import { computeBreathScore } from "../../scoring";
import { validateBreathSession, applyCheatMultiplier } from "../../anti-cheat";
import { useHealthLabAudio } from "../../hooks/use-health-lab-audio";
import { HealthLabLiveRegion } from "../health-lab-live-region";
import { HealthLabGameStage, HealthLabGameTopBar, HealthLabGameTimer } from "../health-lab-game-ui";
import { HealthLabPhaseFlash } from "../health-lab-cinematic";
import { HealthLabGameOnboarding } from "../health-lab-onboarding";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import { getProceduralAudioContext } from "@/lib/procedural-sfx";
import type { SessionCompleteOptions } from "../../types";
import {
  BALLOON_JOURNEY_MILESTONES,
  BALLOON_MAX_SECONDS,
  computeAltitudeMeters,
  getBalloonGlowTier,
} from "./balloon-journey/balloon-journey-constants";
import { BalloonJourneySky } from "./balloon-journey/balloon-journey-sky";
import { BalloonJourneyBalloon } from "./balloon-journey/balloon-journey-balloon";
import {
  BalloonJourneyEnergyStream,
  BalloonJourneyMilestoneBurst,
  BalloonJourneyParticles,
  BalloonJourneyPressHint,
  BalloonJourneyToast,
  BalloonJourneyVictory,
} from "./balloon-journey/balloon-journey-effects";
import { BalloonJourneyHoldButton } from "./balloon-journey/balloon-journey-hold-button";
import { useBalloonPhysics } from "./balloon-journey/use-balloon-physics";

interface Props {
  onComplete: (score: number, durationMs: number, options?: SessionCompleteOptions) => void;
  onExit: () => void;
  previousBestScore?: number;
}

function hapticHoldPress(): void {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(12);
    }
  } catch {
    /* optional */
  }
}

function useBalloonWindAmbience(holding: boolean) {
  const windRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  useEffect(() => {
    const ctx = getProceduralAudioContext();

    if (!holding) {
      const active = windRef.current;
      if (active && ctx) {
        try {
          active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          setTimeout(() => {
            try {
              active.source.stop();
            } catch {
              /* already stopped */
            }
          }, 250);
        } catch {
          /* ignore */
        }
      }
      windRef.current = null;
      return;
    }

    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.001;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.4);

    windRef.current = { source, gain };

    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        setTimeout(() => {
          try {
            source.stop();
          } catch {
            /* already stopped */
          }
        }, 250);
      } catch {
        /* ignore */
      }
      windRef.current = null;
    };
  }, [holding]);
}

function useBalloonRiseSound(holding: boolean, momentum: number) {
  const oscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  useEffect(() => {
    const ctx = getProceduralAudioContext();

    if (!holding) {
      const active = oscRef.current;
      if (active && ctx) {
        try {
          active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          setTimeout(() => {
            try {
              active.osc.stop();
            } catch {
              /* already stopped */
            }
          }, 200);
        } catch {
          /* ignore */
        }
      }
      oscRef.current = null;
      return;
    }

    if (!ctx || oscRef.current) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 180 + momentum * 120;

    const gain = ctx.createGain();
    gain.gain.value = 0.001;

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.008, now + 0.25);

    oscRef.current = { osc, gain };

    return () => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        setTimeout(() => {
          try {
            osc.stop();
          } catch {
            /* already stopped */
          }
        }, 200);
      } catch {
        /* ignore */
      }
      oscRef.current = null;
    };
  }, [holding]);

  useEffect(() => {
    const active = oscRef.current;
    const ctx = getProceduralAudioContext();
    if (!active || !ctx || !holding) return;
    const target = 180 + momentum * 120;
    active.osc.frequency.setTargetAtTime(target, ctx.currentTime, 0.12);
  }, [holding, momentum]);
}

export function BreathControlGame({ onComplete, onExit, previousBestScore = 0 }: Props) {
  const [phase, setPhase] = useState<"onboarding" | "playing">("onboarding");
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [milestoneBurst, setMilestoneBurst] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [liveMsg, setLiveMsg] = useState("Hold the glowing button to help your balloon fly higher");
  const startRef = useRef<number | null>(null);
  const touchMovesRef = useRef<number[]>([]);
  const pointerCountRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const victoryTriggeredRef = useRef(false);
  const { playTap, playSuccess, playMilestone, playCompletion } = useHealthLabAudio();
  const reduced = useReducedMotion();
  const physics = useBalloonPhysics(holding, !finished, reduced);

  useBalloonWindAmbience(holding && !finished && !reduced);
  useBalloonRiseSound(holding && !finished && !reduced, physics.momentum);

  const altitude = computeAltitudeMeters(elapsed);
  const glowTier = getBalloonGlowTier(elapsed);
  const particleIntensity = Math.min(1, elapsed / BALLOON_MAX_SECONDS);

  const touchStability =
    touchMovesRef.current.length < 2
      ? 100
      : Math.max(0, 100 - (Math.max(...touchMovesRef.current) - Math.min(...touchMovesRef.current)) * 150);
  const goldenMode = holding && touchStability >= 85 && elapsed >= 10;

  const projectedScore = (() => {
    const moves = touchMovesRef.current;
    const totalMovement = moves.reduce((a, b) => a + b, 0);
    const stability =
      moves.filter((m) => m > 0).length < 2
        ? Math.min(70, 40 + totalMovement * 5)
        : Math.max(0, 100 - (Math.max(...moves) - Math.min(...moves)) * 200);
    const verdict = validateBreathSession({
      holdSeconds: elapsed,
      touchMoves: moves,
      pointerCount: pointerCountRef.current,
    });
    return applyCheatMultiplier(computeBreathScore(elapsed, stability), verdict);
  })();
  const isVictoryPersonalBest = projectedScore > previousBestScore;

  useEffect(() => {
    if (!holding || finished) return;
    const id = window.setInterval(() => {
      if (startRef.current) {
        const sec = (Date.now() - startRef.current) / 1000;
        setElapsed(sec);

        for (const m of BALLOON_JOURNEY_MILESTONES) {
          if (sec >= m.seconds && lastMilestoneRef.current < m.seconds) {
            lastMilestoneRef.current = m.seconds;
            setToastMessage(`${m.emoji} ${m.label}`);
            setLiveMsg(m.label);
            setMilestoneBurst(true);
            void playMilestone();
            setTimeout(() => setMilestoneBurst(false), 800);
            setTimeout(() => setToastMessage(null), 2200);
          }
        }

        if (sec >= BALLOON_MAX_SECONDS && !victoryTriggeredRef.current) {
          victoryTriggeredRef.current = true;
          setShowVictory(true);
          void playCompletion();
        }
      }
    }, 50);
    return () => clearInterval(id);
  }, [holding, finished, playMilestone, playCompletion]);

  const releasePointer = useCallback((pointerId?: number) => {
    const btn = holdButtonRef.current;
    const id = pointerId ?? activePointerRef.current;
    if (btn && id != null) {
      try {
        if (btn.hasPointerCapture(id)) btn.releasePointerCapture(id);
      } catch {
        /* pointer may already be released */
      }
    }
    activePointerRef.current = null;
  }, []);

  const finishSession = useCallback(
    (durationMs: number) => {
      const holdSeconds = durationMs / 1000;
      const moves = touchMovesRef.current;
      const totalMovement = moves.reduce((a, b) => a + b, 0);
      const stability =
        moves.filter((m) => m > 0).length < 2
          ? Math.min(70, 40 + totalMovement * 5)
          : Math.max(0, 100 - (Math.max(...moves) - Math.min(...moves)) * 200);

      const verdict = validateBreathSession({
        holdSeconds,
        touchMoves: moves,
        pointerCount: pointerCountRef.current,
      });

      const score = applyCheatMultiplier(computeBreathScore(holdSeconds, stability), verdict);
      void playSuccess(score >= 95);
      setLiveMsg(`Journey complete. Score ${score}`);
      onComplete(score, durationMs, {
        cheatFlags: verdict.flags,
        eligibleForBadges: verdict.eligibleForBadges,
        eligibleForXp: verdict.eligibleForXp,
      });
    },
    [onComplete, playSuccess],
  );

  const handleEnd = useCallback(
    (pointerId?: number) => {
      if (finished || !holding) return;
      const durationMs = startRef.current ? Date.now() - startRef.current : 0;
      if (durationMs < 200) {
        releasePointer(pointerId);
        setHolding(false);
        startRef.current = null;
        setElapsed(0);
        setLiveMsg("Place your finger on the glowing circle and hold steady");
        return;
      }
      releasePointer(pointerId);
      setHolding(false);
      setFinished(true);
      finishSession(durationMs);
    },
    [finished, holding, finishSession, releasePointer],
  );

  const handleVictoryDismiss = useCallback(() => {
    setShowVictory(false);
    if (!finished && startRef.current) {
      setFinished(true);
      setHolding(false);
      releasePointer();
      finishSession(Date.now() - startRef.current);
    }
  }, [finished, finishSession, releasePointer]);

  if (phase === "onboarding") {
    return (
      <HealthLabGameOnboarding
        gameId="breath-control"
        onExit={onExit}
        onStart={() => {
          playTap();
          setPhase("playing");
        }}
        startLabel="Start Journey"
        ctaVariant="primary"
      />
    );
  }

  return (
    <HealthLabGameStage gameId="breath-control" fullBleed className="relative overflow-hidden">
      <HealthLabLiveRegion message={liveMsg} />
      <BalloonJourneySky elapsed={elapsed} altitude={altitude} reduced={reduced} />
      <HealthLabPhaseFlash active={milestoneBurst} color="rgba(251,191,36,0.4)" />

      <div className="relative z-20 shrink-0">
        <HealthLabGameTopBar onExit={onExit} title="Balloon Journey" />
      </div>

      <div className="relative z-[3] shrink-0 px-3 pt-1">
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
          <div className="flex justify-between gap-1">
            {BALLOON_JOURNEY_MILESTONES.map((m) => (
              <div key={m.seconds} className="flex min-w-0 flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "text-base transition-all duration-500",
                    elapsed >= m.seconds
                      ? "scale-110 opacity-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : "opacity-25 grayscale",
                  )}
                  aria-hidden
                >
                  {m.emoji}
                </span>
                <span
                  className={cn(
                    "hidden text-[8px] font-medium uppercase tracking-wide sm:block",
                    elapsed >= m.seconds ? "text-amber-200/90" : "text-white/30",
                  )}
                >
                  {m.shortLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="health-lab-game-region-grow relative z-[2]">
        <BalloonJourneyMilestoneBurst active={milestoneBurst} reduced={reduced} />
        <BalloonJourneyToast message={toastMessage} />
        <BalloonJourneyParticles holding={holding} intensity={particleIntensity} reduced={reduced} />
        <BalloonJourneyEnergyStream holding={holding} reduced={reduced} />
        <BalloonJourneyPressHint visible={!holding && !finished} reduced={reduced} />
        <BalloonJourneyBalloon
          physics={physics}
          glowTier={glowTier}
          goldenMode={goldenMode}
          holding={holding}
          reduced={reduced}
        />
        {goldenMode && (
          <div className="pointer-events-none absolute left-1/2 top-[18%] z-[4] -translate-x-1/2 px-3">
            <p className="rounded-full border border-amber-300/40 bg-amber-500/20 px-4 py-1 text-sm font-bold text-amber-100">
              ✨ Golden Balloon Mode!
            </p>
          </div>
        )}
      </div>

      <div className="relative z-[3] flex shrink-0 justify-center gap-3 px-4 pb-2">
        <div className="health-lab-timer-glass rounded-2xl px-4 py-2.5 text-center sm:px-5 sm:py-3">
          <p className="font-mono text-[clamp(1.25rem,5vw,1.5rem)] font-bold tabular-nums text-white">
            {altitude}m
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Altitude
          </p>
        </div>
        <HealthLabGameTimer
          value={`${elapsed.toFixed(1)}s`}
          label="Hold time"
          className="!px-4 !py-2.5 sm:!px-5 sm:!py-3 [&_p:first-child]:!text-[clamp(1.25rem,5vw,1.5rem)]"
        />
      </div>

      <div className="health-lab-game-region-hud relative z-30 flex flex-col items-center px-4 pt-1">
        <BalloonJourneyHoldButton
          holding={holding}
          disabled={finished}
          buttonRef={holdButtonRef}
          ariaLabel="Hold to inflate balloon"
          onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
            if (finished || !e.isPrimary) return;
            hapticHoldPress();
            playTap();
            pointerCountRef.current = 1;
            activePointerRef.current = e.pointerId;
            startRef.current = Date.now();
            touchMovesRef.current = [0.01];
            victoryTriggeredRef.current = false;
            setHolding(true);
            setElapsed(0);
            lastMilestoneRef.current = 0;
            setLiveMsg("Holding steady — balloon rising");
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* older WebViews may not support capture */
            }
          }}
          onPointerMove={(e) => {
            if (!holding || activePointerRef.current !== e.pointerId) return;
            const delta = Math.abs(e.movementX) + Math.abs(e.movementY);
            touchMovesRef.current.push(Math.max(0.01, delta));
          }}
          onPointerUp={(e) => {
            if (activePointerRef.current !== e.pointerId) return;
            handleEnd(e.pointerId);
          }}
          onPointerCancel={(e) => {
            if (activePointerRef.current !== e.pointerId) return;
            handleEnd(e.pointerId);
          }}
        >
          <Fingerprint
            className={cn(
              "h-[clamp(2.5rem,12vw,3.5rem)] w-[clamp(2.5rem,12vw,3.5rem)] text-white/95 drop-shadow-md",
              holding ? "opacity-100" : "opacity-85",
            )}
            strokeWidth={1.5}
            aria-hidden
          />
        </BalloonJourneyHoldButton>
        <p className="pointer-events-none mt-2 max-w-sm px-2 text-center text-[10px] leading-relaxed text-white/45">
          {GUIDANCE_MESSAGES.hold[Math.min(Math.floor(elapsed / 8), GUIDANCE_MESSAGES.hold.length - 1)]}
        </p>
      </div>

      <BalloonJourneyVictory
        show={showVictory}
        holdSeconds={elapsed}
        isPersonalBest={isVictoryPersonalBest}
        reduced={reduced}
        onDismiss={handleVictoryDismiss}
      />
    </HealthLabGameStage>
  );
}
