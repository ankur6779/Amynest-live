/**
 * React bindings for the Attention Engine.
 * Soft coaching only — never interrupts active quiz/detail learning.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "wouter";
import type { WorldId } from "@workspace/world-engine";
import { PremiumCard } from "@/components/learning-progress/premium-polish";
import {
  ATTENTION_LABELS,
  RHYTHM_LABELS,
  type AdaptiveProfile,
  type AttentionSnapshot,
} from "@/lib/sound-world-attention-engine";
import {
  getAttentionSnapshot,
  noteAttentionPrompt,
  recordAttentionActivity,
  recordAttentionEvent,
  recordAttentionIdle,
  subscribeAttention,
} from "@/lib/sound-world-attention-store";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import { publishAttentionStateChanged } from "@/lib/learning-events-bridge";
import { cn } from "@/lib/utils";

type AttentionContextValue = {
  snapshot: AttentionSnapshot;
  adaptive: AdaptiveProfile;
  track: (
    type: Parameters<typeof recordAttentionEvent>[1],
    detail?: Parameters<typeof recordAttentionEvent>[2],
  ) => void;
  notePrompt: () => void;
};

const AttentionContext = createContext<AttentionContextValue | null>(null);

export function SoundWorldAttentionProvider({
  childId,
  worldId,
  children,
}: {
  childId: number;
  worldId: WorldId;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(() => getAttentionSnapshot(childId));
  const lastClass = useRef(snapshot.classification);
  const idleAcc = useRef(0);
  const lastPointer = useRef(Date.now());

  useEffect(() => {
    setSnapshot(getAttentionSnapshot(childId));
    return subscribeAttention((snap) => {
      if (snap.childId === childId) setSnapshot(snap);
    });
  }, [childId]);

  useEffect(() => {
    if (lastClass.current === snapshot.classification) return;
    lastClass.current = snapshot.classification;
    trackDiscoveryWorldsEvent(worldId, "world_attention_state", {
      childId,
      classification: snapshot.classification,
      score: snapshot.score,
      rhythm: snapshot.rhythm,
      // Analytics-ready behavioral aggregates only — no names/PII.
      signals: {
        idleRatio: Number(snapshot.signals.idleRatio.toFixed(2)),
        rapidSkipRate: Number(snapshot.signals.rapidSkipRate.toFixed(2)),
        sessionMinutes: Number(snapshot.signals.sessionMinutes.toFixed(2)),
        incorrectStreak: snapshot.signals.incorrectStreak,
        completionRate: Number(snapshot.signals.completionRate.toFixed(2)),
      },
    });
    publishAttentionStateChanged({
      childId,
      classification: snapshot.classification,
      score: snapshot.score,
      rhythm: snapshot.rhythm,
      worldId,
    });
  }, [snapshot, childId, worldId]);

  // Idle sampler — local only, never uses camera/mic.
  useEffect(() => {
    const onPointer = () => {
      lastPointer.current = Date.now();
      if (idleAcc.current >= 2000) {
        recordAttentionIdle(childId, idleAcc.current, worldId);
      }
      idleAcc.current = 0;
      recordAttentionActivity(childId, worldId);
    };
    window.addEventListener("pointerdown", onPointer, { passive: true });
    const tick = window.setInterval(() => {
      const gap = Date.now() - lastPointer.current;
      if (gap >= 2000) {
        idleAcc.current += 2000;
        if (idleAcc.current >= 8000) {
          recordAttentionIdle(childId, idleAcc.current, worldId);
          idleAcc.current = 0;
        }
      }
    }, 2000);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.clearInterval(tick);
    };
  }, [childId, worldId]);

  const track = useCallback(
    (
      type: Parameters<typeof recordAttentionEvent>[1],
      detail: Parameters<typeof recordAttentionEvent>[2] = {},
    ) => {
      recordAttentionEvent(childId, type, { worldId, ...detail });
    },
    [childId, worldId],
  );

  const notePrompt = useCallback(() => {
    noteAttentionPrompt(childId);
  }, [childId]);

  const value = useMemo(
    () => ({
      snapshot,
      adaptive: snapshot.adaptive,
      track,
      notePrompt,
    }),
    [snapshot, track, notePrompt],
  );

  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useSoundWorldAttention(): AttentionContextValue {
  const ctx = useContext(AttentionContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. isolated unit surfaces).
    const snap = getAttentionSnapshot(0);
    return {
      snapshot: snap,
      adaptive: snap.adaptive,
      track: () => undefined,
      notePrompt: () => undefined,
    };
  }
  return ctx;
}

/** Soft coach strip — never blocks taps; hide during active learning if requested. */
export function AttentionCoachBanner({
  visible = true,
  className,
}: {
  visible?: boolean;
  className?: string;
}) {
  const { snapshot, adaptive } = useSoundWorldAttention();
  if (!visible || !adaptive.coachMessage) return null;

  return (
    <PremiumCard
      tier={adaptive.coachTone === "rest" ? "flat" : "glow"}
      className={cn("relative p-3", className)}
      data-attention={snapshot.classification}
      data-rhythm={snapshot.rhythm}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        {ATTENTION_LABELS[snapshot.classification]} · {RHYTHM_LABELS[snapshot.rhythm]}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{adaptive.coachMessage}</p>
      {adaptive.suggestRelaxWorld && (
        <Link
          href="/worlds/nature"
          className="mt-2 inline-flex text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          Open Nature Sounds
        </Link>
      )}
    </PremiumCard>
  );
}

/** Helper for living-env / motion consumers */
export function attentionAnimationScale(adaptive: AdaptiveProfile): number {
  if (adaptive.animationIntensity === "minimal") return 0.35;
  if (adaptive.animationIntensity === "reduced") return 0.65;
  return 1;
}

export function attentionMaxSprites(
  base: number,
  adaptive: AdaptiveProfile,
): number {
  if (adaptive.visualComplexity === "minimal") return Math.min(2, base);
  if (adaptive.visualComplexity === "reduced") return Math.max(2, Math.round(base * 0.45));
  return base;
}
