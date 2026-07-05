import { memo, useEffect, useRef } from "react";
import { subscribeAmyAnimationClock } from "@/lib/amy/character/amy-animation-clock";

export type AmyParticleKind = "celebration" | "success" | "magic";

interface AmyParticlesProps {
  kind: AmyParticleKind;
  width: number;
  height: number;
  active: boolean;
  /** Auto-stop burst after ms (default 2400). */
  durationMs?: number;
  reduced?: boolean;
}

interface Particle {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
}

const KIND_CONFIG: Record<
  AmyParticleKind,
  { count: number; colors: string[]; glyphs: string[] }
> = {
  celebration: {
    count: 14,
    colors: ["#FBBF24", "#A855F7", "#67E8F9", "#F472B6", "#34D399"],
    glyphs: ["✦", "✧", "·", "★"],
  },
  success: {
    count: 10,
    colors: ["#34D399", "#A855F7", "#FBBF24"],
    glyphs: ["✓", "✦", "·"],
  },
  magic: {
    count: 12,
    colors: ["#C084FC", "#67E8F9", "#F9A8D4"],
    glyphs: ["✦", "✧", "·"],
  },
};

function spawnParticle(
  pool: Particle[],
  i: number,
  width: number,
  height: number,
  kind: AmyParticleKind,
): Particle {
  const cfg = KIND_CONFIG[kind];
  const el = pool[i]?.el ?? document.createElement("span");
  el.textContent = cfg.glyphs[i % cfg.glyphs.length] ?? "✦";
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.fontSize = `${Math.max(8, Math.round(height * 0.028))}px`;
  el.style.color = cfg.colors[i % cfg.colors.length] ?? "#FBBF24";
  el.style.pointerEvents = "none";
  el.style.willChange = "transform, opacity";
  el.style.transformOrigin = "center";
  const maxLife = 1.4 + Math.random() * 0.8;
  return {
    el,
    x: width * (0.28 + Math.random() * 0.44),
    y: height * (0.18 + Math.random() * 0.28),
    vx: (Math.random() - 0.5) * width * 0.12,
    vy: -height * (0.06 + Math.random() * 0.08),
    life: maxLife,
    maxLife,
    spin: (Math.random() - 0.5) * 120,
  };
}

/**
 * Lightweight CSS-transform particle burst. No canvas / WebGL.
 * Particles stop automatically after {@link durationMs}.
 */
export const AmyParticles = memo(function AmyParticles({
  kind,
  width,
  height,
  active,
  durationMs = 2400,
  reduced = false,
}: AmyParticlesProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const poolRef = useRef<Particle[]>([]);
  const burstStartRef = useRef(0);
  const activeRef = useRef(active);

  activeRef.current = active;

  useEffect(() => {
    if (reduced || !active) return;
    const host = hostRef.current;
    if (!host) return;

    const cfg = KIND_CONFIG[kind];
    burstStartRef.current = performance.now();
    poolRef.current = Array.from({ length: cfg.count }, (_, i) => {
      const p = spawnParticle(poolRef.current, i, width, height, kind);
      host.appendChild(p.el);
      return p;
    });

    const unsub = subscribeAmyAnimationClock((_now, dt) => {
      if (!activeRef.current) return;
      if (performance.now() - burstStartRef.current > durationMs) {
        for (const p of poolRef.current) {
          p.el.style.opacity = "0";
        }
        return;
      }
      for (const p of poolRef.current) {
        p.life -= dt;
        if (p.life <= 0) {
          Object.assign(p, spawnParticle([p], 0, width, height, kind));
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += height * 0.04 * dt;
        const fade = Math.max(0, Math.min(1, p.life / p.maxLife));
        p.el.style.opacity = String(fade * 0.9);
        p.el.style.transform =
          `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${((1 - fade) * p.spin).toFixed(1)}deg) scale(${0.6 + fade * 0.5})`;
      }
    });

    return () => {
      unsub();
      for (const p of poolRef.current) p.el.remove();
      poolRef.current = [];
    };
  }, [active, kind, width, height, durationMs, reduced]);

  if (reduced || !active) return null;

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 overflow-visible"
      aria-hidden
    />
  );
});
