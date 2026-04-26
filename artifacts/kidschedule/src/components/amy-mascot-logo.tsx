import { useEffect, useRef } from "react";
import mascotImg from "@assets/ChatGPT_Image_Apr_26,_2026,_11_13_52_PM_1777225444907.png";

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

  const ew = size * 0.058;
  const eh = size * 0.072;
  const lx = size * 0.405;
  const rx = size * 0.585;
  const ey = size * 0.460;

  return (
    <div
      className={`amy-mascot-outer ${className}`}
      style={{ width: size, height: size, position: "relative", flexShrink: 0, display: "inline-block" }}
      aria-hidden
    >
      <div className="amy-mascot-float" style={{ width: size, height: size, position: "relative" }}>

        {/* Orbiting shimmer arc — rotates over the neon ring */}
        <div className="amy-mascot-shimmer" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 3 }} />

        {/* Hover glow ring (box-shadow burst on hover) */}
        <div className="amy-mascot-hover-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none", zIndex: 4 }} />

        {/* Mascot image — circular crop, themed image already matches dark header */}
        <div
          className="amy-mascot-glow"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: "hidden",
            zIndex: 1,
          }}
        >
          <img
            src={mascotImg}
            alt="Amy AI"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              pointerEvents: "none",
            }}
            draggable={false}
          />
        </div>

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
            background: "#fde8e8",
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
            background: "#fde8e8",
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
