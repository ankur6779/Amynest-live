import { useMemo } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useVisualBudget } from "@/lib/performance-tier";
import type { Atmosphere, WeatherKind } from "./atmosphere";
import type { WorldMemory } from "./world-memory";
import type { MathWorldTheme } from "./world-themes";

type WorldEcosystemProps = {
  theme: MathWorldTheme;
  memory: WorldMemory;
  atmosphere: Atmosphere;
  pointer?: { x: number; y: number } | null;
  /** When true, keep memory traces but hush weather motion */
  quiet?: boolean;
};

function WeatherLayer({
  weather,
  accent,
  quiet,
}: {
  weather: WeatherKind;
  accent: string;
  quiet?: boolean;
}) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  if (reduced || budget.particles === 0 || quiet) return null;

  const n = Math.min(budget.particles, 4);

  if (weather === "clear" || weather === "breeze") {
    return (
      <>
        {Array.from({ length: Math.min(n, 2) }, (_, i) => (
          <motion.div
            key={i}
            className="absolute h-8 w-20 rounded-full"
            style={{
              top: `${12 + i * 10}%`,
              background: "rgba(255,255,255,0.06)",
              filter: "blur(6px)",
            }}
            animate={{ x: ["-20%", "120%"], opacity: [0, 0.5, 0] }}
            transition={{ duration: 18 + i * 3, delay: i * 2, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </>
    );
  }

  if (weather === "leaves" || weather === "magic_dust") {
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${(i * 17) % 90}%`,
              top: `-5%`,
              width: weather === "leaves" ? 6 : 3,
              height: weather === "leaves" ? 8 : 3,
              background: weather === "leaves" ? "rgba(180,220,120,0.55)" : accent,
              borderRadius: weather === "leaves" ? "40% 60% 50% 50%" : "50%",
            }}
            animate={{ y: ["0vh", "110%"], x: [0, (i % 2 === 0 ? 24 : -24)], rotate: [0, 180] }}
            transition={{ duration: 9 + (i % 4), delay: i * 0.7, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </>
    );
  }

  if (weather === "fireflies" || weather === "snow_dust") {
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${8 + ((i * 19) % 84)}%`,
              top: `${20 + ((i * 13) % 55)}%`,
              width: weather === "fireflies" ? 3 : 2,
              height: weather === "fireflies" ? 3 : 2,
              background: weather === "fireflies" ? "rgba(253,224,71,0.85)" : "rgba(255,255,255,0.7)",
              boxShadow: weather === "fireflies" ? "0 0 8px rgba(253,224,71,0.8)" : undefined,
            }}
            animate={{
              opacity: [0.15, 1, 0.15],
              y: [0, -10, 4, 0],
              x: [0, 6, -4, 0],
            }}
            transition={{ duration: 3.5 + (i % 3), delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </>
    );
  }

  if (weather === "soft_rain") {
    return (
      <>
        {Array.from({ length: n }, (_, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{
              left: `${(i * 11) % 100}%`,
              top: "-4%",
              width: 1,
              height: 10,
              background: "rgba(200,220,255,0.35)",
            }}
            animate={{ y: ["0%", "120%"], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.6 + (i % 3) * 0.2, delay: i * 0.15, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </>
    );
  }

  if (weather === "rainbow") {
    return (
      <motion.div
        className="absolute left-1/2 top-[8%] h-24 w-[80%] -translate-x-1/2 rounded-[100%]"
        style={{
          border: "2px solid transparent",
          borderTopColor: "rgba(255,180,180,0.35)",
          boxShadow:
            "0 -6px 0 rgba(255,220,150,0.25), 0 -12px 0 rgba(180,255,180,0.2), 0 -18px 0 rgba(160,200,255,0.18)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.15, 0.45, 0.15] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
    );
  }

  // shooting_star — handled by MagicMomentLayer primarily; tiny trail here
  return (
    <motion.span
      className="absolute h-px w-16"
      style={{
        top: "18%",
        left: "10%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8))",
      }}
      animate={{ x: ["0%", "140%"], opacity: [0, 1, 0], y: [0, 40] }}
      transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 11, ease: "easeOut" }}
    />
  );
}

/**
 * Theme ecosystems + world memory traces (trees, crystals, rockets, bridges).
 * Purely decorative persistence — "I changed this world."
 */
export function WorldEcosystem({
  theme,
  memory,
  atmosphere,
  pointer,
  quiet = false,
}: WorldEcosystemProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  const leanX = !quiet && pointer ? (pointer.x - 0.5) * 4 : 0;

  const memoryStars = useMemo(
    () =>
      Array.from(
        { length: Math.min(memory.starsIgnited, budget.particles || 0, quiet ? 3 : 5) },
        (_, i) => ({
          id: i,
          left: `${12 + ((i * 11) % 76)}%`,
          top: `${8 + ((i * 7) % 22)}%`,
        }),
      ),
    [memory.starsIgnited, budget.particles, quiet],
  );

  const trees = Math.min(memory.treesGrown, quiet ? 3 : 5);
  const flowers = Math.min(memory.flowersOpen, quiet ? 3 : 5);
  const bridges = Math.min(memory.bridgesRepaired, 3);
  const rockets = Math.min(memory.rocketsLaunched, quiet ? 1 : 3);

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden>
      <WeatherLayer weather={atmosphere.weather} accent={theme.particle} quiet={quiet} />

      {/* Persistent ignited stars from past visits */}
      {memoryStars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute text-[10px] font-black"
          style={{ left: s.left, top: s.top, color: theme.accent, opacity: quiet ? 0.28 : 0.4 }}
          animate={
            reduced || quiet
              ? undefined
              : { opacity: [0.28, 0.5, 0.28] }
          }
          transition={{ duration: 5 + (s.id % 3), repeat: Infinity }}
        >
          ★
        </motion.span>
      ))}

      {/* Crystal brightness — cave / general glow pools */}
      <motion.div
        className="absolute bottom-[18%] left-[12%] h-16 w-16 rounded-full"
        style={{
          background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
          opacity: 0.25 + memory.crystalBrightness * 0.55,
        }}
        animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Theme: meadow grass + flowers */}
      {(theme.id === "sunny_meadow" || theme.id === "magic_garden") && !reduced && !quiet && (
        <div className="absolute bottom-0 left-0 right-0 flex h-10 items-end justify-around px-2">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.span
              key={i}
              className="origin-bottom rounded-t-full"
              style={{
                width: 3,
                height: 10 + (i % 4) * 3,
                background: theme.id === "magic_garden" ? "rgba(74,222,128,0.45)" : "rgba(163,230,53,0.4)",
                transform: `translateX(${leanX * 0.3}px)`,
              }}
              animate={{ rotate: [-4 + leanX * 0.4, 4 + leanX * 0.4, -4 + leanX * 0.4] }}
              transition={{ duration: 2.4 + (i % 3) * 0.3, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          {Array.from({ length: flowers }, (_, i) => (
            <motion.span
              key={`f-${i}`}
              className="absolute bottom-3 h-2.5 w-2.5 rounded-full"
              style={{
                left: `${15 + i * 12}%`,
                background: theme.accent,
                boxShadow: `0 0 8px ${theme.glow}`,
              }}
              animate={{ scale: [0.85, 1.1, 0.85] }}
              transition={{ duration: 2.8, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      )}

      {/* Theme: moon forest fireflies + mist density from memory */}
      {theme.id === "moon_forest" && (
        <motion.div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: `linear-gradient(transparent, rgba(125,211,252,${0.04 + memory.blooms * 0.003}))`,
          }}
        />
      )}

      {/* Theme: rocket trails from past launches */}
      {theme.id === "rocket_base" &&
        Array.from({ length: rockets }, (_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-[12%] h-16 w-1 rounded-full"
            style={{
              left: `${20 + i * 22}%`,
              background: `linear-gradient(transparent, ${theme.accent}88)`,
            }}
            animate={reduced ? undefined : { opacity: [0.3, 0.7, 0.3], scaleY: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
          />
        ))}

      {/* Theme: crystal cave refraction shards */}
      {theme.id === "crystal_cave" &&
        Array.from({ length: 3 + Math.floor(memory.crystalBrightness * 3) }, (_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${18 + i * 20}%`,
              bottom: `${10 + (i % 2) * 8}%`,
              width: 10,
              height: 22,
              background: `linear-gradient(160deg, ${theme.accent}aa, transparent)`,
              clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
              opacity: 0.35 + memory.crystalBrightness * 0.4,
            }}
            animate={reduced ? undefined : { opacity: [0.3, 0.7, 0.3], rotate: [-2, 2, -2] }}
            transition={{ duration: 3.5, delay: i * 0.4, repeat: Infinity }}
          />
        ))}

      {/* Memory trees */}
      {trees > 0 &&
        Array.from({ length: trees }, (_, i) => (
          <motion.div
            key={`t-${i}`}
            className="absolute bottom-2"
            style={{ left: `${8 + i * 16}%` }}
            animate={reduced ? undefined : { y: [0, -1.5, 0] }}
            transition={{ duration: 3 + i * 0.2, repeat: Infinity }}
          >
            <div
              className="mx-auto h-3 w-1 rounded-full"
              style={{ background: "rgba(120,80,40,0.5)" }}
            />
            <div
              className="h-4 w-4 rounded-full"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${theme.accent}99, ${theme.fog})`,
                transform: `scale(${0.7 + Math.min(memory.treesGrown, 10) * 0.03})`,
              }}
            />
          </motion.div>
        ))}

      {/* Memory bridges — soft arcs */}
      {bridges > 0 && (
        <svg className="absolute bottom-8 left-[20%] h-8 w-[60%] opacity-40" viewBox="0 0 100 20">
          {Array.from({ length: bridges }, (_, i) => (
            <motion.path
              key={i}
              d={`M ${10 + i * 8} 16 Q 50 ${4 + i * 2} ${90 - i * 8} 16`}
              fill="none"
              stroke={theme.accent}
              strokeWidth="1.2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
