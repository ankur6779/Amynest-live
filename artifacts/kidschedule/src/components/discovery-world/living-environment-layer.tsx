/**
 * Living environment visuals — absolute overlay, pointer-events none.
 * Does not change layout; sits behind world content.
 */

import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { WorldId } from "@workspace/world-engine";
import { useReducedMotion } from "@/lib/reduced-motion";
import {
  ambienceKindForWorld,
  livingEnvironmentCaps,
  resolveDayPeriod,
  resolveWeather,
  skyPalette,
  type DayPeriod,
  type WeatherKind,
} from "@/lib/sound-world-living-environment";
import { worldAmbientAudio } from "@/lib/sound-world-ambient-audio";
import { cn } from "@/lib/utils";
import {
  attentionAnimationScale,
  attentionMaxSprites,
  useSoundWorldAttention,
} from "./sound-world-attention";
import type { AdaptiveProfile } from "@/lib/sound-world-attention-engine";

type LivingEnvironmentLayerProps = {
  worldId: WorldId;
  muted?: boolean;
  className?: string;
  /** Optional override when used outside AttentionProvider */
  adaptiveOverride?: AdaptiveProfile;
};

function useLivingClock(worldId: WorldId) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Refresh period/weather on natural boundaries (~60s) — not every frame.
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const period = resolveDayPeriod(now);
    const weather = resolveWeather(worldId, now);
    return { period, weather: weather.weather, intensity: weather.intensity };
  }, [now, worldId]);
}

const DriftSprite = memo(function DriftSprite({
  emoji,
  delay,
  duration,
  top,
  size = 16,
  path = "h",
}: {
  emoji: string;
  delay: number;
  duration: number;
  top: string;
  size?: number;
  path?: "h" | "diag" | "arc";
}) {
  const xTo = path === "diag" ? "110vw" : "105vw";
  const yAnim =
    path === "arc"
      ? ["0vh", "-3vh", "1vh", "-2vh", "0vh"]
      : path === "diag"
        ? ["0vh", "4vh", "8vh"]
        : ["0vh", "-1.5vh", "0vh", "1.5vh", "0vh"];

  return (
    <motion.span
      className="absolute will-change-transform"
      style={{ top, left: "-8vw", fontSize: size, opacity: 0.55 }}
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{ x: xTo, y: yAnim, opacity: [0, 0.65, 0.65, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
        times: path === "arc" ? undefined : [0, 0.2, 0.8, 1],
      }}
      aria-hidden
    >
      {emoji}
    </motion.span>
  );
});

function SunRays({ intensity }: { intensity: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background:
          "conic-gradient(from 210deg at 78% 8%, transparent 0deg, rgba(255,236,180,0.16) 18deg, transparent 36deg, rgba(255,236,180,0.10) 52deg, transparent 70deg)",
        opacity: 0.35 + intensity * 0.4,
      }}
      animate={{ opacity: [0.25, 0.45, 0.3] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    />
  );
}

function WeatherLayer({
  weather,
  intensity,
  complex,
}: {
  weather: WeatherKind;
  intensity: number;
  complex: boolean;
}) {
  if (weather === "clear") return null;
  if (weather === "sun_rays") return <SunRays intensity={intensity} />;

  if (weather === "fog") {
    return (
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(226,232,240,0.18), rgba(226,232,240,0.05) 45%, transparent)",
        }}
        animate={{ opacity: [0.35, 0.55, 0.4], x: ["0%", "2%", "0%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
    );
  }

  const count = weather === "snow" ? Math.round(8 + intensity * 8) : Math.round(10 + intensity * 10);
  const emoji = weather === "snow" ? "❄" : weather === "rain" ? "·" : "～";

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: Math.min(count, complex ? 18 : 8) }).map((_, i) => (
        <motion.span
          key={`${weather}-${i}`}
          className="absolute text-sky-100/70"
          style={{
            left: `${(i * 17) % 100}%`,
            top: "-5%",
            fontSize: weather === "rain" ? 10 + (i % 3) * 2 : 12 + (i % 4),
          }}
          animate={{ y: ["0vh", "110vh"], opacity: [0, 0.7, 0] }}
          transition={{
            duration: weather === "wind" ? 7 + (i % 4) : 3.5 + (i % 5) * 0.4,
            delay: (i % 7) * 0.35,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}

function AnimalAtmosphere({ max, complex }: { max: number; complex: boolean }) {
  const n = Math.min(max, complex ? 10 : 4);
  return (
    <>
      {Array.from({ length: Math.min(3, n) }).map((_, i) => (
        <DriftSprite key={`cloud-${i}`} emoji="☁️" delay={i * 4} duration={28 + i * 6} top={`${8 + i * 10}%`} size={22 + i * 4} />
      ))}
      {complex &&
        Array.from({ length: Math.min(2, n) }).map((_, i) => (
          <DriftSprite key={`bird-${i}`} emoji="🐦" delay={6 + i * 9} duration={18 + i * 3} top={`${18 + i * 12}%`} size={14} path="arc" />
        ))}
      {Array.from({ length: Math.min(2, n) }).map((_, i) => (
        <DriftSprite key={`leaf-${i}`} emoji="🍃" delay={2 + i * 5} duration={16 + i * 4} top={`${40 + i * 15}%`} size={14} path="diag" />
      ))}
      {complex && (
        <DriftSprite emoji="🦋" delay={3} duration={22} top="32%" size={14} path="arc" />
      )}
      {complex && <SunRays intensity={0.35} />}
    </>
  );
}

function NatureAtmosphere({ max, complex, weather }: { max: number; complex: boolean; weather: WeatherKind }) {
  return (
    <>
      {Array.from({ length: Math.min(3, max) }).map((_, i) => (
        <DriftSprite key={`n-cloud-${i}`} emoji="☁" delay={i * 5} duration={32 + i * 5} top={`${6 + i * 9}%`} size={20} />
      ))}
      {complex &&
        Array.from({ length: 2 }).map((_, i) => (
          <motion.span
            key={`tree-${i}`}
            className="absolute bottom-[12%] text-2xl opacity-40"
            style={{ left: `${12 + i * 70}%` }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            🌲
          </motion.span>
        ))}
      {complex && weather === "clear" &&
        Array.from({ length: Math.min(4, max) }).map((_, i) => (
          <motion.span
            key={`firefly-${i}`}
            className="absolute rounded-full bg-amber-200"
            style={{
              width: 3,
              height: 3,
              left: `${20 + i * 18}%`,
              top: `${45 + (i % 3) * 10}%`,
              boxShadow: "0 0 6px rgba(253,230,138,0.8)",
            }}
            animate={{ opacity: [0.1, 0.9, 0.1], y: [0, -8, 0] }}
            transition={{ duration: 2.8 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
            aria-hidden
          />
        ))}
      {Array.from({ length: Math.min(2, max) }).map((_, i) => (
        <motion.div
          key={`water-${i}`}
          className="absolute bottom-0 left-0 right-0 h-16 opacity-20"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(56,189,248,0.25))",
          }}
          animate={{ x: ["-2%", "2%", "-2%"] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      ))}
    </>
  );
}

function VehicleAtmosphere({ max, complex }: { max: number; complex: boolean }) {
  return (
    <>
      {Array.from({ length: Math.min(4, max) }).map((_, i) => (
        <motion.span
          key={`road-${i}`}
          className="absolute h-0.5 w-8 rounded-full bg-amber-200/50"
          style={{ bottom: `${18 + (i % 2) * 4}%`, left: "-10%" }}
          animate={{ x: ["0vw", "120vw"], opacity: [0, 0.7, 0] }}
          transition={{ duration: 4 + i, delay: i * 1.2, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      ))}
      {complex && (
        <DriftSprite emoji="🛩" delay={2} duration={26} top="10%" size={16} path="diag" />
      )}
      {complex &&
        Array.from({ length: 2 }).map((_, i) => (
          <DriftSprite key={`balloon-${i}`} emoji="🎈" delay={4 + i * 7} duration={30 + i * 4} top={`${35 + i * 10}%`} size={14} path="arc" />
        ))}
      {complex &&
        Array.from({ length: Math.min(2, max) }).map((_, i) => (
          <DriftSprite key={`car-${i}`} emoji="🚗" delay={i * 8} duration={14 + i * 2} top={`${72 + i * 4}%`} size={12} />
        ))}
    </>
  );
}

function HomeAtmosphere({ max, complex }: { max: number; complex: boolean }) {
  return (
    <>
      {complex && (
        <motion.div
          className="absolute right-[14%] top-[12%] h-10 w-10 rounded-full border border-white/20 opacity-40"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          aria-hidden
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px]">✦</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px]">✦</span>
        </motion.div>
      )}
      <motion.div
        className="absolute left-[8%] top-[18%] h-16 w-10 opacity-30"
        style={{ background: "linear-gradient(90deg, rgba(253,186,116,0.25), transparent)" }}
        animate={{ x: [0, 4, 0], skewX: [0, 4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      {complex && (
        <motion.span
          className="absolute right-[28%] top-[20%] text-lg opacity-50 origin-top"
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          🕰️
        </motion.span>
      )}
      {Array.from({ length: Math.min(2, max) }).map((_, i) => (
        <motion.span
          key={`fish-${i}`}
          className="absolute bottom-[16%] text-sm opacity-45"
          style={{ left: `${20 + i * 30}%` }}
          animate={{ x: [0, 24, 0], y: [0, -4, 0] }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          🐠
        </motion.span>
      ))}
      {complex && (
        <motion.div
          className="absolute bottom-[10%] left-[10%] h-8 w-10 rounded-sm opacity-50"
          style={{ background: "radial-gradient(circle, rgba(251,146,60,0.55), transparent 70%)" }}
          animate={{ opacity: [0.35, 0.7, 0.4, 0.65, 0.35], scale: [1, 1.05, 0.98, 1.04, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          aria-hidden
        />
      )}
    </>
  );
}

function InstrumentAtmosphere({ max, complex }: { max: number; complex: boolean }) {
  const notes = ["♪", "♫", "♩", "♬"];
  return (
    <>
      {Array.from({ length: Math.min(max, complex ? 8 : 4) }).map((_, i) => (
        <motion.span
          key={`note-${i}`}
          className="absolute text-primary/50"
          style={{ left: `${10 + ((i * 23) % 80)}%`, bottom: "8%", fontSize: 14 + (i % 3) * 2 }}
          animate={{ y: [0, -120 - (i % 4) * 20], opacity: [0, 0.7, 0], rotate: [-10, 10] }}
          transition={{ duration: 6 + (i % 4), delay: i * 0.8, repeat: Infinity, ease: "easeOut" }}
          aria-hidden
        >
          {notes[i % notes.length]}
        </motion.span>
      ))}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-1 opacity-40" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.span
            key={i}
            className="w-1 rounded-full bg-violet-300"
            animate={{ height: [8, 18 + (i % 3) * 8, 10] }}
            transition={{ duration: 0.8 + (i % 3) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
            style={{ height: 10 }}
          />
        ))}
      </div>
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(167,139,250,0.14), transparent 55%)",
        }}
        animate={{ opacity: [0.4, 0.7, 0.45] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
    </>
  );
}

function WorldAtmosphere({
  worldId,
  max,
  complex,
  weather,
}: {
  worldId: WorldId;
  max: number;
  complex: boolean;
  weather: WeatherKind;
}) {
  switch (worldId) {
    case "animal_world":
      return <AnimalAtmosphere max={max} complex={complex} />;
    case "nature_world":
      return <NatureAtmosphere max={max} complex={complex} weather={weather} />;
    case "vehicle_world":
      return <VehicleAtmosphere max={max} complex={complex} />;
    case "home_sounds_world":
      return <HomeAtmosphere max={max} complex={complex} />;
    case "instrument_world":
      return <InstrumentAtmosphere max={max} complex={complex} />;
    default:
      return null;
  }
}

function SkyTint({ period, worldId }: { period: DayPeriod; worldId: WorldId }) {
  const palette = skyPalette(period, worldId);
  return (
    <motion.div
      key={period}
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      style={{
        background: `linear-gradient(180deg, ${palette.from}, ${palette.via} 42%, ${palette.to}), ${palette.overlay}`,
      }}
      aria-hidden
    />
  );
}

export const LivingEnvironmentLayer = memo(function LivingEnvironmentLayer({
  worldId,
  muted = false,
  className,
  adaptiveOverride,
}: LivingEnvironmentLayerProps) {
  const reduced = useReducedMotion();
  const { adaptive: ctxAdaptive } = useSoundWorldAttention();
  const adaptive = adaptiveOverride ?? ctxAdaptive;
  const caps = useMemo(() => livingEnvironmentCaps(reduced), [reduced]);
  const { period, weather, intensity } = useLivingClock(worldId);
  const ambience = ambienceKindForWorld(worldId);
  const animScale = attentionAnimationScale(adaptive);
  const spriteBudget = attentionMaxSprites(caps.maxSprites, adaptive);
  const allowAtmosphere =
    caps.allowAtmosphere && adaptive.visualComplexity !== "minimal" && animScale > 0.3;

  useEffect(() => {
    if (!caps.allowAmbientAudio) {
      worldAmbientAudio.stop();
      return;
    }
    void worldAmbientAudio.unlock().then(() => {
      void worldAmbientAudio.start(ambience, { muted });
    });
    return () => {
      worldAmbientAudio.stop();
    };
  }, [ambience, caps.allowAmbientAudio, worldId]);

  useEffect(() => {
    worldAmbientAudio.setMuted(muted || !caps.allowAmbientAudio);
  }, [muted, caps.allowAmbientAudio]);

  if (!caps.allowSky) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
      aria-hidden
      data-living-env={worldId}
      data-day-period={period}
      data-weather={weather}
    >
      <SkyTint period={period} worldId={worldId} />
      {allowAtmosphere && (
        <>
          <WeatherLayer
            weather={adaptive.visualComplexity === "reduced" ? "clear" : weather}
            intensity={intensity * animScale}
            complex={caps.allowComplexMotion && adaptive.visualComplexity === "full"}
          />
          <WorldAtmosphere
            worldId={worldId}
            max={spriteBudget}
            complex={caps.allowComplexMotion && adaptive.animationIntensity === "full"}
            weather={weather}
          />
        </>
      )}
    </div>
  );
});

export function LivingEnvironmentProvider({
  worldId,
  muted,
  children,
  className,
}: {
  worldId: WorldId;
  muted?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <LivingEnvironmentLayer worldId={worldId} muted={muted} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
