/**
 * Amy Astro premium icon language — handcrafted SVG only.
 * No Lucide / Heroicons / Material / emoji.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";
import "../../design/amy-astro.css";

export type AmyAstroIconName =
  | "back"
  | "settings"
  | "day_sun"
  | "time_moon_clock"
  | "place_compass"
  | "chapter_book"
  | "ask_amy"
  | "update_telescope"
  | "save_heart"
  | "continue_moon"
  | "heart_nest"
  | "lantern"
  | "bridge"
  | "tree"
  | "paper_plane"
  | "shooting_star";

type IconProps = {
  name: AmyAstroIconName;
  size?: number;
  className?: string;
  reducedMotion?: boolean;
  /** Complete vs incomplete for status badges */
  complete?: boolean;
  title?: string;
};

export function AmyAstroIcon({
  name,
  size = 28,
  className,
  reducedMotion = false,
  complete = true,
  title,
}: IconProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <span
      className={cn(
        "amy-astro-icon relative inline-flex shrink-0 items-center justify-center",
        !reducedMotion && "amy-astro-icon-alive",
        complete ? "amy-astro-icon-lit" : "amy-astro-icon-dim",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`${uid}-g`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#fff6d0" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#f0c060" />
            <stop offset="70%" stopColor="#8a4ab8" />
            <stop offset="100%" stopColor="#1a1040" />
          </radialGradient>
          <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff1c4" />
            <stop offset="50%" stopColor="#e8b44a" />
            <stop offset="100%" stopColor="#c9a24a" />
          </linearGradient>
          <radialGradient id={`${uid}-glass`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#c8b0ff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#4a2880" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#120828" stopOpacity="0.95" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shared glass disc */}
        <circle
          cx="32"
          cy="32"
          r="30"
          fill={`url(#${uid}-glass)`}
          stroke={`url(#${uid}-gold)`}
          strokeWidth="1.4"
          opacity={complete ? 1 : 0.55}
          filter={`url(#${uid}-glow)`}
        />
        <circle cx="22" cy="20" r="8" fill="#fff" opacity="0.08" />

        {name === "back" && (
          <g fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2.6" strokeLinecap="round">
            <path d="M36 18L22 32l14 14" />
            <path d="M24 32h20" opacity="0.7" />
          </g>
        )}

        {name === "settings" && (
          <g filter={`url(#${uid}-glow)`}>
            <circle cx="32" cy="32" r="7" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2.2" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <circle
                key={deg}
                cx={32 + Math.cos((deg * Math.PI) / 180) * 14}
                cy={32 + Math.sin((deg * Math.PI) / 180) * 14}
                r="2.4"
                fill={`url(#${uid}-gold)`}
              />
            ))}
            <circle cx="32" cy="32" r="2.5" fill="#fff6d0" />
          </g>
        )}

        {name === "day_sun" && (
          <g filter={`url(#${uid}-glow)`}>
            <circle cx="32" cy="32" r="10" fill={`url(#${uid}-g)`} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={32 + Math.cos(a) * 14}
                  y1={32 + Math.sin(a) * 14}
                  x2={32 + Math.cos(a) * 20}
                  y2={32 + Math.sin(a) * 20}
                  stroke={`url(#${uid}-gold)`}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx="28" cy="28" r="3" fill="#fff" opacity="0.35" />
          </g>
        )}

        {name === "time_moon_clock" && (
          <g filter={`url(#${uid}-glow)`}>
            <path
              d="M38 18a14 14 0 1 0 0 28 11 11 0 0 1 0-28z"
              fill="#d8e4ff"
              opacity="0.95"
            />
            <circle cx="32" cy="32" r="16" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.3" opacity="0.7" />
            <line x1="32" y1="32" x2="32" y2="22" stroke={`url(#${uid}-gold)`} strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="32" x2="40" y2="34" stroke={`url(#${uid}-gold)`} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="32" cy="32" r="2" fill="#fff6d0" />
          </g>
        )}

        {name === "place_compass" && (
          <g filter={`url(#${uid}-glow)`}>
            <circle cx="32" cy="32" r="16" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.5" />
            <path d="M32 16l5 16-5 16-5-16z" fill={`url(#${uid}-gold)`} opacity="0.9" />
            <path d="M16 32l16 5 16-5-16-5z" fill="#a080d0" opacity="0.55" />
            <circle cx="32" cy="32" r="3" fill="#fff6d0" />
            {[
              [20, 20],
              [44, 18],
              [46, 44],
              [18, 42],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.2" fill="#ffe08a" />
            ))}
          </g>
        )}

        {name === "chapter_book" && (
          <g filter={`url(#${uid}-glow)`}>
            <path
              d="M16 18c8 0 12 2 16 6 4-4 8-6 16-6v30c-8 0-12 2-16 6-4-4-8-6-16-6V18z"
              fill="#5a2a88"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="1.4"
            />
            <path d="M32 24v28" stroke={`url(#${uid}-gold)`} strokeWidth="1.2" opacity="0.7" />
            <path
              d="M32 14l2.2 5.4 5.8.6-4.4 3.8 1.4 5.6L32 26.2l-4.9 3.2 1.4-5.6-4.4-3.8 5.8-.6z"
              fill="#ffe08a"
            />
            <circle cx="22" cy="40" r="1" fill="#ffe08a" opacity="0.8" />
            <circle cx="42" cy="38" r="1" fill="#ffe08a" opacity="0.8" />
          </g>
        )}

        {name === "ask_amy" && (
          <g filter={`url(#${uid}-glow)`}>
            <path
              d="M14 28c0-10 8-16 18-16s18 6 18 16-6 16-14 16l-4 6-2-6c-10 0-16-6-16-16z"
              fill="#6a3a98"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="1.3"
            />
            <circle cx="32" cy="28" r="7" fill={`url(#${uid}-g)`} />
            <circle cx="32" cy="28" r="3" fill="#fff6d0" />
            <circle cx="22" cy="18" r="1.2" fill="#ffe08a" />
            <circle cx="46" cy="20" r="1" fill="#ffe08a" />
          </g>
        )}

        {name === "update_telescope" && (
          <g filter={`url(#${uid}-glow)`}>
            <rect
              x="14"
              y="28"
              width="32"
              height="8"
              rx="3"
              fill="#7a4ab0"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="1.2"
              transform="rotate(-22 30 32)"
            />
            <circle cx="46" cy="18" r="6" fill={`url(#${uid}-g)`} />
            <path d="M22 40l-6 12h12z" fill="#4a2870" />
            <circle cx="52" cy="12" r="1.3" fill="#fff" />
            <circle cx="18" cy="16" r="1" fill="#ffe08a" />
          </g>
        )}

        {name === "save_heart" && (
          <g filter={`url(#${uid}-glow)`}>
            <path
              d="M32 48c-12-8-18-16-18-24a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 8-6 16-18 24z"
              fill="#e080a8"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="1.2"
            />
            <path
              d="M32 22l2 5 5.5.6-4.2 3.6 1.2 5.4L32 33.4l-4.5 3.2 1.2-5.4-4.2-3.6L32 22z"
              fill="#fff6c8"
            />
          </g>
        )}

        {name === "continue_moon" && (
          <g filter={`url(#${uid}-glow)`}>
            <path
              d="M40 16a16 16 0 1 0 0 32 12 12 0 0 1 0-32z"
              fill="#d0e0f8"
            />
            <circle cx="48" cy="20" r="1.5" fill="#ffe08a" />
            <circle cx="20" cy="44" r="1.2" fill="#ffe08a" />
            <path d="M28 36c4 4 10 4 14 0" stroke="#6a5080" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>
        )}

        {name === "heart_nest" && (
          <g>
            <ellipse cx="32" cy="40" rx="16" ry="8" fill="#5a3a28" opacity="0.7" />
            <path d="M20 36c4-8 10-12 12-12s8 4 12 12" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="2" />
            <circle cx="32" cy="28" r="4" fill="#ffe08a" />
          </g>
        )}

        {name === "lantern" && (
          <g>
            <rect x="24" y="22" width="16" height="22" rx="4" fill="#f0c060" />
            <rect x="27" y="26" width="10" height="12" rx="2" fill="#fff6c8" opacity="0.85" />
            <path d="M32 14v8" stroke={`url(#${uid}-gold)`} strokeWidth="2" />
            <circle cx="32" cy="12" r="3" fill={`url(#${uid}-gold)`} />
          </g>
        )}

        {name === "bridge" && (
          <g>
            <path d="M8 42c12-16 36-16 48 0" stroke={`url(#${uid}-gold)`} strokeWidth="2.5" fill="none" />
            <path d="M14 42v8M32 34v16M50 42v8" stroke="#a080d0" strokeWidth="1.5" />
            <circle cx="32" cy="28" r="4" fill="#ffe08a" />
          </g>
        )}

        {name === "tree" && (
          <g>
            <path d="M32 48V30" stroke="#7aba80" strokeWidth="2.2" />
            <path d="M32 32c-12-2-16-12-14-20 10 2 16 10 14 20z" fill="#6db87a" />
            <path d="M32 32c12-2 16-12 14-20-10 2-16 10-14 20z" fill="#8fd49a" />
            <circle cx="46" cy="16" r="2" fill="#ffe08a" />
          </g>
        )}

        {name === "paper_plane" && (
          <g filter={`url(#${uid}-glow)`}>
            <path d="M12 34l40-16-16 36-6-14-18-6z" fill={`url(#${uid}-gold)`} opacity="0.9" />
            <path d="M30 40l6-14 14-6" fill="none" stroke="#4a2880" strokeWidth="1.2" />
          </g>
        )}

        {name === "shooting_star" && (
          <g filter={`url(#${uid}-glow)`}>
            <path d="M12 44c14-6 28-18 40-30" stroke={`url(#${uid}-gold)`} strokeWidth="2.2" fill="none" opacity="0.75" />
            <path
              d="M48 12l2.2 5.4 5.8.6-4.4 3.8 1.4 5.6L48 24.2l-4.9 3.2 1.4-5.6-4.4-3.8 5.8-.6z"
              fill="#fff6c8"
            />
          </g>
        )}
      </svg>
    </span>
  );
}

/** Status badge pill with cosmic medallion. */
export function AmyAstroStatusBadge({
  kind,
  label,
  complete,
  onClick,
  testId,
  reducedMotion = false,
}: {
  kind: "day" | "time" | "place";
  label: string;
  complete: boolean;
  onClick: () => void;
  testId: string;
  reducedMotion?: boolean;
}) {
  const iconName: AmyAstroIconName =
    kind === "day" ? "day_sun" : kind === "time" ? "time_moon_clock" : "place_compass";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "amy-astro-ripple amy-astro-status-badge inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-xs font-semibold transition-all",
        complete
          ? "border-[hsl(42_55%_60%/0.4)] bg-[hsl(42_40%_28%/0.28)] text-[hsl(42_80%_86%)]"
          : "border-white/12 bg-white/[0.03] text-[hsl(40_20%_96%/0.7)]",
      )}
      aria-label={`${label}: ${complete ? "complete" : "missing"}`}
      data-testid={testId}
    >
      <AmyAstroIcon
        name={iconName}
        size={30}
        complete={complete}
        reducedMotion={reducedMotion}
        title={label}
      />
      <span>
        {label}
        {complete ? " · Done" : " · Add"}
      </span>
    </button>
  );
}
