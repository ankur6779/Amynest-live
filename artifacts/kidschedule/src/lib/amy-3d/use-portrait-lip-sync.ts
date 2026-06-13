// usePortraitLipSync — audio-free 2D viseme cycling for AmyPortrait.
//
// Mirrors the procedural fallback in useLipSync (3D): while `active` is true we
// step through AA→OH→EE→IH→OU on a time-based schedule so Amy looks like she's
// talking with zero access to audio engines (speech-coach-engine-freeze.mdc).

import { useEffect, useState } from "react";
import { PORTRAIT_LIP_CYCLE } from "@/lib/amy-3d/amy-mouth-sprites";
import type { Viseme, VisemeOrRest } from "@/components/amy-3d/avatar/visemes";

export interface PortraitLipSyncOptions {
  /** Drive the mouth cycle (typically state === "speaking"). */
  active?: boolean;
  reduced?: boolean;
}

const CYCLE_SPEED = 6.5; // ~syllables/sec — matches useLipSync procedural mode

export function usePortraitLipSync(options: PortraitLipSyncOptions = {}): VisemeOrRest {
  const { active = false, reduced = false } = options;
  const [viseme, setViseme] = useState<VisemeOrRest>("REST");

  useEffect(() => {
    if (!active || reduced) {
      setViseme("REST");
      return;
    }

    let raf = 0;
    let lastIdx = -1;
    const start = performance.now();

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const phase = t * CYCLE_SPEED;
      const idx = Math.floor(phase) % PORTRAIT_LIP_CYCLE.length;
      if (idx !== lastIdx) {
        lastIdx = idx;
        setViseme(PORTRAIT_LIP_CYCLE[idx] as Viseme);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      setViseme("REST");
    };
  }, [active, reduced]);

  return viseme;
}
