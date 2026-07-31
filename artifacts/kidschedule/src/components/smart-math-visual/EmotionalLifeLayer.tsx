import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import type { MathWorldTheme } from "./world-themes";
import type { WorldPersonality } from "./world-personality";
import { organicJitter } from "./world-personality";
import type { PresenceMode } from "./presence-ambience";

type EmotionalLifeLayerProps = {
  theme: MathWorldTheme;
  personality: WorldPersonality;
  vitality: number;
  presence: PresenceMode;
  celebrate?: boolean;
  sessionSeed?: number;
  /** Learning focus — breath + celebrate only */
  quiet?: boolean;
};

type StoryKind = "grow" | "balloon" | "reform";

/**
 * Emotional craftsmanship with restraint.
 * At rest: breath, rare story, soft discovery.
 * In focus: only shared breath + celebrate light — nothing competes with maths.
 */
export function EmotionalLifeLayer({
  theme,
  personality,
  vitality,
  presence,
  celebrate = false,
  sessionSeed = 1,
  quiet = false,
}: EmotionalLifeLayerProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const breath = personality.breathSeconds * organicJitter(sessionSeed, 0.06);
  const [story, setStory] = useState<{ kind: StoryKind; key: number } | null>(null);
  const [discovery, setDiscovery] = useState<{ id: number; key: number } | null>(null);
  const [lightPulse, setLightPulse] = useState(0);
  const discoveryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (discoveryTimerRef.current != null) {
        window.clearTimeout(discoveryTimerRef.current);
        discoveryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    setLightPulse((n) => n + 1);
  }, [celebrate]);

  // Micro-stories — rare, rest only, often skipped for emotional breathing room
  useEffect(() => {
    if (quiet || reduced || budget.particles === 0) return;
    let cancelled = false;
    const timers = new Set<number>();
    const track = (id: number) => {
      timers.add(id);
      return id;
    };
    const kinds: StoryKind[] = ["grow", "balloon", "reform"];
    const schedule = () => {
      const [lo, hi] = personality.storyMs;
      const span = Math.max(1000, hi - lo + 12000);
      const wait = lo * 1.4 + Math.random() * span;
      track(
        window.setTimeout(() => {
          if (cancelled) return;
          if (presence === "idle" && Math.random() > 0.55) {
            const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
            setStory({ kind, key: Date.now() });
            track(
              window.setTimeout(() => {
                if (!cancelled) setStory(null);
              }, 3600),
            );
          }
          schedule();
        }, wait),
      );
    };
    track(window.setTimeout(schedule, 22000 + Math.random() * 12000));
    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    };
  }, [quiet, reduced, budget.particles, personality.storyMs, presence]);

  const hotspots = useMemo(
    () =>
      quiet
        ? []
        : [
            { id: 0, left: "16%", top: "74%" },
            { id: 1, left: "82%", top: "70%" },
          ],
    [quiet],
  );

  const breathScale = 1 + (quiet ? 0.006 : vitality * 0.01);

  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden>
      {/* Shared breath — the one constant that ages well */}
      <motion.div
        className="absolute inset-0"
        animate={{
          scale: [1, breathScale, 1],
          opacity: [0.98, 1, 0.98],
        }}
        transition={{ duration: breath, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50% 55%" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 45%, ${theme.fog}, transparent 65%)`,
            opacity: quiet ? 0.2 : 0.28 + vitality * 0.15,
          }}
        />
      </motion.div>

      {/* Celebrate: one shared light travel — unforgettable, not noisy */}
      <AnimatePresence>
        {lightPulse > 0 && celebrate && (
          <motion.div
            key={lightPulse}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: personality.lightTravelSeconds }}
          >
            <motion.div
              className="absolute h-24 w-24 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
                mixBlendMode: "screen",
              }}
              initial={{ left: "44%", top: "40%", scale: 0.5 }}
              animate={{
                left: ["44%", "75%", "50%"],
                top: ["40%", "68%", "16%"],
                scale: [0.5, 1, 0.7],
              }}
              transition={{ duration: personality.lightTravelSeconds, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery — rest only, two quiet hotspots */}
      {!quiet && (
        <div className="pointer-events-auto absolute inset-0">
          {hotspots.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-hidden
              tabIndex={-1}
              className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: h.left, top: h.top, background: "transparent" }}
              onClick={(e) => {
                e.stopPropagation();
                setDiscovery({ id: h.id, key: Date.now() });
                if (discoveryTimerRef.current != null) {
                  window.clearTimeout(discoveryTimerRef.current);
                }
                discoveryTimerRef.current = window.setTimeout(() => {
                  setDiscovery(null);
                  discoveryTimerRef.current = null;
                }, 1200);
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {discovery && (
          <motion.div
            key={discovery.key}
            className="absolute"
            style={{
              left: hotspots.find((h) => h.id === discovery.id)?.left ?? "50%",
              top: hotspots.find((h) => h.id === discovery.id)?.top ?? "50%",
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.1, 0.9], y: [0, -12, -6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
          >
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.glow}` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!quiet && story && (
          <motion.div
            key={story.key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {story.kind === "balloon" && (
              <motion.div
                className="absolute bottom-0 left-[32%]"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: -160, opacity: [0, 0.85, 0] }}
                transition={{ duration: 3.4, ease: "easeOut" }}
              >
                <div
                  className="h-3.5 w-3 rounded-full"
                  style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.glow}` }}
                />
              </motion.div>
            )}
            {story.kind === "grow" && (
              <motion.div
                className="absolute bottom-3 left-[58%]"
                initial={{ scaleY: 0.25, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 0.65, 0.45] }}
                transition={{ duration: 2.8 }}
                style={{ transformOrigin: "bottom" }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: theme.accent, boxShadow: `0 0 6px ${theme.glow}` }}
                />
              </motion.div>
            )}
            {story.kind === "reform" && (
              <motion.div
                className="absolute bottom-[22%] left-[18%]"
                style={{
                  width: 10,
                  height: 14,
                  background: `linear-gradient(160deg, ${theme.accent}, transparent)`,
                  clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.65, 0.4], scale: [0.5, 1, 1] }}
                transition={{ duration: 2.4 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
