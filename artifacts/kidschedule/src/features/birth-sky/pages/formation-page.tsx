/**
 * Formation ceremony (Pack 3 Parts 1–3). Real timers; min 3200ms; soft wait 5000ms; fail 15000ms.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

type Props = {
  snapshot: SkySnapshot | null;
  computeFailed?: boolean;
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
  const [liveMessage, setLiveMessage] = useState("Forming their Birth Sky…");
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

      const fatal: FormationErrorCode | null =
        computeFailed && !snapshot ? "compute_failed" : null;
      const offline =
        typeof navigator !== "undefined" &&
        !navigator.onLine &&
        !snapshot &&
        wallElapsed > 2000;

      // Feed wall time for timeout; machine uses elapsed from enteredAt=0 origin.
      const next = tickFormationMachine(machineRef.current, {
        now: wallElapsed,
        snapshotReady: Boolean(snapshot),
        fatalError: fatal,
        offlineInterrupted: offline,
        visualsPaused: hideStarted.current != null,
        reducedMotion: reduced,
      });

      // Override visual stage from visual clock when paused handling is active.
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
        setLiveMessage("We couldn’t finish forming the sky.");
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
  }, [snapshot, computeFailed, onReady, reduced, retryToken]);

  const backDisabled = isBackDisabled(machine.state);
  const copy =
    machine.state === "soft_wait"
      ? FORMATION_SOFT_WAIT_COPY
      : FORMATION_STATUS_LINES[statusIdx]!;

  if (machine.state === "failed") {
    return (
      <BirthSkyModuleShell title="Birth Sky" onBack={onExit} testId="birth-sky-formation-failed">
        <div className="flex flex-col items-center pt-10 text-center">
          <BirthSkyContinuousSeal
            size={SEAL_SLOT_SIZES.formationFailed}
            slotId="seal-formation"
          />
          <h2 className="mt-6 font-quicksand text-2xl font-bold">Sky paused</h2>
          <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.72)]" role="alert">
            {machine.errorCode === "formation_timeout"
              ? "This is taking longer than expected."
              : machine.errorCode === "offline_interrupted"
                ? "Connection was lost while forming."
                : "We couldn’t finish forming the sky."}
          </p>
          <Button
            type="button"
            className="mt-8 min-h-12 w-full rounded-xl"
            onClick={onRetry}
            data-testid="birth-sky-formation-retry"
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 min-h-12 w-full rounded-xl"
            onClick={onBackToReview}
            data-testid="birth-sky-formation-back-review"
          >
            Back to review
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 min-h-12 w-full rounded-xl"
            onClick={onExit}
          >
            Exit
          </Button>
        </div>
      </BirthSkyModuleShell>
    );
  }

  return (
    <BirthSkyModuleShell
      title="Birth Sky"
      backDisabled={backDisabled}
      testId="birth-sky-formation"
    >
      <div className="flex flex-col items-center pt-16 text-center">
        <BirthSkyContinuousSeal
          size={SEAL_SLOT_SIZES.formation}
          slotId="seal-formation"
          className={reduced ? "opacity-90" : undefined}
        />
        <p
          className="mt-8 font-quicksand text-lg font-semibold"
          data-testid="birth-sky-formation-copy"
        >
          {copy}
        </p>
        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>
        <p className="mt-4 text-xs text-[hsl(40_20%_96%/0.45)]">
          {machine.elapsedMs > 0 && machine.elapsedMs < FORMATION_HARD_TIMEOUT_MS
            ? "Forming their sky…"
            : "Beginning…"}
        </p>
      </div>
    </BirthSkyModuleShell>
  );
}
