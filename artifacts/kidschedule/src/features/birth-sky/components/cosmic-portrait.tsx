/**
 * Amy as a living magical guide — breath, blink, hair, cloth, orb, look, wave.
 * Child is represented by the orbiting universe around her.
 */

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
import { useLivingSky } from "../state/living-sky-context";
import "../design/amy-astro.css";

export type AmyLookTarget = "left" | "right" | "center" | "up";

const IDLE_LOOKS: AmyLookTarget[] = ["up", "left", "right", "center", "up", "center"];

type Props = {
  childName: string;
  reducedMotion?: boolean;
  className?: string;
  variant?: AmyPortraitVariant;
  sunSign?: string | null;
  moonSign?: string | null;
  smileBoost?: boolean;
  lookTarget?: AmyLookTarget;
  orbPulse?: boolean;
  /** Play entrance wave once on mount */
  playEntranceWave?: boolean;
  onOrbTap?: () => void;
};

const ZODIAC_GLYPH: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export function AmyAstroCosmicPortrait({
  childName,
  reducedMotion = false,
  className,
  variant: variantProp,
  sunSign,
  moonSign,
  smileBoost = false,
  lookTarget = "center",
  orbPulse = false,
  playEntranceWave = true,
  onOrbTap,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );
  const isGirl = variant === "girl";
  const sunGlyph = sunSign ? ZODIAC_GLYPH[sunSign] ?? "☉" : "☉";
  const moonGlyph = moonSign ? ZODIAC_GLYPH[moonSign] ?? "☽" : "☽";
  const livingSky = useLivingSky();
  const [waving, setWaving] = useState(false);
  const [idleLook, setIdleLook] = useState<AmyLookTarget>("center");
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    if (reducedMotion || !playEntranceWave) return;
    const t0 = window.setTimeout(() => setWaving(true), 900);
    const t1 = window.setTimeout(() => setWaving(false), 2400);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [reducedMotion, playEntranceWave]);

  // Procedural idle gaze — never a rigid loop
  useEffect(() => {
    if (reducedMotion || lookTarget !== "center" || smileBoost) return;
    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      const delay = 2800 + Math.random() * 4200;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setIdleLook(IDLE_LOOKS[Math.floor(Math.random() * IDLE_LOOKS.length)]!);
        window.setTimeout(() => {
          if (!cancelled) setIdleLook("center");
        }, 900 + Math.random() * 800);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reducedMotion, lookTarget, smileBoost]);

  const activeLook = lookTarget !== "center" ? lookTarget : idleLook;
  const pupilDx =
    activeLook === "left" ? -2.2 : activeLook === "right" ? 2.2 : 0;
  const pupilDy = activeLook === "up" ? -2 : activeLook === "center" ? 0 : 0.4;

  // Amy ↔ Living Sky: looking up brightens stars; orb pulse lights constellations
  useEffect(() => {
    livingSky?.setAmyGazeUp(activeLook === "up");
    // livingSky setters are stable enough; avoid re-firing on every context tick
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gaze only
  }, [activeLook]);

  useEffect(() => {
    if (orbPulse || smileBoost) livingSky?.pulseOrb();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pulse on interaction edges
  }, [orbPulse, smileBoost]);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[280px]",
        !reducedMotion && "amy-astro-amy-breathe",
        className,
      )}
      data-testid="amy-astro-cosmic-portrait"
      data-portrait-variant={variant}
      data-look={activeLook}
      role="img"
      aria-label={`Amy guiding ${childName}'s cosmic portrait`}
      onClick={() => {
        if (reducedMotion) return;
        setTapCount((n) => {
          const next = n + 1;
          if (next >= 5) {
            setWaving(true);
            window.setTimeout(() => setWaving(false), 1600);
            return 0;
          }
          return next;
        });
      }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-[-2%] rounded-full border border-[hsl(42_70%_68%/0.35)]",
          !reducedMotion && "amy-astro-orbit",
        )}
        aria-hidden
      >
        <span className="absolute left-1/2 top-0 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(42_60%_60%/0.4)] bg-[hsl(275_40%_22%/0.85)] text-sm text-[hsl(42_80%_78%)] shadow-[0_0_16px_hsl(42_90%_55%/0.45)]">
          {sunGlyph}
        </span>
        <span className="absolute bottom-[8%] right-0 flex h-8 w-8 translate-x-1/4 items-center justify-center rounded-full border border-[hsl(275_50%_65%/0.35)] bg-[hsl(248_40%_20%/0.9)] text-sm text-[hsl(275_70%_82%)] shadow-[0_0_14px_hsl(275_80%_55%/0.4)]">
          {moonGlyph}
        </span>
        <span className="absolute left-0 top-[42%] h-2 w-2 -translate-x-1/2 rounded-full bg-[hsl(210_80%_72%)] shadow-[0_0_10px_hsl(210_90%_60%/0.7)]" />
        <span className="absolute right-[6%] top-[18%] h-1.5 w-1.5 rounded-full bg-[hsl(42_90%_70%)] shadow-[0_0_8px_hsl(42_90%_55%/0.8)]" />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-[hsl(42_55%_62%/0.22)]",
          !reducedMotion && "amy-astro-orbit-reverse",
        )}
        aria-hidden
      />

      <svg
        className="absolute inset-[8%] h-[84%] w-[84%] drop-shadow-[0_0_36px_hsl(275_65%_48%/0.4)]"
        viewBox="0 0 400 400"
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}-sky`} cx="50%" cy="36%" r="72%">
            <stop offset="0%" stopColor="#4a2680" />
            <stop offset="40%" stopColor="#1a1440" />
            <stop offset="100%" stopColor="#060510" />
          </radialGradient>
          <radialGradient id={`${uid}-neb`} cx="52%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.45" />
            <stop offset="28%" stopColor={isGirl ? "#f0a0ff" : "#9ec0ff"} stopOpacity="0.7" />
            <stop offset="70%" stopColor="#5a2fa0" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0a0618" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-orb`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff8d8" />
            <stop offset="35%" stopColor="#ffe08a" />
            <stop offset="75%" stopColor="#e8a840" />
            <stop offset="100%" stopColor="#c07020" />
          </radialGradient>
          <linearGradient id={`${uid}-skin`} x1="30%" y1="15%" x2="80%" y2="90%">
            <stop offset="0%" stopColor={isGirl ? "#f2c8a8" : "#e0b090"} />
            <stop offset="55%" stopColor={isGirl ? "#d4a078" : "#c49068"} />
            <stop offset="100%" stopColor={isGirl ? "#b07850" : "#9a6848"} />
          </linearGradient>
          <linearGradient id={`${uid}-hair`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#1a0e28" />
            <stop offset="100%" stopColor={isGirl ? "#4a2858" : "#2a2038"} />
          </linearGradient>
          <linearGradient id={`${uid}-hoodie`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#7b4ab8" />
            <stop offset="100%" stopColor="#3a2068" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="200" cy="200" r="198" fill={`url(#${uid}-sky)`} />
        <ellipse cx="200" cy="200" rx="155" ry="145" fill={`url(#${uid}-neb)`} />

        <g fill="#f7f0dc" opacity="0.75">
          {[
            [48, 64],
            [86, 120],
            [320, 58],
            [350, 150],
            [60, 290],
            [310, 310],
            [180, 36],
            [250, 270],
            [120, 210],
            [280, 100],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 0.9} />
          ))}
        </g>

        {/* Constellation draw lines */}
        <g
          className={!reducedMotion ? "amy-astro-constellation-draw" : undefined}
          stroke="#f0d78a"
          strokeWidth="0.9"
          fill="none"
          opacity="0.45"
        >
          <polyline points="70,150 110,120 150,145" />
          <polyline points="250,100 290,130 340,115" />
        </g>

        <g className={!reducedMotion ? "amy-astro-amy-hair" : undefined}>
          {/* Hoodie with cloth sway */}
          <g className={!reducedMotion ? "amy-astro-hoodie-sway" : undefined}>
            <path
              d="M118 318c18-52 48-78 82-78s64 26 82 78v52H118z"
              fill={`url(#${uid}-hoodie)`}
            />
            <path
              d="M140 300c20-18 40-26 60-26s40 8 60 26"
              fill="none"
              stroke="#c9a24a"
              strokeWidth="2"
              opacity="0.45"
            />
            <text
              x="200"
              y="348"
              textAnchor="middle"
              fill="#f5eef8"
              fontSize="18"
              fontWeight="700"
              letterSpacing="3"
              opacity="0.9"
              fontFamily="system-ui, sans-serif"
            >
              AMY
            </text>
          </g>

          <rect x="186" y="218" width="28" height="32" rx="10" fill={`url(#${uid}-skin)`} />
          <ellipse cx="200" cy="178" rx="54" ry="60" fill={`url(#${uid}-skin)`} />

          {isGirl ? (
            <g>
              <ellipse cx="200" cy="148" rx="60" ry="50" fill={`url(#${uid}-hair)`} />
              <path
                d="M142 175c-10 34-8 78 10 105 2-22 10-42 22-58-6-14-12-28-14-47z"
                fill={`url(#${uid}-hair)`}
              />
              <path
                d="M258 175c10 34 8 78-10 105-2-22-10-42-22-58 6-14 12-28 14-47z"
                fill={`url(#${uid}-hair)`}
              />
              <path
                d="M152 158c16-30 42-40 48-40s32 10 48 40c-20-10-34-12-48-12s-28 2-48 12z"
                fill={`url(#${uid}-hair)`}
              />
              <path
                d="M148 152c18-8 34-12 52-12s34 4 52 12"
                fill="none"
                stroke="#6b3fa0"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle cx="252" cy="148" r="9" fill="#f0d78a" filter={`url(#${uid}-glow)`} />
              <path
                d="M252 141l1.8 4.2 4.6.5-3.5 3.1.9 4.5-3.8-2.4-3.8 2.4.9-4.5-3.5-3.1 4.6-.5z"
                fill="#7a4ab0"
              />
            </g>
          ) : (
            <g>
              <ellipse cx="200" cy="152" rx="56" ry="44" fill={`url(#${uid}-hair)`} />
              <path
                d="M146 178c2-28 22-50 54-50s52 22 54 50c-14-16-32-24-54-24s-40 8-54 24z"
                fill={`url(#${uid}-hair)`}
              />
            </g>
          )}

          {/* Eyes with look tracking */}
          <g className={!reducedMotion ? "amy-astro-amy-blink" : undefined}>
            <ellipse cx="178" cy="178" rx="8" ry="9" fill="#1a1230" />
            <ellipse cx="222" cy="178" rx="8" ry="9" fill="#1a1230" />
            <g
              style={{
                transform: `translate(${pupilDx}px, ${pupilDy}px)`,
                transition: reducedMotion ? undefined : "transform 0.35s ease",
              }}
            >
              <circle cx="180" cy="175" r="2.4" fill="#fff8f0" />
              <circle cx="224" cy="175" r="2.4" fill="#fff8f0" />
            </g>
          </g>

          <path
            d={
              smileBoost
                ? "M178 204c10 16 34 16 44 0"
                : "M182 206c9 12 28 12 36 0"
            }
            fill="none"
            stroke="#a06858"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.85"
            className={smileBoost && !reducedMotion ? "amy-astro-smile-pop" : undefined}
          />
          <ellipse cx="164" cy="196" rx="9" ry="5" fill="#f0a090" opacity="0.32" />
          <ellipse cx="236" cy="196" rx="9" ry="5" fill="#f0a090" opacity="0.32" />
        </g>

        {/* Orb + hands */}
        <g
          className={cn(
            !reducedMotion && "amy-astro-pulse-glow",
            (orbPulse || smileBoost) && !reducedMotion && "amy-astro-orb-react",
            !reducedMotion && "amy-astro-hand-bob",
          )}
          filter={`url(#${uid}-glow)`}
          style={{ cursor: onOrbTap ? "pointer" : undefined }}
          onClick={(e) => {
            e.stopPropagation();
            onOrbTap?.();
          }}
          role={onOrbTap ? "presentation" : undefined}
        >
          <ellipse cx="200" cy="292" rx="36" ry="14" fill="#ffe08a" opacity="0.25" />
          <circle cx="200" cy="278" r="28" fill={`url(#${uid}-orb)`} />
          <circle cx="200" cy="278" r="18" fill="#fff6c8" opacity="0.35" />
          <path
            d="M200 262l3.2 8.2 8.8.8-6.8 5.8 2.2 8.6L200 280l-7.4 5.4 2.2-8.6-6.8-5.8 8.8-.8z"
            fill="#fffaf0"
            opacity="0.95"
          />
          <g className={waving && !reducedMotion ? "amy-astro-wave-hand" : undefined}>
            <ellipse
              cx="168"
              cy="286"
              rx="18"
              ry="10"
              fill={`url(#${uid}-skin)`}
              transform="rotate(-18 168 286)"
            />
          </g>
          <ellipse
            cx="232"
            cy="286"
            rx="18"
            ry="10"
            fill={`url(#${uid}-skin)`}
            transform="rotate(18 232 286)"
          />
        </g>
      </svg>
    </div>
  );
}
