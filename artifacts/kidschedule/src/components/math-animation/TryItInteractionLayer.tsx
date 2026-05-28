import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type {
  SceneObject,
  VisualMathSequence,
  VisualObjectKind,
} from "@workspace/math-tricks";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { audioManager } from "@/lib/audio-manager";
import { MathObject } from "./MathObject";
import { CelebrationLayer } from "./CelebrationLayer";
import { MATH_ANIM_KEYFRAMES } from "./keyframes";

export interface TryItInteractionLayerProps {
  sequence: VisualMathSequence;
  ageYears: number;
  accentColor?: string;
  onSolved?: () => void;
}

const AMBER = "hsl(var(--brand-amber-400))";
const CYAN = "hsl(var(--brand-cyan-400))";

let TRY_ID = 0;
function makeObject(kind: VisualObjectKind, color: string, container: string): SceneObject {
  return { id: `try-${TRY_ID++}`, kind, color, container, highlight: false };
}

/**
 * Try-It mode — the child learns by doing. Two interaction patterns cover all
 * operations:
 *
 *  • "build"  — tap the +1 pad to add manipulatives until the answer is built;
 *               tap any object to take it away. (addition / doubles / ×)
 *  • "share"  — tap candies to deal them one-by-one into baskets, discovering
 *               equal sharing for yourself. (division)
 *
 * Both are driven entirely by the sequence config, so any new trick becomes
 * interactive for free.
 */
export function TryItInteractionLayer({
  sequence,
  ageYears,
  accentColor = AMBER,
  onSolved,
}: TryItInteractionLayerProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const mode = sequence.operation === "division" ? "share" : "build";

  return mode === "share" ? (
    <ShareActivity
      sequence={sequence}
      accentColor={accentColor}
      reduced={reduced}
      particles={budget.particles}
      onSolved={onSolved}
    />
  ) : (
    <BuildActivity
      sequence={sequence}
      ageYears={ageYears}
      accentColor={accentColor}
      reduced={reduced}
      particles={budget.particles}
      onSolved={onSolved}
    />
  );
}

// ─── Build: reach the target by tapping ───────────────────────────────────────

function BuildActivity({
  sequence,
  accentColor,
  reduced,
  particles,
  onSolved,
}: {
  sequence: VisualMathSequence;
  ageYears: number;
  accentColor: string;
  reduced: boolean;
  particles: number;
  onSolved?: () => void;
}) {
  const { t } = useTranslation();
  const target = sequence.result;
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const solvedRef = useRef(false);
  const count = objects.length;
  const solved = count === target;

  const checkSolved = useCallback(
    (next: SceneObject[]) => {
      if (next.length === target && !solvedRef.current) {
        solvedRef.current = true;
        onSolved?.();
      } else if (next.length !== target) {
        solvedRef.current = false;
      }
    },
    [target, onSolved],
  );

  const add = useCallback(() => {
    audioManager.unlockFromUserGesture();
    setObjects((prev) => {
      if (prev.length >= target + 4) return prev;
      const next = [...prev, makeObject(sequence.objectKind, accentColor, "tray")];
      checkSolved(next);
      return next;
    });
  }, [sequence.objectKind, accentColor, target, checkSolved]);

  const removeOne = useCallback(
    (obj: SceneObject) => {
      setObjects((prev) => {
        const next = prev.filter((o) => o.id !== obj.id);
        checkSolved(next);
        return next;
      });
    },
    [checkSolved],
  );

  const reset = useCallback(() => {
    solvedRef.current = false;
    setObjects([]);
  }, []);

  return (
    <div className="relative space-y-3">
      <style>{MATH_ANIM_KEYFRAMES}</style>
      <p className="text-center text-sm font-bold text-white/90">
        {t("components.math_animation.build_goal", "Make")}{" "}
        <span style={{ color: accentColor }}>{target}</span>
      </p>

      <div
        className="flex min-h-[112px] flex-wrap items-center justify-center gap-2 rounded-2xl p-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {objects.map((o) => (
              <MathObject
                key={o.id}
                object={{ ...o, highlight: solved }}
                sceneSize={Math.max(count, 6)}
                reduced={reduced}
                interactive
                onTap={removeOne}
              />
            ))}
          </AnimatePresence>
        </LayoutGroup>
        {count === 0 && (
          <p className="text-xs text-white/35">{t("components.math_animation.tap_to_add", "Tap + to add")}</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={add}
          className="flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black text-white"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          aria-label="Add one"
        >
          +
        </motion.button>
        <div className="text-center">
          <p className="text-3xl font-black tabular-nums" style={{ color: solved ? "hsl(var(--brand-green-400))" : "white" }}>
            {count}
          </p>
          <p className="text-[10px] text-white/40">{t("components.math_animation.count", "count")}</p>
        </div>
        <button
          onClick={reset}
          className="rounded-2xl px-3 py-2 text-xs font-bold text-white/55 transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          ↻
        </button>
      </div>

      <AnimatePresence>
        {solved && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-black"
            style={{ color: "hsl(var(--brand-green-400))" }}
          >
            🎉 {t("components.math_animation.you_made_it", "You made")} {target}!
          </motion.p>
        )}
      </AnimatePresence>

      <CelebrationLayer active={solved} particles={particles} reduced={reduced} color={accentColor} />
    </div>
  );
}

// ─── Share: deal candies into baskets ─────────────────────────────────────────

function ShareActivity({
  sequence,
  accentColor,
  reduced,
  particles,
  onSolved,
}: {
  sequence: VisualMathSequence;
  accentColor: string;
  reduced: boolean;
  particles: number;
  onSolved?: () => void;
}) {
  const { t } = useTranslation();
  // Recover total & group count from the result equation: total ÷ groups.
  const { total, groups } = useMemo(() => {
    const m = /(\d+)\s*÷\s*(\d+)/.exec(sequence.equation ?? "");
    const tot = m ? Number(m[1]) : sequence.result * 2;
    const grp = m ? Number(m[2]) : 2;
    return { total: tot, groups: grp };
  }, [sequence]);

  const [pile, setPile] = useState<SceneObject[]>(() =>
    Array.from({ length: total }, () => makeObject(sequence.objectKind, AMBER, "pile")),
  );
  const [baskets, setBaskets] = useState<SceneObject[][]>(() =>
    Array.from({ length: groups }, () => []),
  );
  const nextBasket = useRef(0);
  const solvedRef = useRef(false);

  const each = Math.floor(total / groups);
  const solved =
    pile.length === 0 && baskets.every((b) => b.length === each) && total % groups === 0;

  if (solved && !solvedRef.current) {
    solvedRef.current = true;
    onSolved?.();
  }

  const deal = useCallback((obj: SceneObject) => {
    audioManager.unlockFromUserGesture();
    setPile((prev) => prev.filter((o) => o.id !== obj.id));
    setBaskets((prev) => {
      const idx = nextBasket.current % prev.length;
      nextBasket.current += 1;
      const copy = prev.map((b) => [...b]);
      copy[idx].push({ ...obj, color: CYAN });
      return copy;
    });
  }, []);

  const reset = useCallback(() => {
    solvedRef.current = false;
    nextBasket.current = 0;
    setBaskets(Array.from({ length: groups }, () => []));
    setPile(Array.from({ length: total }, () => makeObject(sequence.objectKind, AMBER, "pile")));
  }, [groups, total, sequence.objectKind]);

  return (
    <div className="relative space-y-3">
      <style>{MATH_ANIM_KEYFRAMES}</style>
      <p className="text-center text-sm font-bold text-white/90">
        {t("components.math_animation.share_goal", "Tap a candy to share it fairly")}
      </p>

      <LayoutGroup>
        {/* Pile */}
        <div
          className="flex min-h-[64px] flex-wrap items-center justify-center gap-1.5 rounded-2xl p-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <AnimatePresence mode="popLayout">
            {pile.map((o) => (
              <MathObject key={o.id} object={o} sceneSize={total} reduced={reduced} interactive onTap={deal} />
            ))}
          </AnimatePresence>
          {pile.length === 0 && (
            <p className="text-xs text-white/35">{t("components.math_animation.pile_empty", "All shared!")}</p>
          )}
        </div>

        {/* Baskets */}
        <div className="mt-2 flex flex-wrap items-start justify-center gap-2">
          {baskets.map((items, i) => (
            <div
              key={i}
              className="flex min-w-[78px] flex-col items-center rounded-2xl p-2"
              style={{ background: "rgba(255,255,255,0.05)", border: `1.5px solid ${CYAN}44` }}
            >
              <span className="mb-1 text-base" aria-hidden>🧺</span>
              <div className="flex min-h-[24px] flex-wrap items-center justify-center gap-1">
                <AnimatePresence mode="popLayout">
                  {items.map((o) => (
                    <MathObject key={o.id} object={o} sceneSize={total} reduced={reduced} />
                  ))}
                </AnimatePresence>
              </div>
              <span className="mt-1 text-sm font-black text-white/80">{items.length}</span>
            </div>
          ))}
        </div>
      </LayoutGroup>

      <div className="flex items-center justify-center">
        <button
          onClick={reset}
          className="rounded-2xl px-4 py-2 text-xs font-bold text-white/55 transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          ↻ {t("components.math_animation.reset", "Start over")}
        </button>
      </div>

      <AnimatePresence>
        {solved && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-black"
            style={{ color: "hsl(var(--brand-green-400))" }}
          >
            🎉 {each} {t("components.math_animation.in_each_basket", "in each basket!")}
          </motion.p>
        )}
      </AnimatePresence>

      <CelebrationLayer active={solved} particles={particles} reduced={reduced} color={accentColor} />
    </div>
  );
}
