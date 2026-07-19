import { useRef } from "react";
import { motion } from "framer-motion";
import { abacusValue, setLowerCount, toggleUpper, type AbacusState } from "@workspace/abacus";
import { cn } from "@/lib/utils";
import { abacusSfx } from "./abacus-sfx";
import type { BoardFeedback } from "./abacus-types";

export type { BoardFeedback };

const BEAD_ACTIVE =
  "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_0_14px_rgba(245,158,11,0.65)] ring-2 ring-amber-300/80";
const BEAD_IDLE =
  "bg-gradient-to-br from-stone-300 via-stone-200 to-stone-400 ring-2 ring-stone-500/50 shadow-md " +
  "dark:from-amber-50 dark:via-amber-200 dark:to-amber-400 dark:ring-amber-300/70 " +
  "dark:shadow-[0_0_10px_rgba(251,191,36,0.45)]";

export function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 16 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((_, i) => {
        const x = (Math.random() - 0.5) * 280;
        const y = -120 - Math.random() * 80;
        const rot = (Math.random() - 0.5) * 720;
        const colors = ["hsl(var(--brand-amber-500))", "hsl(var(--brand-pink-500))", "hsl(var(--brand-violet-500))", "hsl(var(--brand-emerald-500))", "hsl(var(--brand-rose-500))"];
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 1, 0], x, y, rotate: rot }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 8,
              height: 14,
              background: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function BeadColumn({
  rod,
  rodIndex,
  onToggleUpper,
  onSetLower,
  highlight,
  disabled,
  learnMode,
}: {
  rod: { upper: 0 | 1; lower: 0 | 1 | 2 | 3 | 4 };
  rodIndex: number;
  onToggleUpper: (i: number) => void;
  onSetLower: (i: number, n: 0 | 1 | 2 | 3 | 4) => void;
  highlight?: boolean;
  disabled?: boolean;
  learnMode?: boolean;
}) {
  const spring = learnMode
    ? { type: "spring" as const, stiffness: 180, damping: 20 }
    : { type: "spring" as const, stiffness: 380, damping: 24 };
  const lowerTrackRef = useRef<HTMLDivElement>(null);
  const upperStartY = useRef(0);

  const setLowerFromPointer = (clientY: number) => {
    const track = lowerTrackRef.current;
    if (!track || disabled) return;
    const rect = track.getBoundingClientRect();
    const rel = 1 - (clientY - rect.top) / rect.height;
    const count = Math.min(4, Math.max(0, Math.round(rel * 4))) as 0 | 1 | 2 | 3 | 4;
    if (count !== rod.lower) {
      onSetLower(rodIndex, count);
      abacusSfx.bead();
    }
  };

  const handleLowerPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    const track = lowerTrackRef.current;
    if (!track) return;
    track.setPointerCapture(e.pointerId);
    setLowerFromPointer(e.clientY);
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      setLowerFromPointer(ev.clientY);
    };
    const onUp = () => {
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
    };
    const passiveOpts = { passive: false } as const;
    track.addEventListener("pointermove", onMove, passiveOpts);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
  };

  const handleUpperPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    upperStartY.current = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const delta = ev.clientY - upperStartY.current;
      if (delta > 18 && rod.upper === 0) {
        onToggleUpper(rodIndex);
        abacusSfx.bead();
        upperStartY.current = ev.clientY;
      } else if (delta < -18 && rod.upper === 1) {
        onToggleUpper(rodIndex);
        abacusSfx.bead();
        upperStartY.current = ev.clientY;
      }
    };
    const onUp = () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    const passiveOpts = { passive: false } as const;
    target.addEventListener("pointermove", onMove, passiveOpts);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 px-1.5 sm:px-2 py-3 rounded-xl touch-none select-none",
        "bg-gradient-to-b from-amber-100/80 to-amber-200/40 border border-amber-800/20",
        "dark:from-stone-800 dark:to-amber-950/80 dark:border-amber-500/35",
        highlight && "border-teal-400/70 shadow-[0_0_0_3px_rgba(45,212,191,0.25)] animate-pulse",
      )}
      data-testid={`abacus-rod-${rodIndex}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onToggleUpper(rodIndex);
          abacusSfx.bead();
        }}
        onPointerDown={handleUpperPointerDown}
        aria-label={`rod ${rodIndex + 1} upper bead`}
        data-testid={`abacus-upper-${rodIndex}`}
        className="relative h-14 w-full flex items-start justify-center touch-none select-none"
      >
        <motion.span
          animate={{ y: rod.upper === 1 ? 22 : 0 }}
          transition={spring}
          className={cn(
            "block h-8 w-14 rounded-full",
            rod.upper === 1 ? BEAD_ACTIVE : BEAD_IDLE,
          )}
        />
      </button>

      <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-amber-900 via-stone-700 to-amber-900 dark:from-amber-700 dark:via-amber-900 dark:to-amber-700 shadow-inner" />

      <div
        ref={lowerTrackRef}
        onPointerDown={handleLowerPointerDown}
        className="relative h-32 w-full flex flex-col items-center justify-end gap-0.5 pb-1 touch-none select-none"
      >
        {[0, 1, 2, 3].map((i) => {
          const beadIndexFromBottom = 3 - i;
          const isUp = rod.lower > beadIndexFromBottom;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const target = (isUp ? beadIndexFromBottom : beadIndexFromBottom + 1) as 0 | 1 | 2 | 3 | 4;
                onSetLower(rodIndex, target);
                abacusSfx.bead();
              }}
              aria-label={`rod ${rodIndex + 1} lower bead ${i + 1}`}
              data-testid={`abacus-lower-${rodIndex}-${i}`}
              className="block h-7 w-14 touch-none select-none"
            >
              <motion.span
                animate={{ y: isUp ? -10 : 0 }}
                transition={spring}
                className={cn(
                  "block h-7 w-14 rounded-full",
                  isUp ? BEAD_ACTIVE : BEAD_IDLE,
                )}
              />
            </button>
          );
        })}
      </div>

      <span className="text-[10px] font-mono font-bold text-amber-900/70 dark:text-amber-200/80">
        {rod.upper * 5 + rod.lower}
      </span>
    </div>
  );
}

export function AbacusBoard({
  state,
  onChange,
  highlightRod,
  disabled,
  feedback = "none",
  learnMode,
  valueSize = "md",
}: {
  state: AbacusState;
  onChange: (next: AbacusState) => void;
  highlightRod?: number;
  disabled?: boolean;
  feedback?: BoardFeedback;
  learnMode?: boolean;
  valueSize?: "md" | "lg";
}) {
  const value = abacusValue(state);
  return (
    <motion.div
      animate={
        feedback === "wrong"
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.45 }}
      className={cn(
        "rounded-3xl p-3 sm:p-4 border-2 shadow-inner touch-none select-none overscroll-none",
        "bg-gradient-to-b from-amber-100/80 via-amber-50/50 to-amber-200/40",
        "dark:from-stone-800 dark:via-stone-900 dark:to-amber-950/70",
        feedback === "correct" && "border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]",
        feedback === "wrong" && "border-rose-400 shadow-[0_0_0_3px_rgba(251,113,133,0.25)]",
        feedback === "none" && "border-amber-800/25 dark:border-amber-500/45",
      )}
    >
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {state.map((rod, i) => (
          <BeadColumn
            key={i}
            rod={rod}
            rodIndex={i}
            highlight={highlightRod === i}
            disabled={disabled}
            learnMode={learnMode}
            onToggleUpper={(idx) => onChange(toggleUpper(state, idx))}
            onSetLower={(idx, n) => onChange(setLowerCount(state, idx, n))}
          />
        ))}
      </div>
      <p
        className={cn(
          "mt-3 text-center font-black text-foreground font-quicksand",
          valueSize === "lg" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
        )}
        data-testid="abacus-value"
      >
        = {value}
      </p>
    </motion.div>
  );
}
