// AmyMascotLogo — the premium Amy brand mark used across the app shell
// (header, sidebar, Ask-Amy FAB, onboarding). Renders the official premium Amy
// render with a gentle idle float + soft neon glow so the branding feels alive
// everywhere, not just on the hero.

import { useTranslation } from "react-i18next";
import { BAKED_AMY_SRC } from "@/lib/amy-3d/baked-avatar";

interface AmyMascotLogoProps {
  size?: number;
  className?: string;
}

export function AmyMascotLogo({ size = 44, className = "" }: AmyMascotLogoProps) {
  const { t } = useTranslation();

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
        {/* Orbiting shimmer arc — rotates over the neon ring */}
        <div
          className="amy-mascot-shimmer"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 3 }}
        />

        {/* Hover glow ring (box-shadow burst on hover) */}
        <div
          className="amy-mascot-hover-ring"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 4 }}
        />

        {/* Premium Amy render — circular crop, framed on the face + cap. */}
        <div
          className="amy-mascot-glow"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", zIndex: 1 }}
        >
          <img
            src={BAKED_AMY_SRC}
            alt={t("components.amy_mascot_logo.amy_ai")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 42%",
              display: "block",
              pointerEvents: "none",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
