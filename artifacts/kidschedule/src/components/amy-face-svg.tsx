import { useEffect, useState } from "react";

interface AmyFaceSVGProps {
  size?: number;
  className?: string;
}

export function AmyFaceSVG({ size = 36, className = "" }: AmyFaceSVGProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const doBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    };
    const first = setTimeout(() => {
      doBlink();
      const id = setInterval(doBlink, 2200);
      return () => clearInterval(id);
    }, 1400);
    return () => clearTimeout(first);
  }, []);

  const eyeRy = blink ? 0.4 : 6;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <radialGradient id="bodyGrad" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F0F0F8" />
          <stop offset="100%" stopColor="#D8D8EE" />
        </radialGradient>
        <radialGradient id="bodyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--brand-purple-500))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--brand-violet-600))" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id="capGrad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--brand-indigo-500))" />
          <stop offset="50%" stopColor="hsl(var(--brand-violet-600))" />
          <stop offset="100%" stopColor="hsl(var(--brand-purple-500))" />
        </linearGradient>
        <linearGradient id="capVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--brand-violet-800))" />
          <stop offset="100%" stopColor="hsl(var(--brand-violet-900))" />
        </linearGradient>
        <radialGradient id="capSheen" cx="30%" cy="18%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="38%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#2C2C3E" />
          <stop offset="100%" stopColor="#0A0A14" />
        </radialGradient>
        <radialGradient id="wingGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DDDDF0" />
        </radialGradient>
      </defs>

      {/* Outer glow */}
      <circle cx="32" cy="36" r="28" fill="url(#bodyGlow)" />

      {/* Left wing */}
      <ellipse
        cx="9"
        cy="47"
        rx="9"
        ry="5.5"
        fill="url(#wingGrad)"
        stroke="#C8C8E0"
        strokeWidth="0.6"
        transform="rotate(-20 9 47)"
      />
      {/* Right wing */}
      <ellipse
        cx="55"
        cy="47"
        rx="9"
        ry="5.5"
        fill="url(#wingGrad)"
        stroke="#C8C8E0"
        strokeWidth="0.6"
        transform="rotate(20 55 47)"
      />

      {/* Main round body */}
      <circle cx="32" cy="40" r="22" fill="url(#bodyGrad)" />
      <circle cx="32" cy="40" r="22" stroke="#C8C8E8" strokeWidth="0.5" fill="none" />

      {/* Cap dome */}
      <path
        d="M 11 37 Q 11 9 32 9 Q 53 9 53 37 Z"
        fill="url(#capGrad)"
      />
      {/* Cap sheen */}
      <path
        d="M 16 32 Q 20 13 32 11 Q 44 13 47 22 Q 38 15 32 15 Q 21 15 16 32 Z"
        fill="url(#capSheen)"
      />

      {/* Cap visor / brim */}
      <path
        d="M 15 37 Q 32 42 49 37 Q 49 43 32 43 Q 15 43 15 37 Z"
        fill="url(#capVisorGrad)"
      />
      <path
        d="M 15 37 Q 32 42 49 37"
        stroke="#3B0D8F"
        strokeWidth="0.7"
        fill="none"
      />

      {/* "Amy Ai" badge on cap */}
      <rect x="22" y="26" width="20" height="8" rx="4" fill="hsl(var(--brand-pink-500))" />
      <rect x="22.5" y="26.5" width="19" height="7" rx="3.5" fill="hsl(var(--brand-pink-400))" opacity="0.3" />
      <text
        x="32"
        y="30.8"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="4.8"
        fontWeight="800"
        fill="white"
        fontFamily="'Arial', sans-serif"
        letterSpacing="0.2"
      >
        Amy Ai
      </text>

      {/* LEFT EYE */}
      <ellipse cx="23.5" cy="42" rx="6" ry={eyeRy} fill="url(#eyeGrad)" style={{ transition: "ry 0.08s ease" }} />
      {!blink && (
        <>
          <ellipse cx="21.5" cy="39.8" rx="2" ry="2" fill="white" opacity="0.95" />
          <ellipse cx="24.5" cy="41" rx="0.9" ry="0.9" fill="white" opacity="0.6" />
        </>
      )}

      {/* RIGHT EYE */}
      <ellipse cx="40.5" cy="42" rx="6" ry={eyeRy} fill="url(#eyeGrad)" style={{ transition: "ry 0.08s ease" }} />
      {!blink && (
        <>
          <ellipse cx="38.5" cy="39.8" rx="2" ry="2" fill="white" opacity="0.95" />
          <ellipse cx="41.5" cy="41" rx="0.9" ry="0.9" fill="white" opacity="0.6" />
        </>
      )}

      {/* Beak */}
      <ellipse cx="32" cy="51.5" rx="3.5" ry="2.2" fill="hsl(var(--brand-orange-400))" />
      <ellipse cx="32" cy="50.5" rx="3.2" ry="1.4" fill="hsl(var(--brand-yellow-300))" />

      {/* Body highlight / fluff */}
      <ellipse cx="40" cy="33" rx="4" ry="3" fill="white" opacity="0.22" />
    </svg>
  );
}
