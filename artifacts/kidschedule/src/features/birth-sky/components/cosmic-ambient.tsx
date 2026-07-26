/**
 * Living Sky ambient — reactive universe character.
 * Theme from chart/birth labels; weather events are presentation-only.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useLivingSky } from "../state/living-sky-context";
import {
  resolveLivingSkyTheme,
  type LivingSkyInput,
} from "../lib/living-sky-theme";
import "../design/amy-astro.css";

type WeatherKind = "meteor" | "comet" | "stardust" | "moon_shimmer" | "rainbow";

type Props = {
  className?: string;
  reducedMotion?: boolean;
  showMeteor?: boolean;
  living?: boolean;
  intensity?: "shell" | "full" | "static";
  /** Optional local theme when outside LivingSkyProvider */
  skyInput?: LivingSkyInput;
};

const CONSTELLATION_SETS: Array<Array<[number, number]>> = [
  [
    [12, 18],
    [22, 14],
    [30, 22],
    [38, 16],
  ],
  [
    [55, 12],
    [68, 20],
    [78, 14],
    [88, 24],
  ],
  [
    [15, 55],
    [25, 62],
    [35, 52],
    [42, 68],
  ],
  [
    [60, 48],
    [70, 58],
    [82, 50],
    [90, 62],
  ],
];

export function AmyAstroCosmicAmbient({
  className,
  reducedMotion = false,
  showMeteor = true,
  living = true,
  intensity = "shell",
  skyInput,
}: Props) {
  const livingCtx = useLivingSky();
  const theme = useMemo(
    () => livingCtx?.theme ?? resolveLivingSkyTheme(skyInput ?? {}),
    [livingCtx?.theme, skyInput],
  );
  const amyGazeUp = livingCtx?.amyGazeUp ?? false;
  const orbGlow = livingCtx?.orbGlow ?? false;

  const mode = reducedMotion || !living ? "static" : intensity;
  const rich = mode === "full";
  const calm = mode === "shell";
  const [weather, setWeather] = useState<{ kind: WeatherKind; key: number } | null>(
    null,
  );
  const [pulseStar, setPulseStar] = useState(0);

  // Cosmic weather — sparse ambient events
  useEffect(() => {
    if (reducedMotion || mode === "static" || !showMeteor) return;
    const kinds: WeatherKind[] = [
      "meteor",
      "comet",
      "stardust",
      "moon_shimmer",
      "meteor",
      "rainbow",
    ];
    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      const delay = 9000 + Math.random() * 14000;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
        setWeather({ kind, key: Date.now() });
        window.setTimeout(() => {
          if (!cancelled) setWeather(null);
        }, kind === "stardust" ? 2800 : 1600);
        schedule();
      }, delay);
    };
    const first = window.setTimeout(() => {
      setWeather({ kind: "meteor", key: Date.now() });
      schedule();
    }, 2800 + theme.dayVariant * 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(first);
    };
  }, [reducedMotion, mode, showMeteor, theme.dayVariant]);

  // Occasional constellation pulse
  useEffect(() => {
    if (reducedMotion || mode === "static") return;
    const id = window.setInterval(() => {
      setPulseStar((n) => (n + 1) % 12);
    }, 5200 + theme.dayVariant * 2000);
    return () => window.clearInterval(id);
  }, [reducedMotion, mode, theme.dayVariant]);

  const lines = CONSTELLATION_SETS[theme.constellationSeed % CONSTELLATION_SETS.length]!;

  const style = {
    ...theme.cssVars,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "amy-astro-ambient amy-living-sky-root",
        theme.className,
        (rich || calm) && !reducedMotion && "amy-astro-camera-drift",
        amyGazeUp && "amy-living-sky--gaze-up",
        orbGlow && "amy-living-sky--orb-glow",
        className,
      )}
      style={style}
      aria-hidden
      data-intensity={mode}
      data-sky-mood={theme.mood}
      data-testid="amy-living-sky"
    >
      {/* Breathing light veil */}
      <div
        className={cn(
          "amy-living-sky-breathe pointer-events-none absolute inset-0",
          !reducedMotion && mode !== "static" && "amy-living-sky-breathe-live",
        )}
      />

      <div
        className={cn(
          "amy-astro-nebula amy-living-sky-nebula",
          !reducedMotion && (rich || calm) && "amy-astro-nebula-living",
        )}
      />

      {(rich || calm) && !reducedMotion ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-[-30%] opacity-30 amy-astro-galaxy-drift",
          )}
          style={{
            background:
              "conic-gradient(from 20deg, transparent, var(--sky-nebula-a), transparent 40%, var(--sky-nebula-c), transparent 70%)",
          }}
        />
      ) : null}

      <div className="amy-astro-starfield amy-astro-starfield-a amy-living-sky-stars" />
      {(rich || calm) && !reducedMotion ? (
        <div className="amy-astro-starfield amy-astro-starfield-b amy-living-sky-stars-b opacity-60" />
      ) : null}

      {/* Soft constellation lines */}
      {(rich || calm) && !reducedMotion ? (
        <svg
          className="amy-living-sky-constellation pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={lines.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="var(--sky-star)"
            strokeWidth="0.15"
            opacity="0.35"
            className="amy-living-sky-constellation-draw"
          />
          {lines.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={pulseStar % lines.length === i ? 0.55 : 0.28}
              fill="var(--sky-star)"
              opacity={pulseStar % lines.length === i ? 0.95 : 0.55}
              className={
                pulseStar % lines.length === i
                  ? "amy-living-sky-star-pulse"
                  : undefined
              }
            />
          ))}
        </svg>
      ) : null}

      {(rich || calm) ? (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-[42%] h-[min(72vw,420px)] w-[min(72vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(42_50%_70%/0.08)]",
            !reducedMotion && "amy-astro-orbit",
          )}
          style={{
            boxShadow:
              "0 0 40px var(--sky-nebula-a), inset 0 0 60px var(--sky-nebula-b)",
          }}
        >
          <span className="absolute left-[8%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--sky-particle)] shadow-[0_0_10px_var(--sky-particle)]" />
          <span className="absolute right-[12%] top-[22%] h-1 w-1 rounded-full bg-[var(--sky-star)] shadow-[0_0_8px_var(--sky-star)]" />
          <span className="absolute bottom-[18%] left-[30%] h-1 w-1 rounded-full opacity-80 shadow-[0_0_8px_var(--sky-particle)]" style={{ background: "var(--sky-particle)" }} />
        </div>
      ) : null}

      <div
        className={cn(
          "amy-astro-aurora amy-living-sky-aurora",
          mode === "static" && "opacity-40",
        )}
      />

      {(rich || calm) && !reducedMotion ? (
        <div className="amy-astro-particle-field amy-living-sky-dust" />
      ) : null}

      {/* Weather events */}
      {weather && mode !== "static" ? (
        <div
          key={weather.key}
          className={cn(
            "pointer-events-none absolute inset-0",
            weather.kind === "meteor" && "amy-living-weather-meteor",
            weather.kind === "comet" && "amy-living-weather-comet",
            weather.kind === "stardust" && "amy-living-weather-stardust",
            weather.kind === "moon_shimmer" && "amy-living-weather-moon",
            weather.kind === "rainbow" && "amy-living-weather-rainbow",
          )}
        />
      ) : null}
    </div>
  );
}
