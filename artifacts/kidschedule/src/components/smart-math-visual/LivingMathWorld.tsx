import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import { MATH_WORLDS, type MathWorldTheme } from "./world-themes";
import type { Atmosphere } from "./atmosphere";
import type { WorldMemory } from "./world-memory";
import { PixarLighting } from "./PixarLighting";
import { WorldEcosystem } from "./WorldEcosystem";
import { MagicMomentLayer } from "./MagicMomentLayer";
import { TouchReactiveField } from "./TouchReactiveField";
import { EmotionalLifeLayer } from "./EmotionalLifeLayer";
import { personalityForTheme, organicJitter } from "./world-personality";
import { usePresenceAmbience, type PresenceMode } from "./presence-ambience";

/** rest = hero wonder · soft = browsing · focus = learning (protect attention) */
export type AmbienceIntensity = "rest" | "soft" | "focus";

type LivingMathWorldProps = {
  theme?: MathWorldTheme;
  children: React.ReactNode;
  className?: string;
  cameraDrift?: boolean;
  atmosphere?: Atmosphere;
  memory?: WorldMemory;
  celebrate?: boolean;
  immersed?: boolean;
  /** Protects learning focus by quieting the world */
  ambience?: AmbienceIntensity;
  onPointerChange?: (p: { x: number; y: number } | null) => void;
  onPresenceChange?: (mode: PresenceMode, vitality: number) => void;
};

const DEFAULT_MEMORY: WorldMemory = {
  version: 1,
  blooms: 0,
  treesGrown: 0,
  crystalBrightness: 0.25,
  bridgesRepaired: 0,
  rocketsLaunched: 0,
  starsIgnited: 0,
  flowersOpen: 0,
  lastVisitDay: "",
  visitCount: 0,
};

/**
 * Living world shell — refined for focus, calm, and 60fps.
 * Background supports; foreground teaches. No decorative noise while learning.
 */
export function LivingMathWorld({
  theme = MATH_WORLDS.sunny_meadow,
  children,
  className = "",
  cameraDrift = true,
  atmosphere,
  memory = DEFAULT_MEMORY,
  celebrate = false,
  immersed = false,
  ambience = "rest",
  onPointerChange,
  onPresenceChange,
}: LivingMathWorldProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const rootRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const pointerRaf = useRef(0);
  const personality = useMemo(() => personalityForTheme(theme), [theme]);
  const { mode: presence, vitality, noteActivity } = usePresenceAmbience(!reduced && ambience !== "focus");
  const sessionSeed = useMemo(() => Date.now() % 997, []);

  const quiet = ambience === "focus" || celebrate;
  const soft = ambience === "soft" || quiet;

  // Cap particles hard — elegance over quantity
  const particleCap = quiet ? 2 : soft ? 4 : Math.min(6, budget.particles);
  const energy = Number.isFinite(personality.particleEnergy) ? personality.particleEnergy : 1;
  const safeVitality = Number.isFinite(vitality) ? vitality : 0.45;
  const particleCount = Math.max(
    0,
    Math.min(
      particleCap,
      Math.round((quiet ? 2 : 6) * energy * (0.75 + safeVitality * 0.2)),
    ),
  );

  useEffect(() => {
    onPresenceChange?.(presence, vitality);
  }, [presence, vitality, onPresenceChange]);

  useEffect(() => {
    return () => {
      if (pointerRaf.current) {
        cancelAnimationFrame(pointerRaf.current);
        pointerRaf.current = 0;
      }
    };
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = rootRef.current;
      if (!el) return;
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (pointerRaf.current) return;
      pointerRaf.current = requestAnimationFrame(() => {
        pointerRaf.current = 0;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const next = {
          x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
          y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
        };
        setPointer(next);
        onPointerChange?.(next);
      });
    },
    [onPointerChange],
  );

  const onPointerDown = useCallback(() => {
    noteActivity();
  }, [noteActivity]);

  const onPointerLeave = useCallback(() => {
    if (pointerRaf.current) {
      cancelAnimationFrame(pointerRaf.current);
      pointerRaf.current = 0;
    }
    setPointer(null);
    onPointerChange?.(null);
  }, [onPointerChange]);

  const particles = useMemo(
    () =>
      Array.from({ length: Math.max(0, particleCount) }, (_, i) => ({
        id: i,
        left: `${12 + ((i * 23 + sessionSeed) % 76)}%`,
        top: `${14 + ((i * 29 + sessionSeed) % 60)}%`,
        size: 2 + (i % 2),
        delay: i * 0.55 * organicJitter(sessionSeed + i, 0.15),
        duration: (6 + (i % 3)) / personality.tempo * organicJitter(sessionSeed + i * 2, 0.12),
      })),
    [particleCount, personality.tempo, sessionSeed],
  );

  const sky = budget.enableGradients
    ? `linear-gradient(165deg, ${theme.sky[0]} 0%, ${theme.sky[1]} 48%, ${theme.sky[2]} 100%)`
    : theme.sky[1];

  const touchLean = !quiet && pointer ? (pointer.x - 0.5) * 3 : 0;

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{ background: sky, isolation: "isolate" }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
    >
      {atmosphere && (
        <PixarLighting
          theme={theme}
          atmosphere={atmosphere}
          celebrate={celebrate}
          quiet={quiet}
        />
      )}

      {/* Single soft bloom — no duplicate moving light layer */}
      {budget.enableGradients && !reduced && !atmosphere && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 30% 20%, ${theme.glow}, transparent 70%)`,
            opacity: quiet ? 0.35 : 0.55,
            mixBlendMode: "screen",
          }}
        />
      )}

      <WorldEcosystem
        theme={theme}
        memory={memory}
        atmosphere={
          atmosphere ?? {
            timeOfDay: "afternoon",
            weather: "clear",
            skyTint: "transparent",
            sunGlow: theme.glow,
            rimLight: theme.glow,
            shaftOpacity: 0.12,
          }
        }
        pointer={quiet ? null : pointer}
        quiet={quiet}
      />

      {/* Surprises only at rest — never during learning */}
      <MagicMomentLayer theme={theme} enabled={!quiet && ambience === "rest"} />

      {!quiet && <TouchReactiveField theme={theme} pointer={pointer} />}

      <EmotionalLifeLayer
        theme={theme}
        personality={personality}
        vitality={quiet ? Math.min(vitality, 0.35) : vitality}
        presence={presence}
        celebrate={celebrate}
        sessionSeed={sessionSeed}
        quiet={quiet}
      />

      {/* One calm fog band — opacity only, no sliding when focused */}
      {!reduced && budget.particles > 0 && !quiet && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-1/4 top-1/3 z-[2] h-20 w-[150%] rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.fog}, transparent)`,
            filter: budget.blurPx > 0 ? `blur(${Math.min(budget.blurPx, 8)}px)` : undefined,
          }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Sparse dust — no floating maths glyphs competing with lessons */}
      {!reduced &&
        !quiet &&
        particles.map((p) => (
          <motion.span
            key={p.id}
            aria-hidden
            className="pointer-events-none absolute z-[2] rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: theme.particle,
              opacity: 0.35,
            }}
            animate={{ opacity: [0, 0.45, 0], y: [0, -8, 0] }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 2 + (p.id % 3),
            }}
          />
        ))}

      {/* Stronger vignette in focus — eyes stay on content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background: quiet
            ? "radial-gradient(ellipse 85% 75% at 50% 42%, transparent 35%, rgba(0,0,0,0.48) 100%)"
            : "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 40%, rgba(0,0,0,0.32) 100%)",
        }}
      />

      <motion.div
        className="relative z-10"
        animate={{
          scale: immersed ? 1.03 : 1,
          y: immersed ? -3 : 0,
          x: touchLean * 0.08,
        }}
        transition={{ duration: immersed ? 0.85 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={
            cameraDrift && !reduced && !quiet && !immersed
              ? { y: [0, -1.5, 0] }
              : undefined
          }
          transition={
            cameraDrift && !reduced && !quiet && !immersed
              ? { duration: 14, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
