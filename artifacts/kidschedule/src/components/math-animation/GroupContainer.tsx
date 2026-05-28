import { AnimatePresence, motion } from "framer-motion";
import type { SceneContainer, SceneObject } from "@workspace/math-tricks";
import { MathObject } from "./MathObject";

interface GroupContainerProps {
  container: SceneContainer;
  objects: SceneObject[];
  sceneSize: number;
  reduced: boolean;
  onTapObject?: (object: SceneObject) => void;
  interactive?: boolean;
  /** Compact chrome for tight layouts (rows / many baskets). */
  dense?: boolean;
  /** Warm "happy" reaction on the celebration step (Phase 3 / 7). */
  celebrating?: boolean;
}

/**
 * Renders one logical container (an addend set, the merged result, a
 * multiplication row, a division basket, …) and lays its objects out in a
 * soft-glow zone. Objects are animated in/out with AnimatePresence; movement
 * between containers is handled by the shared `layoutId` on each MathObject.
 */
export function GroupContainer({
  container,
  objects,
  sceneSize,
  reduced,
  onTapObject,
  interactive,
  dense,
  celebrating,
}: GroupContainerProps) {
  const isBasket = container.role === "basket";
  const isResult = container.role === "result";
  const isRow = container.role === "row";

  const tint = container.color;
  const padding = dense ? 8 : 12;

  return (
    <motion.div
      layout
      transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 220, damping: 26 }}
      className="relative flex flex-col items-center"
      style={{
        borderRadius: isBasket ? 16 : 18,
        padding,
        minWidth: isBasket ? 84 : isRow ? undefined : 72,
        background: isResult
          ? `linear-gradient(160deg, ${tint}22, ${tint}0d)`
          : isBasket
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.035)",
        border: isResult
          ? `1.5px solid ${tint}66`
          : isBasket
            ? `1.5px solid ${tint}44`
            : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isResult ? `0 0 30px -8px ${tint}aa` : undefined,
      }}
    >
      {container.label && (
        <span
          className="mb-1 text-[10px] font-black uppercase tracking-wide"
          style={{ color: `${tint}` }}
        >
          {container.label}
        </span>
      )}
      <div
        className="flex flex-wrap items-center justify-center"
        style={{
          gap: sceneSize > 16 ? 4 : 6,
          maxWidth: isRow ? "100%" : 168,
          minHeight: 24,
        }}
      >
        <AnimatePresence mode="popLayout">
          {objects.map((obj, i) => (
            <MathObject
              key={obj.id}
              object={obj}
              sceneSize={sceneSize}
              reduced={reduced}
              onTap={onTapObject}
              interactive={interactive}
              celebrating={celebrating}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
      {isBasket && (
        <span className="mt-1 text-sm font-black text-white/80" aria-hidden>
          {objects.length}
        </span>
      )}
    </motion.div>
  );
}
