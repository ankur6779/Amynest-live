import { useEffect, useRef } from "react";
import mascotImg from "@assets/ChatGPT_Image_Apr_26,_2026,_10_36_21_PM_1777223202857.png";

interface AmyMascotLogoProps {
  size?: number;
  className?: string;
}

export function AmyMascotLogo({ size = 44, className = "" }: AmyMascotLogoProps) {
  const leftLidRef  = useRef<HTMLDivElement>(null);
  const rightLidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      timer = setTimeout(() => {
        const l = leftLidRef.current;
        const r = rightLidRef.current;
        if (l && r) {
          l.style.transform = "scaleY(1)";
          r.style.transform = "scaleY(1)";
          setTimeout(() => {
            if (l) l.style.transform = "scaleY(0)";
            if (r) r.style.transform = "scaleY(0)";
          }, 160);
        }
        scheduleBlink();
      }, 1300 + Math.random() * 400);
    }

    const init = setTimeout(scheduleBlink, 800 + Math.random() * 400);
    return () => { clearTimeout(init); clearTimeout(timer); };
  }, []);

  const ew = size * 0.062;
  const eh = size * 0.074;
  const lx  = size * 0.348;
  const rx  = size * 0.558;
  const ey  = size * 0.468;

  return (
    <div
      className={`amy-mascot-outer ${className}`}
      style={{ width: size, height: size, position: "relative", flexShrink: 0, display: "inline-block" }}
      aria-hidden
    >
      <div className="amy-mascot-float" style={{ width: size, height: size, position: "relative" }}>

        {/* Orbiting shimmer arc */}
        <div className="amy-mascot-shimmer" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 3 }} />

        {/* Hover glow ring (box-shadow layer, opacity transitions on hover) */}
        <div className="amy-mascot-hover-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 4 }} />

        {/* Mascot image with breathing glow */}
        <img
          src={mascotImg}
          alt="Amy AI"
          className="amy-mascot-glow"
          style={{ width: size, height: size, objectFit: "contain", display: "block", pointerEvents: "none", position: "relative", zIndex: 1 }}
          draggable={false}
        />

        {/* Eye eyelid overlays — scaleY(0)=open, scaleY(1)=closed */}
        <div
          ref={leftLidRef}
          style={{
            position: "absolute",
            left: lx - ew / 2,
            top:  ey - eh / 2,
            width: ew,
            height: eh,
            borderRadius: "50%",
            background: "#e4daf2",
            transform: "scaleY(0)",
            transformOrigin: "center center",
            transition: "transform 0.12s ease-in-out",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
        <div
          ref={rightLidRef}
          style={{
            position: "absolute",
            left: rx - ew / 2,
            top:  ey - eh / 2,
            width: ew,
            height: eh,
            borderRadius: "50%",
            background: "#e4daf2",
            transform: "scaleY(0)",
            transformOrigin: "center center",
            transition: "transform 0.12s ease-in-out",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      </div>
    </div>
  );
}
