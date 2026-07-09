// useLipSync — reusable, audio-free viseme / mouth system.
//
// Never touches mic / AudioContext / playback (speech-coach-engine-freeze).
// Procedural mouth uses organic noise envelopes (not metronomic sine stacks).
// Speech energy drives jaw amplitude; smile is owned by AmyAvatar compose
// (dynamic while talking) — this hook only moves the mouth open channel.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { FaceDriver } from "./face-driver";
import type { HybridFaceDriver } from "./hybrid-face-driver";
import type { Viseme, VisemeOrRest } from "./visemes";
import { createOrganicPhases, organic } from "./organic-noise";

export interface VisemeEvent {
  viseme: VisemeOrRest;
  duration: number;
}

export interface LipSyncController {
  speak(events: VisemeEvent[]): void;
  enqueue(viseme: VisemeOrRest, durationMs: number): void;
  stop(): void;
}

export interface LipSyncOptions {
  speaking?: boolean;
  reduced?: boolean;
  speechEnergyRef?: RefObject<number>;
}

const PROC_CYCLE: Viseme[] = ["AA", "OH", "EE", "IH", "OU"];

function isHybrid(face: FaceDriver): face is HybridFaceDriver {
  return face.kind === "hybrid" && "hasVisemes" in face;
}

export function useLipSync(
  face: FaceDriver | null,
  options: LipSyncOptions = {},
): LipSyncController {
  const { speaking = false, reduced = false, speechEnergyRef } = options;

  const queue = useRef<VisemeEvent[]>([]);
  const current = useRef<VisemeEvent | null>(null);
  const currentEnd = useRef(0);
  const mouthOpen = useRef(0);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const phases = useRef(createOrganicPhases());

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
    if (!face || !face.hasMouth) return;
    const t = ctx.clock.elapsedTime;
    const energy = Math.max(0, Math.min(1, speechEnergyRef?.current ?? 0.55));
    const hybrid = isHybrid(face) ? face : null;
    const useMorphVisemes = hybrid?.hasVisemes ?? false;
    const p = phases.current;

    if (useMorphVisemes && hybrid && (current.current || queue.current.length > 0)) {
      if (!current.current || t >= currentEnd.current) {
        current.current = queue.current.shift() ?? null;
        if (current.current) {
          currentEnd.current = t + Math.max(0.04, current.current.duration);
        }
      }
      const active = current.current;
      const targets: Partial<Record<Viseme, number>> = {};
      if (active && active.viseme !== "REST") {
        targets[active.viseme] = 0.7 + energy * 0.3;
      }
      hybrid.lerpVisemes(targets, 0.45);
      if (active && t >= currentEnd.current && queue.current.length === 0) {
        current.current = null;
      }
      return;
    }

    if (speakingRef.current && !reduced) {
      if (useMorphVisemes && hybrid) {
        // Organic syllable pacing — noise picks shape weights.
        const pace = (organic(t, p.breath, 0.9, 131) * 0.5 + 0.5) * 6.2 + 4.5;
        const phase = t * pace;
        const idx = Math.floor(phase) % PROC_CYCLE.length;
        const frac = phase - Math.floor(phase);
        const cur = PROC_CYCLE[idx];
        const next = PROC_CYCLE[(idx + 1) % PROC_CYCLE.length];
        const env =
          (0.22 + 0.78 * Math.abs(organic(t, p.sway, 1.4, 137))) *
          (0.5 + energy * 0.5);
        hybrid.lerpVisemes(
          { [cur]: (1 - frac) * env, [next]: frac * env },
          0.4,
        );
        return;
      }

      // Procedural jaw: organic envelope + lip relaxation between peaks.
      const syllable = Math.abs(organic(t, p.breath, 1.35, 149));
      const secondary = Math.abs(organic(t, p.sway, 1.8, 151));
      const relax = Math.max(0, organic(t, p.head, 0.55, 157)) ** 2;
      const open =
        (0.1 + syllable * 0.58 + secondary * 0.16) *
        (0.48 + energy * 0.52) *
        (1 - relax * 0.28);
      mouthOpen.current += (open - mouthOpen.current) * 0.35;
      face.setMouthOpen(mouthOpen.current);
      return;
    }

    // Speech finish: ease mouth shut gently — never snap.
    if (useMorphVisemes && hybrid) {
      hybrid.lerpVisemes({}, 0.12);
    } else {
      mouthOpen.current += (0 - mouthOpen.current) * 0.1;
      face.setMouthOpen(mouthOpen.current);
    }
  });

  useEffect(() => {
    return () => {
      queue.current = [];
      if (face && isHybrid(face)) face.closeMouth();
      else face?.setMouthOpen(0);
    };
  }, [face]);

  return controller;
}
