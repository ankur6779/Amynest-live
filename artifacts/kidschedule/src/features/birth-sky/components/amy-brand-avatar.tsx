/**
 * Brand Amy avatar — tile Amy art in a glowing orbit frame.
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
import { AMY_ASTRO_TILE_PORTRAIT_SRC } from "../lib/branding";
import "../design/amy-astro.css";

type Props = {
  childName?: string;
  size?: number;
  reducedMotion?: boolean;
  variant?: AmyPortraitVariant;
  className?: string;
};

export function AmyBrandAvatar({
  childName = "Amy",
  size = 40,
  reducedMotion = false,
  variant: variantProp,
  className,
}: Props) {
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );

  return (
    <div
      className={cn(
        "amy-astro-brand-avatar relative inline-flex items-center justify-center",
        !reducedMotion && "amy-astro-icon-alive",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Amy Astro Intelligence"
      data-testid="amy-astro-brand-avatar"
      data-portrait-variant={variant}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-[-8%] rounded-full border border-[hsl(42_70%_65%/0.45)]",
          !reducedMotion && "amy-astro-orbit",
        )}
        aria-hidden
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,hsl(275_65%_48%/0.55),transparent_70%)]"
      />
      <img
        src={AMY_ASTRO_TILE_PORTRAIT_SRC}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="relative z-[1] h-full w-full rounded-full object-cover object-[center_30%] drop-shadow-[0_0_10px_hsl(275_70%_50%/0.45)]"
        decoding="async"
      />
    </div>
  );
}
