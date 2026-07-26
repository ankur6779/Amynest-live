/**
 * Amy Astro cosmic portrait — tile hero art in a soft orbit frame.
 * Child is represented by orbiting sun/moon signs around Amy.
 */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
import { useLivingSky } from "../state/living-sky-context";
import { AMY_ASTRO_TILE_PORTRAIT_SRC } from "../lib/branding";
import "../design/amy-astro.css";

export type AmyLookTarget = "left" | "right" | "center" | "up";

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
  playEntranceWave: _playEntranceWave = true,
  onOrbTap,
}: Props) {
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );
  const sunGlyph = sunSign ? ZODIAC_GLYPH[sunSign] ?? "☉" : "☉";
  const moonGlyph = moonSign ? ZODIAC_GLYPH[moonSign] ?? "☽" : "☽";
  const livingSky = useLivingSky();
  const [tapPulse, setTapPulse] = useState(false);

  useEffect(() => {
    livingSky?.setAmyGazeUp(lookTarget === "up");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gaze only
  }, [lookTarget]);

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
      data-look={lookTarget}
      role="img"
      aria-label={`Amy guiding ${childName}'s cosmic portrait`}
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

      {/* Soft violet bloom so the tile Amy art merges into the cosmic stage */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_42%,hsl(275_70%_48%/0.55)_0%,hsl(248_55%_28%/0.35)_42%,transparent_72%)] blur-[2px]"
      />

      <div
        className={cn(
          "absolute inset-[8%] h-[84%] w-[84%] overflow-visible rounded-full",
          (orbPulse || smileBoost || tapPulse) &&
            !reducedMotion &&
            "amy-astro-orb-react",
        )}
        onClick={(e) => {
          if (onOrbTap) {
            e.stopPropagation();
            onOrbTap();
          }
          if (!reducedMotion) {
            setTapPulse(true);
            window.setTimeout(() => setTapPulse(false), 700);
          }
        }}
        role={onOrbTap ? "presentation" : undefined}
      >
        <img
          src={AMY_ASTRO_TILE_PORTRAIT_SRC}
          alt=""
          width={280}
          height={280}
          draggable={false}
          className={cn(
            "amy-astro-tile-portrait h-full w-full object-contain object-bottom",
            "drop-shadow-[0_0_36px_hsl(275_65%_48%/0.45)]",
            !reducedMotion && "amy-astro-pulse-glow",
          )}
          decoding="async"
        />
      </div>
    </div>
  );
}
