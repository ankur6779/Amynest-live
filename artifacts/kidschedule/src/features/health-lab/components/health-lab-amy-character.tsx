import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { GameOnboarding } from "../constants";

type DemoAction = GameOnboarding["demoAction"];

const MICRO_ANIMS = ["blink", "tilt", "wave", "bounce"] as const;

interface Props {
  action?: DemoAction;
  size?: "sm" | "md" | "lg";
  showDemo?: boolean;
  mood?: "happy" | "focused" | "celebrate" | "neutral";
  className?: string;
}

export function HealthLabAmyCharacter({
  action = "balance",
  size = "md",
  showDemo = false,
  mood = "happy",
  className,
}: Props) {
  const reduced = useReducedMotion();
  const [microAnim, setMicroAnim] = useState<(typeof MICRO_ANIMS)[number]>("blink");
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const blinkId = window.setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkId);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    const microId = window.setInterval(() => {
      setMicroAnim(MICRO_ANIMS[Math.floor(Math.random() * MICRO_ANIMS.length)]);
    }, 4000 + Math.random() * 4000);
    return () => clearInterval(microId);
  }, [reduced]);

  const sizeClass =
    size === "lg" ? "h-28 w-28 text-6xl" : size === "sm" ? "h-14 w-14 text-3xl" : "h-20 w-20 text-5xl";

  const demoKeyframes = showDemo && !reduced
    ? action === "balance"
      ? { rotate: [-4, 4, -4], y: [0, -3, 0] }
      : action === "hold"
        ? { scale: [1, 1.05, 1], y: [0, -8, 0] }
        : action === "tap"
          ? { scale: [1, 0.92, 1.05, 1] }
          : action === "freeze"
            ? { rotate: [0, -6, 6, -6, 0], scale: [1, 1.04, 1] }
            : action === "reactor"
              ? { scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }
              : { y: [0, -4, 0] }
    : undefined;

  const microKeyframes =
    !reduced && !showDemo
      ? microAnim === "tilt"
        ? { rotate: [0, 5, -3, 0] }
        : microAnim === "wave"
          ? { rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }
          : microAnim === "bounce"
            ? { y: [0, -6, 0] }
            : undefined
      : undefined;

  const moodEmoji = mood === "celebrate" ? "🎉" : mood === "focused" ? "🔬" : "🦩";
  const bodyEmoji = action === "balance" ? "🦩" : "🧑‍🔬";

  return (
    <motion.div
      className={cn("relative flex flex-col items-center", className)}
      animate={demoKeyframes ?? microKeyframes}
      transition={
        showDemo
          ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.8, repeat: microAnim !== "blink" ? Infinity : 0, repeatDelay: 2 }
      }
    >
      {/* Floating glow */}
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute -inset-4 rounded-full bg-violet-500/20 blur-2xl"
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          aria-hidden
        />
      )}

      {/* Character body */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-[1.5rem] border-2 border-white/20",
          "bg-gradient-to-br from-pink-400/30 via-violet-500/25 to-cyan-400/20",
          "shadow-[0_16px_48px_-12px_rgba(139,92,246,0.55)]",
          sizeClass,
          !reduced && "health-lab-icon-float",
        )}
        role="img"
        aria-label="Amy, your wellness guide"
      >
        <span aria-hidden>{bodyEmoji}</span>

        {/* Eyes */}
        <div className="absolute top-[28%] flex gap-[18%]" aria-hidden>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-900/80"
              animate={blink ? { scaleY: 0.1 } : { scaleY: 1 }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* Breathing chest glow */}
        {!reduced && (
          <motion.div
            className="pointer-events-none absolute inset-x-4 bottom-3 h-3 rounded-full bg-white/10 blur-sm"
            animate={{ opacity: [0.2, 0.5, 0.2], scaleX: [0.8, 1, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        )}
      </div>

      {mood === "celebrate" && !reduced && (
        <motion.span
          className="absolute -right-2 -top-2 text-2xl"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          aria-hidden
        >
          {moodEmoji}
        </motion.span>
      )}
    </motion.div>
  );
}

/** Live encouragement banner during gameplay */
export function HealthLabGuidance({
  messages,
  intervalMs = 4000,
  className,
}: {
  messages: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages, intervalMs]);

  const msg = messages[index] ?? messages[0];

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={msg}
        className={cn(
          "rounded-full border border-amber-300/25 bg-amber-500/15 px-4 py-1.5 text-sm font-semibold text-amber-100",
          "shadow-[0_0_24px_-6px_rgba(251,191,36,0.4)]",
          className,
        )}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        aria-live="polite"
      >
        {msg}
      </motion.p>
    </AnimatePresence>
  );
}
