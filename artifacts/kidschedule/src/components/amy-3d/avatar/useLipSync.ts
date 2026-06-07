// useLipSync — reusable, audio-free viseme system.
//
// IMPORTANT (speech-coach-engine-freeze.mdc): this hook NEVER touches the mic,
// an AudioContext, or playback. It only consumes *viseme events* pushed in from
// above and drives morph targets. Two modes:
//
//   1. Event-driven  — call controller.speak([{ viseme, duration }, …]) with a
//      real viseme timeline (e.g. produced alongside TTS). Best quality.
//   2. Procedural     — when `speaking` is true but no events are queued, a
//      freeze-safe time-based mouth-flap cycles through AA→OH→EE→IH→OU with an
//      open/close envelope so Amy looks like she's talking with zero audio.
//
// When neither applies the mouth eases shut. If the rig has no viseme blend
// shapes the manager setters are no-ops and this degrades silently.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MorphTargetManager, Viseme, VisemeOrRest } from "./visemes";

export interface VisemeEvent {
  viseme: VisemeOrRest;
  /** How long this shape is held, in seconds. */
  duration: number;
}

export interface LipSyncController {
  /** Replace the queue with a fresh viseme timeline. */
  speak(events: VisemeEvent[]): void;
  /** Append a single shape (durationMs) to the queue. */
  enqueue(viseme: VisemeOrRest, durationMs: number): void;
  /** Clear the queue and ease the mouth shut. */
  stop(): void;
}

export interface LipSyncOptions {
  /** Drives the procedural fallback when no events are queued. */
  speaking?: boolean;
  reduced?: boolean;
}

const PROC_CYCLE: Viseme[] = ["AA", "OH", "EE", "IH", "OU"];

export function useLipSync(
  manager: MorphTargetManager | null,
  options: LipSyncOptions = {},
): LipSyncController {
  const { speaking = false, reduced = false } = options;

  const queue = useRef<VisemeEvent[]>([]);
  const current = useRef<VisemeEvent | null>(null);
  const currentEnd = useRef(0);

  const controller = useMemo<LipSyncController>(
    () => ({
      speak(events) {
        queue.current = events.slice();
        current.current = null;
        currentEnd.current = 0;
      },
      enqueue(viseme, durationMs) {
        queue.current.push({ viseme, duration: durationMs / 1000 });
      },
      stop() {
        queue.current = [];
        current.current = null;
        currentEnd.current = 0;
      },
    }),
    [],
  );

  useFrame((ctx) => {
    if (!manager || !manager.hasVisemes) return;
    const t = ctx.clock.elapsedTime;
    const targets: Partial<Record<Viseme, number>> = {};

    // 1. Event-driven timeline. Items are scheduled relative to playback time,
    //    so timing tracks when speech actually started (not mount time).
    if (current.current || queue.current.length > 0) {
      if (!current.current || t >= currentEnd.current) {
        current.current = queue.current.shift() ?? null;
        if (current.current) {
          currentEnd.current = t + Math.max(0.04, current.current.duration);
        }
      }
      const active = current.current;
      if (active && active.viseme !== "REST") targets[active.viseme] = 1;
      manager.lerpVisemes(targets, 0.45);
      // Drop a finished item that has no successor so we can fall through to
      // the procedural / rest paths next frame.
      if (active && t >= currentEnd.current && queue.current.length === 0) {
        current.current = null;
      }
      return;
    }

    if (speaking && !reduced) {
      // Procedural mouth-flap (freeze-safe, no audio).
      const speed = 6.5; // ~syllables/sec
      const phase = t * speed;
      const idx = Math.floor(phase) % PROC_CYCLE.length;
      const frac = phase - Math.floor(phase);
      const cur = PROC_CYCLE[idx];
      const next = PROC_CYCLE[(idx + 1) % PROC_CYCLE.length];
      // Open/close envelope so the jaw isn't perpetually wide open.
      const env = 0.3 + 0.7 * Math.abs(Math.sin(t * 5.2));
      targets[cur] = (1 - frac) * env;
      targets[next] = Math.max(targets[next] ?? 0, frac * env);
      manager.lerpVisemes(targets, 0.4);
      return;
    }

    // Rest: ease everything shut.
    manager.lerpVisemes({}, 0.25);
  });

  // Cleanup: ease the mouth shut on unmount / when lip-sync is torn down.
  useEffect(() => {
    return () => {
      queue.current = [];
      manager?.closeMouth();
    };
  }, [manager]);

  return controller;
}
