import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "boot" | "transition";

type Props = {
  /** `boot` — full launch splash; `transition` — shorter copy for route changes. */
  variant?: Variant;
  /** Fixed full-viewport overlay (route transitions). */
  overlay?: boolean;
  /** Optional line under the ring (defaults by variant). */
  message?: string;
  children?: ReactNode;
};

const PARTICLES = [
  { w: 2, h: 2, bottom: "18%", left: "10%", dur: "16s", d: "0s", dx: "28px" },
  { w: 1, h: 1, bottom: "9%", left: "26%", dur: "21s", d: "3s", dx: "-22px" },
  { w: 2, h: 2, bottom: "22%", left: "44%", dur: "18s", d: "1s", dx: "32px" },
  { w: 1, h: 1, bottom: "6%", left: "62%", dur: "23s", d: "5s", dx: "-18px" },
  { w: 2, h: 2, bottom: "14%", left: "78%", dur: "17s", d: "2s", dx: "24px" },
  { w: 1, h: 1, bottom: "28%", left: "90%", dur: "20s", d: "6s", dx: "-14px" },
] as const;

/**
 * Premium AmyNest splash — mirrors index.html boot design for auth boot,
 * lazy-route fallbacks, and in-app navigation transitions.
 */
export function AmyNestSplashShell({
  variant = "boot",
  overlay = false,
  message,
  children,
}: Props) {
  const isTransition = variant === "transition";
  const tagline =
    message ??
    (isTransition ? "Loading your page…" : "Where Smart Parenting Starts");

  return (
    <div
      role="status"
      aria-label="Loading AmyNest"
      className={cn(
        "amynest-splash-overlay",
        isTransition && "amynest-splash-transition",
        overlay && "amynest-splash-overlay--fixed",
      )}
    >
      <div className="splash-waves" aria-hidden="true" />

      <div className="splash-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="splash-particle"
            style={
              {
                width: p.w,
                height: p.h,
                bottom: p.bottom,
                left: p.left,
                "--dur": p.dur,
                "--d": p.d,
                "--dx": p.dx,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="splash-stage">
        <div className="splash-ring-area">
          <div className="splash-glow-outer" aria-hidden="true" />
          <div className="splash-ring-scene" aria-hidden="true">
            <div className="splash-ring-pulse">
              <div className="splash-ring" />
              <div className="splash-ring-shimmer" />
              <div className="splash-ring-inner">
                <span className="splash-meet">Meet</span>
                <span className="splash-amy">AMY</span>
              </div>
            </div>
          </div>
          <div className="splash-platform" aria-hidden="true" />
        </div>

        <p className="splash-tagline">
          {isTransition ? (
            tagline
          ) : (
            <>
              Where <span className="hl">Smart Parenting</span> Starts
            </>
          )}
        </p>

        {!isTransition ? (
          <div className="splash-patent">
            <span className="splash-patent-badge">
              Powered by Patent-Pending Adaptive AI Technology
            </span>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
