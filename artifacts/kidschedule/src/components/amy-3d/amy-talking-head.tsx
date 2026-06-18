// AmyTalkingHead — a premium "talking" Amy built from pre-rendered mouth frames
// plus ambient "speaking" cues that pull attention OFF the mouth.
//
// Mouth: three frames (closed / small-open / wide-open) sliced from ONE render
// and eye-centred, so swapping them moves ONLY the mouth — the head, cap, eyes
// and headphones stay perfectly still. The closed frame is the always-on base;
// while speaking the two open frames cross-fade in over it with a calm rhythm.
//
// Ambient cues (only while speaking):
//   • Halo pulse           — the neon ring breathes with Amy's voice.
//   • Headphone glow pulse  — cyan bloom over each earcup.
//   • Audio-reactive waveform — a row of bars under the head that react to
//     Amy's OUTPUT amplitude.
//
// All three are driven by a SINGLE requestAnimationFrame loop that reads the
// live audio level (0..1) from `audioLevelRef`. If Web Audio is unavailable the
// level stays 0 and a gentle synthesized idle wave keeps the cues alive, so the
// effect always looks intentional. The loop runs ONLY while speaking and pauses
// on hidden tabs / reduced-motion, so an idle Amy does zero background work.

import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { AMY_TALK_FRAMES } from "@/lib/amy-3d/baked-avatar";
import { prefersReducedMotion } from "@/lib/amy-3d/webgl-support";

interface AmyTalkingHeadProps {
  /** Pixel size of the square avatar. */
  size: number;
  /** When true, Amy animates her mouth (talking) and the ambient cues pulse. */
  speaking?: boolean;
  /** Live 0..1 amplitude of Amy's voice. Drives halo / headphone / waveform. */
  audioLevelRef?: RefObject<number>;
  /** Soft neon halo ring + voice cues. Defaults to true. */
  halo?: boolean;
  className?: string;
}

const BAR_COUNT = 7;

export function AmyTalkingHead({
  size,
  speaking = false,
  audioLevelRef,
  halo = true,
  className,
}: AmyTalkingHeadProps) {
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Stop everything the instant the tab is hidden (battery + a11y). The listener
  // is attached ONLY while speaking, so an idle Amy does zero background work.
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    if (!speaking || typeof document === "undefined") return;
    const onVis = () => setTabHidden(document.visibilityState === "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [speaking]);

  const active = speaking && !tabHidden && !reduced;

  // Refs for the ambient cues — mutated directly in the rAF loop (no re-renders).
  const ringRef = useRef<HTMLSpanElement | null>(null);
  const hpLeftRef = useRef<HTMLSpanElement | null>(null);
  const hpRightRef = useRef<HTMLSpanElement | null>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const ring = ringRef.current;
    const hpL = hpLeftRef.current;
    const hpR = hpRightRef.current;
    const bars = barRefs.current;

    // Resting state when not speaking: calm ring, no glow, flat waveform.
    if (!active) {
      if (ring) {
        ring.style.opacity = halo ? "0.5" : "0";
        ring.style.transform = "scale(1)";
      }
      if (hpL) hpL.style.opacity = "0";
      if (hpR) hpR.style.opacity = "0";
      bars.forEach((b) => b && (b.style.transform = "scaleY(0.16)"));
      return;
    }

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const live = Math.min(1, Math.max(0, audioLevelRef?.current ?? 0));
      // Gentle breathing wave so the cues stay alive between words and even if
      // the analyser is unavailable (live stays 0). Real voice peaks override it.
      const idle = 0.2 + 0.14 * (0.5 + 0.5 * Math.sin(t * 5));
      const drive = Math.max(live, idle);

      if (ring) {
        ring.style.opacity = String(0.42 + 0.5 * drive);
        ring.style.transform = `scale(${1 + 0.05 * drive})`;
      }
      const glow = 0.2 + 0.75 * drive;
      if (hpL) hpL.style.opacity = String(glow * (0.8 + 0.2 * Math.sin(t * 7)));
      if (hpR) hpR.style.opacity = String(glow * (0.8 + 0.2 * Math.sin(t * 7 + 1.7)));

      const n = bars.length;
      for (let i = 0; i < n; i++) {
        const b = bars[i];
        if (!b) continue;
        // Tallest in the centre (classic waveform), each bar wobbles on its own
        // phase so they don't march in lock-step.
        const center = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2);
        const wob = 0.6 + 0.4 * Math.sin(t * 9 + i * 1.1);
        const h = Math.max(0.14, Math.min(1, 0.16 + drive * (0.5 + 0.5 * center) * wob));
        b.style.transform = `scaleY(${h})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, audioLevelRef, halo]);

  const layer: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    pointerEvents: "none",
  };

  const earcup: CSSProperties = {
    position: "absolute",
    top: "64%",
    width: "30%",
    height: "30%",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(56,189,248,0.85) 0%, rgba(56,189,248,0.35) 38%, rgba(56,189,248,0) 70%)",
    filter: "blur(4px)",
    opacity: 0,
    pointerEvents: "none",
    mixBlendMode: "screen",
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(size * 0.05),
        flexShrink: 0,
      }}
      aria-hidden
    >
      <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
        {/* Halo ring — sits behind the head and breathes with Amy's voice. Lives
            OUTSIDE the clipped circle so the glow can bloom outward. */}
        {halo && (
          <span
            ref={ringRef}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              boxShadow:
                "0 0 0 3px rgba(168,85,247,0.5), 0 0 30px 6px rgba(168,85,247,0.55)",
              opacity: 0.5,
              pointerEvents: "none",
              willChange: "opacity, transform",
            }}
          />
        )}

        {/* Headphone glow — cyan bloom over each earcup. */}
        <span ref={hpLeftRef} style={{ ...earcup, left: "8%" }} />
        <span ref={hpRightRef} style={{ ...earcup, left: "92%" }} />

        {/* Circular crop of the eye-centred mouth frames. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          {/* Base: closed/idle frame — always visible so the head never moves. */}
          <img src={AMY_TALK_FRAMES[0]} alt="" draggable={false} style={layer} />
          {/* Open frames fade in over the base only while speaking. */}
          <img
            src={AMY_TALK_FRAMES[1]}
            alt=""
            draggable={false}
            className={active ? "amy-talk-f1" : undefined}
            style={{ ...layer, opacity: 0 }}
          />
          <img
            src={AMY_TALK_FRAMES[2]}
            alt=""
            draggable={false}
            className={active ? "amy-talk-f2" : undefined}
            style={{ ...layer, opacity: 0 }}
          />
        </div>
      </div>

      {/* Audio-reactive waveform — a row of bars that ride Amy's amplitude. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: Math.max(3, Math.round(size * 0.018)),
          height: Math.round(size * 0.12),
          opacity: active ? 1 : 0,
          transition: "opacity 240ms ease",
        }}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            style={{
              width: Math.max(3, Math.round(size * 0.016)),
              height: "100%",
              borderRadius: 999,
              transformOrigin: "center",
              transform: "scaleY(0.16)",
              background: "linear-gradient(180deg, #7dd3fc 0%, #a855f7 100%)",
              boxShadow: "0 0 8px rgba(125,211,252,0.55)",
              willChange: "transform",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default AmyTalkingHead;
