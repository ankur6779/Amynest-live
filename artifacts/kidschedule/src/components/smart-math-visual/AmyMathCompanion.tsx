import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AmyIcon } from "@/components/amy-icon";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";

export type CompanionMood = "idle" | "wave" | "celebrate" | "look" | "curious" | "point";
/** Body-language emotion — no text, ambience only */
export type CompanionEmotion = "welcome" | "patient" | "excited" | "calm";

type AmyMathCompanionProps = {
  mood?: CompanionMood;
  /** Trigger wave once on mount / cinematic complete */
  greetOnMount?: boolean;
  /** Normalized look target (0–1). Amy leans toward it. */
  lookAt?: { x: number; y: number } | null;
  /** Softly point toward today's activity */
  pointHint?: boolean;
  /** Emotional awareness via body language only */
  emotion?: CompanionEmotion;
  /** World personality tempo (1 = neutral) */
  tempo?: number;
  className?: string;
};

/**
 * Amy lives inside the world — emotionally aware body language.
 * Welcome / patient / excited / calm. Never interrupts with text.
 */
export function AmyMathCompanion({
  mood = "idle",
  greetOnMount = true,
  lookAt = null,
  pointHint = false,
  emotion = "calm",
  tempo = 1,
  className = "",
}: AmyMathCompanionProps) {
  const reduced = useReducedMotion();
  const [pose, setPose] = useState<CompanionMood>(mood);
  const [visible, setVisible] = useState(false);
  const [breathe, setBreathe] = useState(1);

  useEffect(() => {
    const show = window.setTimeout(() => setVisible(true), 200);
    return () => window.clearTimeout(show);
  }, []);

  useEffect(() => {
    if (!greetOnMount || reduced) return;
    // Returning child → longer warm welcome wave
    const waveMs = emotion === "welcome" ? 2400 : 1800;
    const waveIn = window.setTimeout(() => setPose("wave"), 400);
    const settle = window.setTimeout(
      () => setPose(pointHint ? "point" : "idle"),
      waveMs,
    );
    return () => {
      window.clearTimeout(waveIn);
      window.clearTimeout(settle);
    };
  }, [greetOnMount, reduced, pointHint, emotion]);

  useEffect(() => {
    if (mood !== "idle") setPose(mood);
  }, [mood]);

  // Emotion-aware idle glances
  useEffect(() => {
    if (reduced || mood === "celebrate" || mood === "wave") return;
    let cancelled = false;
    let nestTimer: number | null = null;
    const base =
      emotion === "patient"
        ? 9000
        : emotion === "excited"
          ? 4200
          : emotion === "welcome"
            ? 5500
            : 7000;
    const interval = (base / Math.max(0.6, tempo)) + Math.random() * 3000;
    const id = window.setInterval(() => {
      if (cancelled) return;
      if (emotion === "patient") setPose("look");
      else if (emotion === "excited") setPose(Math.random() > 0.4 ? "curious" : "wave");
      else setPose(Math.random() > 0.5 ? "look" : "curious");
      if (nestTimer != null) window.clearTimeout(nestTimer);
      nestTimer = window.setTimeout(() => {
        if (!cancelled) setPose(pointHint ? "point" : "idle");
      }, emotion === "excited" ? 700 : 1200);
    }, interval);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (nestTimer != null) window.clearTimeout(nestTimer);
    };
  }, [mood, reduced, pointHint, emotion, tempo]);

  // Soft breath — slower when patient, quicker when excited
  useEffect(() => {
    if (reduced) return;
    const period =
      emotion === "excited" ? 1600 : emotion === "patient" ? 3200 : 2400;
    const id = window.setInterval(() => {
      setBreathe((b) => (b === 1 ? (emotion === "excited" ? 1.05 : 1.03) : 1));
    }, period / Math.max(0.7, tempo));
    return () => window.clearInterval(id);
  }, [reduced, emotion, tempo]);

  const bounce =
    pose === "celebrate" ||
    pose === "wave" ||
    (emotion === "excited" && pose === "curious");
  const lookRotate = lookAt
    ? (lookAt.x - 0.5) * 18
    : pose === "look"
      ? 8
      : pose === "point"
        ? -10
        : 0;
  const lookY = lookAt ? (lookAt.y - 0.6) * 6 : pose === "curious" ? -2 : 0;
  const settleY = emotion === "patient" ? 2 : emotion === "excited" ? -1 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`pointer-events-none absolute bottom-3 right-3 z-20 ${className}`}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: lookY + settleY,
            scale: breathe,
            rotate: pose === "wave" ? [0, -8, 8, -4, 0] : lookRotate,
          }}
          exit={{ opacity: 0, y: 10 }}
          transition={TRANSITION.springGentle}
          aria-hidden
        >
          <div
            className="relative"
            style={{
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
            }}
          >
            <motion.div
              className="absolute -bottom-1 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full"
              style={{
                background:
                  emotion === "excited"
                    ? "rgba(251,191,36,0.5)"
                    : "rgba(251,191,36,0.35)",
                filter: "blur(6px)",
              }}
              animate={reduced ? undefined : { opacity: [0.35, 0.7, 0.35] }}
              transition={{
                duration: emotion === "patient" ? 3.4 : 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {pose === "point" && !reduced && (
              <motion.span
                className="absolute -left-3 top-2 h-1.5 w-1.5 rounded-full"
                style={{ background: "hsl(var(--brand-amber-300))" }}
                animate={{ x: [-2, -10, -2], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}

            {pose === "celebrate" && !reduced && (
              <motion.span
                className="absolute inset-[-6px] rounded-full"
                style={{ border: "2px solid rgba(251,191,36,0.45)" }}
                animate={{ scale: [0.9, 1.25], opacity: [0.6, 0] }}
                transition={{ duration: 0.9, repeat: 2 }}
              />
            )}

            {/* Excited — soft warm rim without covering content */}
            {emotion === "excited" && pose === "idle" && !reduced && (
              <motion.span
                className="absolute inset-[-4px] rounded-full"
                style={{ boxShadow: "0 0 12px rgba(251,191,36,0.35)" }}
                animate={{ opacity: [0.2, 0.55, 0.2] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}

            <AmyIcon
              size={44}
              bounce={bounce && !reduced}
              ring={pose === "celebrate" || emotion === "welcome"}
              speaking={false}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
