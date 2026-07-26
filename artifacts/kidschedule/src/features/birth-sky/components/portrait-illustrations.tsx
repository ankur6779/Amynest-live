/**
 * Custom Amy-universe micro illustrations for Cosmic Portrait.
 * Pure SVG — soft glow + optional micro-motion via CSS class.
 */

import { cn } from "@/lib/utils";

export type PortraitIllustrationKind =
  | "moon_hug"
  | "telescope"
  | "constellation_brush"
  | "comet"
  | "sunrise"
  | "lantern"
  | "sleeping_moon"
  | "bridge"
  | "heart_star"
  | "leaf_star";

type Props = {
  kind: PortraitIllustrationKind;
  className?: string;
  reducedMotion?: boolean;
};

export function PortraitIllustration({
  kind,
  className,
  reducedMotion = false,
}: Props) {
  return (
    <span
      className={cn(
        "amy-astro-illust relative inline-flex h-12 w-12 shrink-0 items-center justify-center",
        !reducedMotion && "amy-astro-illust-alive",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_0_10px_hsl(42_80%_60%/0.35)]">
        {kind === "moon_hug" && (
          <>
            <circle cx="28" cy="32" r="16" fill="#c8d8f0" opacity="0.95" />
            <circle cx="34" cy="28" r="12" fill="#1a1440" />
            <circle cx="42" cy="36" r="7" fill="#ffe08a" />
            <circle cx="42" cy="36" r="3" fill="#fff6c8" opacity="0.8" />
          </>
        )}
        {kind === "telescope" && (
          <>
            <rect x="18" y="28" width="28" height="8" rx="3" fill="#8a6ab8" transform="rotate(-18 32 32)" />
            <circle cx="44" cy="22" r="5" fill="#ffe08a" />
            <path d="M22 40l-6 10h10z" fill="#5a3a88" />
            <circle cx="50" cy="16" r="1.5" fill="#fff" />
          </>
        )}
        {kind === "constellation_brush" && (
          <>
            <path d="M18 46c8-18 16-28 28-34" stroke="#f0d78a" strokeWidth="2" fill="none" />
            <circle cx="18" cy="46" r="2" fill="#f0d78a" />
            <circle cx="30" cy="30" r="2" fill="#f0d78a" />
            <circle cx="46" cy="12" r="2.5" fill="#ffe08a" />
            <path d="M44 14l8 4-6 2z" fill="#b890ff" />
          </>
        )}
        {kind === "comet" && (
          <>
            <path d="M12 40c14-6 28-16 40-28" stroke="#ffe08a" strokeWidth="2.5" fill="none" opacity="0.7" />
            <circle cx="50" cy="14" r="6" fill="#fff0b0" />
            <circle cx="50" cy="14" r="3" fill="#fff" opacity="0.9" />
          </>
        )}
        {kind === "sunrise" && (
          <>
            <path d="M10 40c8-14 20-20 22-20s14 6 22 20" fill="#f0b050" opacity="0.9" />
            <circle cx="32" cy="28" r="10" fill="#ffe08a" />
            <rect x="8" y="40" width="48" height="10" rx="2" fill="#3a2068" opacity="0.5" />
          </>
        )}
        {kind === "lantern" && (
          <>
            <rect x="24" y="22" width="16" height="22" rx="4" fill="#f0c060" />
            <rect x="27" y="26" width="10" height="12" rx="2" fill="#fff6c8" opacity="0.85" />
            <path d="M32 14v8" stroke="#c9a24a" strokeWidth="2" />
            <circle cx="32" cy="12" r="3" fill="#c9a24a" />
          </>
        )}
        {kind === "sleeping_moon" && (
          <>
            <path d="M38 18a16 16 0 1 0 0 28 12 12 0 0 1 0-28z" fill="#d0e0f8" />
            <path d="M26 34c3 3 8 3 11 0" stroke="#6a5080" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="48" cy="20" r="1.5" fill="#ffe08a" />
          </>
        )}
        {kind === "bridge" && (
          <>
            <path d="M8 42c12-16 36-16 48 0" stroke="#f0d78a" strokeWidth="2.5" fill="none" />
            <path d="M14 42v8M32 34v16M50 42v8" stroke="#a080d0" strokeWidth="1.5" />
            <circle cx="32" cy="28" r="4" fill="#ffe08a" />
          </>
        )}
        {kind === "heart_star" && (
          <>
            <path
              d="M32 48c-12-8-18-16-18-24a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 8-6 16-18 24z"
              fill="#f0a0c0"
            />
            <path
              d="M32 22l2 5 5.5.6-4.2 3.6 1.2 5.4L32 33.4l-4.5 3.2 1.2-5.4-4.2-3.6L32 22z"
              fill="#fff6c8"
            />
          </>
        )}
        {kind === "leaf_star" && (
          <>
            <path d="M32 48V28" stroke="#7aba80" strokeWidth="2" />
            <path d="M32 30c-12-2-16-12-14-20 10 2 16 10 14 20z" fill="#6db87a" />
            <path d="M32 30c12-2 16-12 14-20-10 2-16 10-14 20z" fill="#8fd49a" />
            <circle cx="46" cy="16" r="2" fill="#ffe08a" />
          </>
        )}
      </svg>
    </span>
  );
}

export function illustrationForQuality(title: string): PortraitIllustrationKind {
  if (/empathy|feeling|deep|soft/i.test(title)) return "moon_hug";
  if (/courage|brave|initiative/i.test(title)) return "comet";
  if (/bridge|between/i.test(title)) return "bridge";
  if (/curiosity|questions|noticing/i.test(title)) return "telescope";
  if (/steady|reliab|presence|hands-on/i.test(title)) return "sunrise";
  if (/social|sparkle|playful/i.test(title)) return "lantern";
  if (/imagin|tide/i.test(title)) return "sleeping_moon";
  if (/self-knowing/i.test(title)) return "heart_star";
  return "constellation_brush";
}

export function illustrationForReminder(headline: string): PortraitIllustrationKind {
  if (/repair|storm|near|weather|goodnight/i.test(headline)) return "heart_star";
  if (/effort|celebrate/i.test(headline)) return "sunrise";
  if (/noticing|labeling/i.test(headline)) return "leaf_star";
  if (/question|conversation|ideas/i.test(headline)) return "telescope";
  if (/practice|routine|hands/i.test(headline)) return "constellation_brush";
  if (/stage|enthusiasm|spotlight/i.test(headline)) return "lantern";
  return "moon_hug";
}
