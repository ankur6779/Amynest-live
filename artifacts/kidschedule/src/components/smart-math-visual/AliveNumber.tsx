import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";

type AliveNumberProps = {
  value: string | number;
  color?: string;
  size?: number;
  delay?: number;
  celebrate?: boolean;
  className?: string;
};

/**
 * Physical number glyph — jump, land, squash/stretch, soft elastic breath.
 * Never cartoonish; handcrafted physics feel.
 */
export function AliveNumber({
  value,
  color = "rgba(255,255,255,0.92)",
  size = 28,
  delay = 0,
  celebrate = false,
  className = "",
}: AliveNumberProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          fontWeight: 900,
          fontSize: size,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      style={{
        display: "inline-flex",
        fontWeight: 900,
        fontSize: size,
        color,
        lineHeight: 1,
        textShadow: `0 0 18px ${color}55`,
        willChange: "transform",
        transformOrigin: "50% 100%",
      }}
      initial={{ opacity: 0, scaleY: 0.7, scaleX: 1.15, y: -16 }}
      animate={
        celebrate
          ? {
              opacity: 1,
              y: [0, -10, 0, -4, 0],
              scaleX: [1, 0.9, 1.12, 0.96, 1],
              scaleY: [1, 1.15, 0.88, 1.05, 1],
            }
          : {
              opacity: 1,
              y: [0, -3, 0],
              scaleX: [1, 1.03, 1],
              scaleY: [1, 0.97, 1],
            }
      }
      transition={
        celebrate
          ? { ...TRANSITION.spring, delay, duration: 0.7 }
          : {
              opacity: { duration: 0.35, delay },
              y: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay },
              scaleX: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay },
              scaleY: { duration: 2.6, repeat: Infinity, ease: "easeInOut", delay },
            }
      }
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scaleX: 1.12, scaleY: 0.88 }}
    >
      {value}
    </motion.span>
  );
}
