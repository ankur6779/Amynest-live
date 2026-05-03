import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
interface AmyIconProps {
  size?: number;
  className?: string;
  bounce?: boolean;
  ring?: boolean;
}
export function AmyIcon({
  size = 36,
  className = "",
  bounce = false,
  ring = false
}: AmyIconProps) {
  const {
    t
  } = useTranslation();
  const blinkRef = useRef<SVGEllipseElement>(null);
  const blinkRef2 = useRef<SVGEllipseElement>(null);
  useEffect(() => {
    let frame: ReturnType<typeof setTimeout>;
    function doBlink() {
      const el1 = blinkRef.current;
      const el2 = blinkRef2.current;
      if (!el1 || !el2) return;
      el1.style.transform = "scaleY(0.05)";
      el2.style.transform = "scaleY(0.05)";
      el1.style.transformOrigin = "center 33px";
      el2.style.transformOrigin = "center 33px";
      setTimeout(() => {
        if (el1) el1.style.transform = "scaleY(1)";
        if (el2) el2.style.transform = "scaleY(1)";
      }, 100);
      frame = setTimeout(() => {
        doBlink();
      }, 2200 + Math.random() * 1500);
    }
    frame = setTimeout(doBlink, 1000);
    return () => clearTimeout(frame);
  }, []);
  const face = <svg viewBox="0 0 64 64" width={ring ? size * 0.68 : size} height={ring ? size * 0.68 : size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={t("components.amy_icon.amy")} style={{
    display: "block"
  }}>
      <defs>
        <radialGradient id="amyFaceBg" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFF0E6" />
          <stop offset="55%" stopColor="#FFE0BC" />
          <stop offset="100%" stopColor="#F5C8A0" />
        </radialGradient>
      </defs>

      {/* soft glow behind */}
      <circle cx="32" cy="34" r="28" fill="#FFE9F1" opacity="0.5" />

      {/* Face */}
      <circle cx="32" cy="34" r="22" fill="url(#amyFaceBg)" />

      {/* Cheeks */}
      <ellipse cx="19" cy="40" rx="4" ry="2.8" fill="#FFB4C8" opacity="0.7" />
      <ellipse cx="45" cy="40" rx="4" ry="2.8" fill="#FFB4C8" opacity="0.7" />

      {/* Eyes — blinking via ref */}
      <ellipse ref={blinkRef} cx="24" cy="33" rx="3.2" ry="3.8" fill="#1A1530" style={{
      transformOrigin: "24px 33px",
      transition: "transform 0.09s ease"
    }} />
      <ellipse ref={blinkRef2} cx="40" cy="33" rx="3.2" ry="3.8" fill="#1A1530" style={{
      transformOrigin: "40px 33px",
      transition: "transform 0.09s ease"
    }} />
      {/* Eye sparkles */}
      <circle cx="25.5" cy="31.5" r="1" fill="#ffffff" />
      <circle cx="41.5" cy="31.5" r="1" fill="#ffffff" />

      {/* Smile */}
      <path d="M25 43 Q32 49.5 39 43" stroke="#7A3A2A" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Purple cap */}
      <path d="M11 33 Q15 9 32 9 Q49 9 53 33 Q53 23 32 19 Q11 23 11 33 Z" fill="#9B6FD4" opacity="0.85" />
      {/* Cap shine */}
      <path d="M20 15 Q32 10 44 15" stroke="#C4A0FF" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>;
  if (ring) {
    return <span className={`inline-flex items-center justify-center shrink-0 ${bounce ? "amy-bounce" : ""} ${className}`} style={{
      width: size,
      height: size,
      position: "relative"
    }} aria-hidden>
        {/* Outer glow pulse ring */}
        <span className="amy-pulse" style={{
        position: "absolute",
        inset: 0,
        borderRadius: "9999px",
        pointerEvents: "none"
      }} />
        {/* Gradient ring */}
        <span style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: "linear-gradient(135deg,#7B3FF2,#FF4ECD,#4FC3F7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 18px rgba(236,72,153,0.55), 0 4px 16px rgba(124,58,237,0.45)"
      }}>
          {face}
        </span>
      </span>;
  }
  return <span className={`inline-flex items-center justify-center shrink-0 ${bounce ? "amy-bounce" : ""} ${className}`} style={{
    width: size,
    height: size
  }} aria-hidden>
      {face}
    </span>;
}