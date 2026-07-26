/**
 * Brand Amy avatar — Girl/Boy in glowing orbit frame.
 * Used as identity mark alongside the constellation emblem.
 */

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  resolveAmyPortraitVariant,
  type AmyPortraitVariant,
} from "../lib/portrait-variant";
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
  const uid = useId().replace(/:/g, "");
  const variant = useMemo(
    () => variantProp ?? resolveAmyPortraitVariant(childName),
    [variantProp, childName],
  );
  const isGirl = variant === "girl";

  return (
    <div
      className={cn(
        "amy-astro-brand-avatar relative inline-flex items-center justify-center",
        !reducedMotion && "amy-astro-icon-alive",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={isGirl ? "Amy Girl" : "Amy Boy"}
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
      <svg width={size} height={size} viewBox="0 0 80 80" className="relative z-[1]">
        <defs>
          <radialGradient id={`${uid}-sky`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#5a2a88" />
            <stop offset="70%" stopColor="#1a1040" />
            <stop offset="100%" stopColor="#080418" />
          </radialGradient>
          <linearGradient id={`${uid}-skin`} x1="30%" y1="20%" x2="80%" y2="90%">
            <stop offset="0%" stopColor={isGirl ? "#f0c8a8" : "#e0b090"} />
            <stop offset="100%" stopColor={isGirl ? "#c09068" : "#a87850"} />
          </linearGradient>
          <linearGradient id={`${uid}-hair`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a0e28" />
            <stop offset="100%" stopColor={isGirl ? "#4a2858" : "#2a2038"} />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff1c4" />
            <stop offset="100%" stopColor="#c9a24a" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="38" fill={`url(#${uid}-sky)`} stroke={`url(#${uid}-gold)`} strokeWidth="2" />
        {/* Tiny stars */}
        <circle cx="18" cy="20" r="1" fill="#ffe08a" opacity="0.8" />
        <circle cx="62" cy="24" r="0.9" fill="#fff" opacity="0.7" />
        <circle cx="58" cy="58" r="1.1" fill="#ffe08a" opacity="0.6" />
        {/* Amy face */}
        <ellipse cx="40" cy="48" rx="18" ry="12" fill="#5a2a88" />
        <ellipse cx="40" cy="36" rx="14" ry="16" fill={`url(#${uid}-skin)`} />
        {isGirl ? (
          <>
            <ellipse cx="40" cy="28" rx="15" ry="12" fill={`url(#${uid}-hair)`} />
            <path d="M26 36c-2 8-1 16 2 20 1-6 3-10 5-14-1-2-2-4-2-6z" fill={`url(#${uid}-hair)`} />
            <path d="M54 36c2 8 1 16-2 20-1-6-3-10-5-14 1-2 2-4 2-6z" fill={`url(#${uid}-hair)`} />
            <path d="M28 30c6-4 12-5 12-5s6 1 12 5" fill="none" stroke="#6b3fa0" strokeWidth="3" strokeLinecap="round" />
            <circle cx="54" cy="28" r="2.5" fill="#f0d78a" />
          </>
        ) : (
          <ellipse cx="40" cy="28" rx="14" ry="10" fill={`url(#${uid}-hair)`} />
        )}
        <ellipse cx="34" cy="36" rx="2" ry="2.4" fill="#1a1230" />
        <ellipse cx="46" cy="36" rx="2" ry="2.4" fill="#1a1230" />
        <circle cx="34.5" cy="35.2" r="0.7" fill="#fff" />
        <circle cx="46.5" cy="35.2" r="0.7" fill="#fff" />
        <path d="M35 42c2.5 3 7.5 3 10 0" fill="none" stroke="#a06858" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
