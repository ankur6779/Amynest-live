/**
 * Unique premium SVG illustration per chapter — never reused across IDs.
 */

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChapterArtKind, ChapterMeta } from "../lib/chapter-meta";

type Props = {
  art: ChapterArtKind;
  accentFrom: string;
  accentTo: string;
  className?: string;
  /** compact for cards, hero for open chapter */
  size?: "card" | "hero";
  title?: string;
};

function Scene({
  children,
  accentFrom,
  accentTo,
  uid,
}: {
  children: ReactNode;
  accentFrom: string;
  accentTo: string;
  uid: string;
}) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${accentFrom})`} />
          <stop offset="55%" stopColor="hsl(230 45% 10%)" />
          <stop offset="100%" stopColor={`hsl(${accentTo})`} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="hsl(42 90% 70% / 0.35)" />
          <stop offset="100%" stopColor="hsl(42 90% 70% / 0)" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(42 95% 82%)" />
          <stop offset="100%" stopColor="hsl(38 70% 52%)" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" rx="22" fill={`url(#${uid}-sky)`} />
      <ellipse cx="160" cy="70" rx="90" ry="55" fill={`url(#${uid}-glow)`} />
      {/* starfield */}
      {[
        [28, 24],
        [52, 48],
        [78, 18],
        [110, 36],
        [248, 22],
        [274, 44],
        [296, 28],
        [220, 58],
        [40, 150],
        [290, 150],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 1.4 : 0.9}
          fill="hsl(42 80% 88%)"
          opacity={0.45 + (i % 4) * 0.12}
        />
      ))}
      {children}
    </svg>
  );
}

function ArtBody({
  art,
  uid,
}: {
  art: ChapterArtKind;
  uid: string;
}) {
  const gold = `url(#${uid}-gold)`;
  switch (art) {
    case "heart":
      return (
        <g>
          <path
            d="M160 128c-28-22-48-40-48-62 0-18 14-30 30-30 10 0 16 5 18 10 2-5 8-10 18-10 16 0 30 12 30 30 0 22-20 40-48 62z"
            fill="none"
            stroke={gold}
            strokeWidth="2.2"
          />
          <polyline
            points="118,72 132,58 148,70 160,52 176,66 194,56"
            fill="none"
            stroke={gold}
            strokeWidth="1.1"
            opacity="0.75"
          />
          {[118, 132, 148, 160, 176, 194].map((x, i) => (
            <circle key={i} cx={x} cy={[72, 58, 70, 52, 66, 56][i]} r="2" fill={gold} />
          ))}
        </g>
      );
    case "curiosity":
      return (
        <g>
          <ellipse cx="168" cy="78" rx="38" ry="38" fill="none" stroke={gold} strokeWidth="2" />
          <line x1="196" y1="106" x2="236" y2="148" stroke={gold} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="168" cy="78" r="18" fill="hsl(210 60% 40% / 0.35)" stroke={gold} strokeWidth="1" />
          <circle cx="248" cy="40" r="3" fill={gold} />
          <circle cx="90" cy="50" r="2" fill="hsl(210 70% 75%)" />
          <path d="M70 130 Q160 90 250 130" fill="none" stroke={gold} strokeWidth="1" opacity="0.4" />
        </g>
      );
    case "mind":
      return (
        <g>
          <path
            d="M120 120c0-30 18-50 40-50s40 20 40 50c12 4 18 14 18 26H102c0-12 6-22 18-26z"
            fill="hsl(230 40% 22% / 0.55)"
            stroke={gold}
            strokeWidth="1.6"
          />
          <path d="M140 78c8-14 22-20 36-12" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.7" />
          <circle cx="148" cy="96" r="2.2" fill={gold} />
          <circle cx="168" cy="88" r="2.2" fill={gold} />
          <circle cx="186" cy="98" r="2.2" fill={gold} />
          <polyline points="148,96 168,88 186,98" fill="none" stroke={gold} strokeWidth="0.9" opacity="0.65" />
        </g>
      );
    case "voice":
      return (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M${110 + i * 8} 90 Q160 ${50 - i * 8} ${210 - i * 8} 90`}
              fill="none"
              stroke={gold}
              strokeWidth={1.4 - i * 0.15}
              opacity={0.9 - i * 0.15}
            />
          ))}
          <circle cx="160" cy="118" r="10" fill={gold} opacity="0.85" />
        </g>
      );
    case "paint":
      return (
        <g>
          <path
            d="M96 130c20-40 40-70 64-70 18 0 28 22 36 48 8-18 22-36 40-36 16 0 28 28 36 58"
            fill="none"
            stroke={gold}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="120" cy="70" r="8" fill="hsl(300 60% 62% / 0.7)" />
          <circle cx="180" cy="54" r="6" fill="hsl(42 80% 60% / 0.8)" />
          <circle cx="230" cy="78" r="7" fill="hsl(210 70% 65% / 0.7)" />
          <rect x="148" y="118" width="8" height="36" rx="2" fill={gold} opacity="0.8" />
        </g>
      );
    case "north_star":
      return (
        <g>
          <path
            d="M160 36 L168 78 L210 86 L168 94 L160 136 L152 94 L110 86 L152 78 Z"
            fill={gold}
            opacity="0.92"
          />
          <circle cx="160" cy="86" r="4" fill="hsl(42 100% 92%)" />
          <path d="M70 140 H250" stroke={gold} strokeWidth="1" opacity="0.35" />
        </g>
      );
    case "bonds":
      return (
        <g>
          {[
            [90, 70],
            [160, 50],
            [230, 70],
            [120, 120],
            [200, 120],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="none" stroke={gold} strokeWidth="1.6" />
          ))}
          <path
            d="M90 70 L160 50 L230 70 L200 120 L120 120 Z"
            fill="none"
            stroke={gold}
            strokeWidth="1.2"
            opacity="0.75"
          />
        </g>
      );
    case "weather":
      return (
        <g>
          <path
            d="M90 88c10-28 40-40 70-28 8-18 30-28 50-18 22 10 30 34 24 54H96c-8-4-12-14-6-28z"
            fill="hsl(220 40% 28% / 0.55)"
            stroke={gold}
            strokeWidth="1.4"
          />
          <path d="M130 128c0 10 8 18 18 18s18-8 18-18" fill="none" stroke={gold} strokeWidth="1.5" />
          <circle cx="240" cy="48" r="10" fill={gold} opacity="0.55" />
        </g>
      );
    case "confidence":
      return (
        <g>
          <path
            d="M60 140 L120 90 L160 110 L220 50 L260 140 Z"
            fill="hsl(15 40% 22% / 0.45)"
            stroke={gold}
            strokeWidth="1.6"
          />
          <circle cx="220" cy="42" r="5" fill={gold} />
          <polyline points="220,42 220,50" stroke={gold} strokeWidth="1.2" />
        </g>
      );
    case "love":
      return (
        <g>
          <circle cx="130" cy="88" r="28" fill="none" stroke={gold} strokeWidth="1.5" opacity="0.7" />
          <circle cx="190" cy="88" r="28" fill="none" stroke={gold} strokeWidth="1.5" opacity="0.7" />
          <path
            d="M160 108c-12-10-20-18-20-28 0-8 6-14 14-14 4 0 6 2 6 5 0-3 2-5 6-5 8 0 14 6 14 14 0 10-8 18-20 28z"
            fill={gold}
            opacity="0.85"
          />
        </g>
      );
    case "lights":
      return (
        <g>
          {[100, 140, 180, 220].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="128" x2={x} y2="70" stroke={gold} strokeWidth="1.2" opacity="0.5" />
              <circle cx={x} cy="62" r={5 + i} fill={gold} opacity={0.55 + i * 0.1} />
            </g>
          ))}
          <path d="M80 140 H240" stroke={gold} strokeWidth="1" opacity="0.3" />
        </g>
      );
    case "gifts":
      return (
        <g>
          <rect x="120" y="78" width="80" height="54" rx="8" fill="hsl(260 40% 24% / 0.55)" stroke={gold} strokeWidth="1.6" />
          <path d="M120 98 H200" stroke={gold} strokeWidth="1.2" />
          <path d="M160 78 V132" stroke={gold} strokeWidth="1.2" />
          <circle cx="160" cy="58" r="8" fill={gold} opacity="0.8" />
        </g>
      );
    case "meaning":
      return (
        <g>
          <circle cx="160" cy="90" r="42" fill="none" stroke={gold} strokeWidth="1.4" />
          <circle cx="160" cy="90" r="22" fill="none" stroke={gold} strokeWidth="1" opacity="0.55" />
          <path d="M160 48 V132 M118 90 H202" stroke={gold} strokeWidth="1" opacity="0.45" />
          <circle cx="160" cy="90" r="4" fill={gold} />
        </g>
      );
    case "career":
      return (
        <g>
          <rect x="100" y="70" width="120" height="70" rx="6" fill="hsl(200 35% 20% / 0.5)" stroke={gold} strokeWidth="1.4" />
          <path d="M100 92 H220" stroke={gold} strokeWidth="1" opacity="0.5" />
          {[118, 148, 178, 208].map((x) => (
            <rect key={x} x={x} y="104" width="14" height="22" rx="2" fill={gold} opacity="0.35" />
          ))}
          <circle cx="250" cy="48" r="6" fill={gold} />
        </g>
      );
    case "care":
      return (
        <g>
          <path
            d="M160 50c-24 20-44 40-44 62 0 18 16 30 44 30s44-12 44-30c0-22-20-42-44-62z"
            fill="hsl(160 35% 24% / 0.45)"
            stroke={gold}
            strokeWidth="1.6"
          />
          <path d="M140 96c8 10 20 16 20 16s12-6 20-16" fill="none" stroke={gold} strokeWidth="1.4" />
        </g>
      );
    case "wonder":
      return (
        <g>
          <circle cx="160" cy="86" r="36" fill="hsl(265 50% 28% / 0.45)" stroke={gold} strokeWidth="1.5" />
          <ellipse cx="160" cy="86" rx="50" ry="14" fill="none" stroke={gold} strokeWidth="1" opacity="0.5" transform="rotate(-18 160 86)" />
          <circle cx="188" cy="70" r="3" fill={gold} />
        </g>
      );
    case "growth":
      return (
        <g>
          <path d="M160 140 V70" stroke={gold} strokeWidth="2" />
          <path d="M160 100 C130 90 120 70 128 52" fill="none" stroke={gold} strokeWidth="1.6" />
          <path d="M160 88 C190 78 204 60 198 44" fill="none" stroke={gold} strokeWidth="1.6" />
          <circle cx="128" cy="48" r="5" fill={gold} opacity="0.8" />
          <circle cx="198" cy="40" r="5" fill={gold} opacity="0.8" />
        </g>
      );
    case "tokens":
      return (
        <g>
          <circle cx="130" cy="90" r="24" fill="none" stroke={gold} strokeWidth="1.8" />
          <circle cx="190" cy="90" r="24" fill="none" stroke={gold} strokeWidth="1.8" />
          <path d="M130 78 L130 102 M118 90 H142" stroke={gold} strokeWidth="1.3" />
          <path d="M190 74 L204 102 L176 102 Z" fill={gold} opacity="0.55" />
        </g>
      );
    case "planet_strong":
      return (
        <g>
          <circle cx="160" cy="90" r="34" fill={gold} opacity="0.25" stroke={gold} strokeWidth="2" />
          <circle cx="160" cy="90" r="16" fill={gold} opacity="0.85" />
          <circle cx="220" cy="58" r="8" fill="hsl(275 60% 65% / 0.8)" />
          <circle cx="100" cy="120" r="6" fill="hsl(210 60% 70% / 0.8)" />
        </g>
      );
    case "planet_soft":
      return (
        <g>
          <circle cx="160" cy="90" r="36" fill="hsl(275 40% 28% / 0.45)" stroke={gold} strokeWidth="1.4" opacity="0.7" />
          <path d="M130 90c10-20 50-20 60 0" fill="none" stroke={gold} strokeWidth="1.5" />
          <circle cx="148" cy="82" r="2.5" fill={gold} />
          <circle cx="172" cy="82" r="2.5" fill={gold} />
        </g>
      );
    case "rooms":
      return (
        <g>
          <rect x="88" y="60" width="50" height="70" rx="4" fill="none" stroke={gold} strokeWidth="1.4" />
          <rect x="148" y="48" width="50" height="82" rx="4" fill="none" stroke={gold} strokeWidth="1.4" />
          <rect x="208" y="72" width="40" height="58" rx="4" fill="none" stroke={gold} strokeWidth="1.4" />
          <circle cx="173" cy="70" r="4" fill={gold} />
        </g>
      );
    case "mansion":
      return (
        <g>
          <path
            d="M90 120 L160 50 L230 120 Z"
            fill="hsl(230 40% 22% / 0.5)"
            stroke={gold}
            strokeWidth="1.6"
          />
          <circle cx="160" cy="88" r="14" fill="none" stroke={gold} strokeWidth="1.3" />
          <circle cx="240" cy="48" r="12" fill={gold} opacity="0.45" />
        </g>
      );
    case "converse":
      return (
        <g>
          <circle cx="120" cy="90" r="28" fill="hsl(285 45% 30% / 0.45)" stroke={gold} strokeWidth="1.5" />
          <circle cx="200" cy="90" r="28" fill="hsl(42 45% 28% / 0.45)" stroke={gold} strokeWidth="1.5" />
          <path d="M148 90 H172" stroke={gold} strokeWidth="2" />
          <path d="M160 78 V102" stroke={gold} strokeWidth="1.2" opacity="0.5" />
        </g>
      );
    case "patterns":
      return (
        <g>
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={100 + col * 40}
                cy={60 + row * 32}
                r="5"
                fill="none"
                stroke={gold}
                strokeWidth="1.2"
                opacity={0.5 + ((row + col) % 3) * 0.15}
              />
            )),
          )}
          <path d="M100 60 L220 124" stroke={gold} strokeWidth="1" opacity="0.45" />
        </g>
      );
    case "family":
      return (
        <g>
          <circle cx="160" cy="90" r="48" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.45" />
          <circle cx="160" cy="90" r="28" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.55" />
          {[
            [160, 42],
            [208, 90],
            [160, 138],
            [112, 90],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="7" fill={gold} opacity={0.7 + i * 0.05} />
          ))}
        </g>
      );
    case "lantern":
      return (
        <g>
          <ellipse cx="160" cy="130" rx="70" ry="16" fill="hsl(220 40% 18% / 0.55)" stroke={gold} strokeWidth="1" opacity="0.5" />
          <rect x="148" y="58" width="24" height="52" rx="8" fill={gold} opacity="0.75" />
          <path d="M148 66 H172" stroke="hsl(42 100% 92%)" strokeWidth="1.2" opacity="0.6" />
          <circle cx="160" cy="48" r="6" fill={gold} />
          <path d="M160 42 V28" stroke={gold} strokeWidth="1.4" />
        </g>
      );
    case "longer":
      return (
        <g>
          <path
            d="M60 120 C100 60 140 140 180 70 C210 30 250 90 270 60"
            fill="none"
            stroke={gold}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {[60, 120, 180, 230, 270].map((x, i) => (
            <circle key={i} cx={x} cy={[120, 90, 70, 55, 60][i]} r="3.5" fill={gold} />
          ))}
        </g>
      );
    default:
      return (
        <g>
          <circle cx="160" cy="90" r="36" fill="none" stroke={gold} strokeWidth="1.6" />
          <circle cx="160" cy="90" r="8" fill={gold} />
        </g>
      );
  }
}

export function AmyAstroChapterIllustration({
  art,
  accentFrom,
  accentTo,
  className,
  size = "card",
  title,
}: Props) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[hsl(42_50%_60%/0.22)]",
        size === "hero" ? "aspect-[16/9] w-full" : "aspect-[16/9] w-full max-h-[7.5rem]",
        className,
      )}
      role="img"
      aria-label={title ? `Illustration for ${title}` : "Chapter illustration"}
      data-testid="amy-astro-chapter-illustration"
      data-art={art}
    >
      <Scene accentFrom={accentFrom} accentTo={accentTo} uid={uid}>
        <ArtBody art={art} uid={uid} />
      </Scene>
    </div>
  );
}

export function AmyAstroChapterIllustrationFromMeta({
  meta,
  ...rest
}: { meta: ChapterMeta } & Omit<Props, "art" | "accentFrom" | "accentTo">) {
  return (
    <AmyAstroChapterIllustration
      art={meta.art}
      accentFrom={meta.accentFrom}
      accentTo={meta.accentTo}
      {...rest}
    />
  );
}
