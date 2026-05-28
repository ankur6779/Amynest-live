import { memo } from "react";
import { motion } from "framer-motion";
import type { SceneObject } from "@workspace/math-tricks";
import { TRANSITION } from "@/lib/experience-system";
import { objectStyle, objectSizeFor } from "./object-styles";

interface MathObjectProps {
  object: SceneObject;
  /** Total objects on screen — drives adaptive sizing. */
  sceneSize: number;
  reduced: boolean;
  /** Called when the child taps the object (counting / tactile feedback). */
  onTap?: (object: SceneObject) => void;
  /** When true the object reacts to touch (Try-It mode). */
  interactive?: boolean;
  /** Soft, warm "happy" reaction on the celebration step (Phase 3 / 7). */
  celebrating?: boolean;
  /** Spawn stagger index for organic, non-mechanical entrances (Phase 7). */
  index?: number;
}

/**
 * A single animated math manipulative. Layout animation (via shared
 * `layout` + `layoutId`) makes the object glide when it moves between
 * containers (merge / distribute / regroup) with zero manual positioning.
 *
 * Motion polish (Phase 7): a gentle anticipation + soft overshoot on entry, a
 * squash/stretch pulse when highlighted, and a warm wiggle on celebration —
 * all calm, never chaotic, and fully disabled under reduced-motion.
 */
function MathObjectBase({
  object,
  sceneSize,
  reduced,
  onTap,
  interactive,
  celebrating,
  index = 0,
}: MathObjectProps) {
  const style = objectStyle(object.kind);
  const size = objectSizeFor(sceneSize);
  const spring = reduced ? { duration: 0.15 } : TRANSITION.springGentle;
  // Bouncier spring gives the entrance a soft overshoot ("pop").
  const enterSpring = reduced
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 360, damping: 18 };

  const highlightRing = object.highlight
    ? {
        boxShadow: `0 0 0 3px ${object.color}55, 0 0 16px ${object.color}aa`,
      }
    : undefined;

  // Squash/stretch pulse when highlighted; warm wiggle when celebrating.
  const scaleKeyframes = object.highlight && !reduced ? [1, 1.18, 0.96, 1] : 1;
  const rotateKeyframes = celebrating && !reduced ? [0, -7, 6, -3, 0] : 0;

  const shapeStyle: React.CSSProperties =
    style.shape === "glyph"
      ? {
          width: size,
          height: size,
          fontSize: size * 0.92,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }
      : {
          width: size,
          height: size,
          borderRadius: style.shape === "circle" ? "50%" : Math.max(4, size * 0.28),
          background:
            style.shape === "circle"
              ? `radial-gradient(circle at 32% 28%, ${object.color}, ${object.color}cc 70%)`
              : `linear-gradient(150deg, ${object.color}, ${object.color}bb)`,
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.3)`,
        };

  return (
    <motion.div
      layout
      layoutId={object.id}
      initial={reduced ? { opacity: 0, scale: 0.2 } : { opacity: 0, scale: 0.2, y: 8 }}
      animate={{
        opacity: 1,
        scale: scaleKeyframes,
        rotate: rotateKeyframes,
        y: 0,
        ...highlightRing,
      }}
      exit={{
        opacity: 0,
        scale: 0.3,
        y: reduced ? 0 : -42,
        transition: { duration: reduced ? 0.15 : 0.5, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{
        layout: spring,
        scale: object.highlight && !reduced ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : enterSpring,
        rotate: celebrating && !reduced ? { duration: 0.6, delay: Math.min(index * 0.03, 0.3) } : { duration: 0.2 },
        opacity: { duration: reduced ? 0.12 : 0.28, delay: reduced ? 0 : Math.min(index * 0.02, 0.18) },
      }}
      whileTap={interactive ? { scale: 0.82 } : undefined}
      onTap={interactive && onTap ? () => onTap(object) : undefined}
      aria-hidden
      style={{
        ...shapeStyle,
        cursor: interactive ? "pointer" : "default",
        borderRadius: shapeStyle.borderRadius,
        touchAction: "manipulation",
      }}
    >
      {style.shape === "glyph" ? style.glyph : null}
    </motion.div>
  );
}

export const MathObject = memo(MathObjectBase);
