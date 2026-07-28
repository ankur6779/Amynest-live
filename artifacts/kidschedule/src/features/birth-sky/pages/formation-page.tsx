/**
 * Formation ceremony (Pack 3 Parts 1–3). Real timers; min 3200ms; soft wait 5000ms; fail 15000ms.
 * While generation retries are in flight, keep the loading ceremony — never flash FAILED early.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BirthSkyModuleShell } from "../components/birth-sky-module-shell";
import {
  BirthSkyContinuousSeal,
  SEAL_SLOT_SIZES,
} from "../components/birth-sky-seal-host";
import {
  FORMATION_HARD_TIMEOUT_MS,
  FORMATION_SOFT_WAIT_COPY,
  FORMATION_STATUS_LINES,
} from "../constants/formation";
import {
  createFormationMachine,
  isBackDisabled,
  tickFormationMachine,
  type FormationErrorCode,
  type FormationMachineSnapshot,
} from "../application/orchestrators/formation-machine";
import { formationDurationBucket } from "../domain/policies/formation-timing";
import { trackBirthSkyEvent } from "../lib/analytics";
import type { SkySnapshot } from "../domain/models/birth-profile";
import { userFacingGenerationMessage } from "../domain/models/snapshot-generation";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import { AmyAstroCosmicAmbient } from "../components/cosmic-ambient";
import "../design/amy-astro.css";

type Props = {
  snapshot: SkySnapshot | null;
  computeFailed?: boolean;
  /** True while create/retry pipeline is still running — keep loading UI. */
  isGenerating?: boolean;
  /** Internal error code — mapped to friendly copy only. */
  failureReason?: string | null;
  retryToken: number;
  onReady: () => void;
  onRetry: () => void;
  onBackToReview: () => void;
  onExit: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BirthSkyFormationPage({
  snapshot,
  computeFailed,
  isGenerating = false,
  failureReason = null,
  retryToken,
  onReady,
  onRetry,
  onBackToReview,
  onExit,
}: Props) {
  const [machine, setMachine] = useState<FormationMachineSnapshot>(() =>
    createFormationMachine(),
  );
  const machineRef = useRef(machine);
  machineRef.current = machine;
  const stageAnnounced = useRef<string | null>(null);
  const completedRef = useRef(false);
  const lastAnnounce = useRef(0);
  const [liveMessage, setLiveMessage] = useState("Forming Amy Astro Intelligence…");
  const [statusIdx, setStatusIdx] = useState(0);
  const reduced = prefersReducedMotion();
  const wallOrigin = useRef(0);
  const visualPausedMs = useRef(0);
  const hideStarted = useRef<number | null>(null);

  useEffect(() => {
    trackBirthSkyEvent("birth_sky.formation_started", {
      mode: snapshot?.mode ?? "full",
      time_precision: snapshot?.astronomy.precision.timePrecision ?? "unknown",
      place_provided: snapshot?.astronomy.precision.placeProvided ?? false,
    });
  }, [retryToken]);

  useEffect(() => {
    completedRef.current = false;
    stageAnnounced.current = null;
    wallOrigin.current = performance.now();
    visualPausedMs.current = 0;
    hideStarted.current = null;
    setMachine(createFormationMachine());

    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const wallNow = performance.now();
      const wallElapsed = wallNow - wallOrigin.current;

      // Visual clock pauses while backgrounded; hard timeout uses wall elapsed.
      let visualNow = wallElapsed - visualPausedMs.current;
      if (hideStarted.current != null) {
        visualNow = hideStarted.current - wallOrigin.current - visualPausedMs.current;
      }

      // While retries are in flight, never treat computeFailed / timeout as terminal.
      const fatal: FormationErrorCode | null =
        !isGenerating && computeFailed && !snapshot ? "compute_failed" : null;
      const offline =
        !isGenerating &&
        typeof navigator !== "undefined" &&
        !navigator.onLine &&
        !snapshot &&
        wallElapsed > 2000;

      const next = tickFormationMachine(machineRef.current, {
        now: wallElapsed,
        snapshotReady: Boolean(snapshot),
        fatalError: fatal,
        // Suppress hard timeout while generation/retry is still running.
        offlineInterrupted: offline,
        visualsPaused: hideStarted.current != null,
        reducedMotion: reduced,
      });

      // Soft-extend: if still generating past hard timeout, stay in soft_wait.
      if (
        isGenerating &&
        !snapshot &&
        next.state === "failed" &&
        next.errorCode === "formation_timeout"
      ) {
        next.state = "soft_wait";
        next.errorCode = null;
      }

      if (!fatal && next.state !== "failed" && next.state !== "ready") {
        next.visualElapsedMs = Math.max(0, visualNow);
      }

      if (next.stage && next.stage !== stageAnnounced.current) {
        stageAnnounced.current = next.stage;
        trackBirthSkyEvent("birth_sky.formation_stage_changed", { stage: next.stage });
        if (wallNow - lastAnnounce.current > 1000) {
          lastAnnounce.current = wallNow;
          setLiveMessage(`Forming — ${next.stage.replace(/_/g, " ")}`);
        }
      }

      if (next.state === "soft_wait") {
        setLiveMessage(FORMATION_SOFT_WAIT_COPY);
      }

      if (next.state === "ready" && !completedRef.current) {
        completedRef.current = true;
        trackBirthSkyEvent("birth_sky.formation_completed", {
          mode: snapshot?.mode ?? "full",
          formation_duration_bucket: formationDurationBucket(next.elapsedMs),
          time_precision: snapshot?.astronomy.precision.timePrecision ?? "unknown",
          place_provided: snapshot?.astronomy.precision.placeProvided ?? false,
        });
        setMachine(next);
        onReady();
        return;
      }

      if (next.state === "failed" && machineRef.current.state !== "failed") {
        trackBirthSkyEvent("birth_sky.formation_failed", {
          error_code: next.errorCode ?? "unknown",
          formation_duration_bucket: formationDurationBucket(next.elapsedMs),
        });
        setLiveMessage(userFacingGenerationMessage(next.errorCode));
      }

      setMachine(next);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) {
        hideStarted.current = performance.now();
      } else if (hideStarted.current != null) {
        visualPausedMs.current += performance.now() - hideStarted.current;
        hideStarted.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const statusTimer = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % FORMATION_STATUS_LINES.length);
    }, 2200);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(statusTimer);
    };
  }, [snapshot, computeFailed, isGenerating, onReady, reduced, retryToken]);

  const backDisabled = isBackDisabled(machine.state) || isGenerating;
  const copy =
    machine.state === "soft_wait" || isGenerating
      ? FORMATION_SOFT_WAIT_COPY
      : FORMATION_STATUS_LINES[statusIdx]!;

  const showFailed = machine.state === "failed" && !isGenerating && !snapshot;

  if (showFailed) {
    return (
      <BirthSkyModuleShell title={AMY_ASTRO_PRODUCT_NAME} onBack={onExit} testId="birth-sky-formation-failed">
        <div className="flex flex-col items-center pt-10 text-center">
          <BirthSkyContinuousSeal
            size={SEAL_SLOT_SIZES.formationFailed}
            slotId="seal-formation"
          />
          <h2 className="mt-6 font-quicksand text-2xl font-bold">Sky paused</h2>
          <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]" role="alert">
            {userFacingGenerationMessage(failureReason ?? machine.errorCode)}
          </p>
          <Button
            type="button"
            className="mt-8 min-h-12 w-full rounded-xl"
            onClick={onRetry}
            data-testid="birth-sky-formation-retry"
          >
            Generate again
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="amy-astro-btn-secondary mt-3 min-h-12 w-full rounded-xl"
            onClick={onBackToReview}
            data-testid="birth-sky-formation-back-review"
          >
            Back to review
          </Button>
          <button
            type="button"
            className="amy-astro-btn-text mt-2 min-h-11 w-full rounded-xl text-sm font-medium text-[hsl(40_20%_96%/0.72)] hover:bg-white/[0.06]"
            onClick={onExit}
          >
            Exit
          </button>
        </div>
      </BirthSkyModuleShell>
    );
  }

  return (
    <BirthSkyModuleShell
      title={AMY_ASTRO_PRODUCT_NAME}
      backDisabled={backDisabled}
      testId="birth-sky-formation"
      hideTopBar
      reducedMotion={reduced}
      ambientIntensity="full"
    >
      <div className="relative flex min-h-[70dvh] flex-col items-center justify-center pt-8 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <AmyAstroCosmicAmbient reducedMotion={reduced} living showMeteor={!reduced} />
        </div>
        <div
          className={cn(
            "relative z-10",
            !reduced && "amy-astro-pulse-glow amy-astro-float",
          )}
        >
          <BirthSkyContinuousSeal
            size={SEAL_SLOT_SIZES.formation}
            slotId="seal-formation"
            className={reduced ? "opacity-90" : undefined}
          />
        </div>
        <p
          className="amy-astro-display relative z-10 mt-8 text-xl text-[hsl(42_75%_82%)]"
          data-testid="birth-sky-formation-copy"
        >
          {copy}
        </p>
        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>
        <p className="relative z-10 mt-4 text-xs uppercase tracking-[0.18em] text-[hsl(40_20%_96%/0.45)]">
          {machine.elapsedMs > 0 && machine.elapsedMs < FORMATION_HARD_TIMEOUT_MS
            ? "Deep space is listening…"
            : "Entering silence…"}
        </p>
        {!reduced ? (
          <div
            className="relative z-10 mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10"
            aria-hidden
          >
            <div
              className="h-full bg-gradient-to-r from-[hsl(275_50%_50%)] to-[hsl(42_70%_55%)] transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (machine.visualElapsedMs / 3200) * 100)}%`,
              }}
            />
          </div>
        ) : null}
      </div>
    </BirthSkyModuleShell>
  );
}
