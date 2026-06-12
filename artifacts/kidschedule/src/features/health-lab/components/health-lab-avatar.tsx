import { AVATAR_EMOJIS, HEALTH_LEVELS } from "../constants";
import { resolveEquippedVisuals } from "../equipment";
import type { EquipmentSlot, HealthLevelId } from "../types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";

export function HealthLabAvatar({
  avatarId,
  level,
  size = "md",
  glowing = false,
  equippedItems = {},
}: {
  avatarId: string;
  level: HealthLevelId;
  size?: "sm" | "md" | "lg";
  glowing?: boolean;
  equippedItems?: Partial<Record<EquipmentSlot, string>>;
}) {
  const reduced = useReducedMotion();
  const emoji = AVATAR_EMOJIS[avatarId] ?? "🧑‍🔬";
  const levelName = HEALTH_LEVELS.find((l) => l.id === level)?.name ?? "Healthy Explorer";
  const visuals = resolveEquippedVisuals(equippedItems);

  const sizeClass =
    size === "lg" ? "h-24 w-24 text-5xl" : size === "sm" ? "h-12 w-12 text-2xl" : "h-16 w-16 text-4xl";

  const inner = (
    <div className="relative">
      {visuals.background && (
        <span className="absolute -inset-2 text-4xl opacity-30" aria-hidden>
          {visuals.background}
        </span>
      )}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-violet-500/30 to-cyan-500/20",
          "border-2 border-violet-400/50",
          sizeClass,
          glowing && "shadow-[0_0_28px_rgba(139,92,246,0.6)]",
          visuals.effects && !reduced && "health-lab-glow-pulse",
        )}
        role="img"
        aria-label={`Health avatar: ${levelName}`}
      >
        {visuals.body && (
          <span className="absolute -bottom-1 text-lg" aria-hidden>{visuals.body}</span>
        )}
        <span aria-hidden>{emoji}</span>
        {visuals.head && (
          <span className="absolute -top-2 text-lg" aria-hidden>{visuals.head}</span>
        )}
        {visuals.face && (
          <span className="absolute top-1 right-0 text-sm" aria-hidden>{visuals.face}</span>
        )}
      </div>
      {visuals.pet && (
        <span className="absolute -right-2 bottom-0 text-xl" aria-hidden>{visuals.pet}</span>
      )}
      {visuals.trail && !reduced && (
        <motion.span
          className="absolute -left-3 top-1/2 text-sm opacity-70"
          animate={{ x: [-4, 0, -4], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          aria-hidden
        >
          {visuals.trail}
        </motion.span>
      )}
    </div>
  );

  if (reduced || !glowing) return inner;

  return (
    <motion.div
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {inner}
    </motion.div>
  );
}
