// AmyMascotLogo — the premium Amy brand mark used across the app shell
// (header, sidebar, Ask-Amy FAB, onboarding). Renders the official premium Amy
// face with a gentle idle float + soft neon glow + a live eye-blink so the
// branding feels alive everywhere, not just on the hero.

import { AmyBlinkFace } from "@/components/amy-3d/amy-blink-face";

interface AmyMascotLogoProps {
  size?: number;
  className?: string;
}

export function AmyMascotLogo({ size = 44, className = "" }: AmyMascotLogoProps) {
  return (
    <div
      className={`amy-mascot-outer ${className}`}
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        display: "inline-block",
      }}
      aria-hidden
    >
      <div
        className="amy-mascot-float"
        style={{ width: size, height: size, position: "relative" }}
      >
        {/* Hover glow ring (box-shadow burst on hover) */}
        <div
          className="amy-mascot-hover-ring"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 4 }}
        />

        {/* Premium Amy — blinking face with a soft neon glow. */}
        <div
          className="amy-mascot-glow"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", zIndex: 1 }}
        >
          <AmyBlinkFace size={size} />
        </div>
      </div>
    </div>
  );
}
