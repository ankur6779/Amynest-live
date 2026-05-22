import type { MathTrickMeta } from "@workspace/math-tricks";

/** Doubling / near-double — two equal finger groups. */
export function FingerGroupsVisual({ count = 6 }: { count?: number }) {
  const n = Math.min(Math.max(count, 2), 10);
  return (
    <div className="flex justify-center gap-6 py-2" aria-hidden>
      {[0, 1].map((side) => (
        <div key={side} className="flex flex-wrap gap-1 justify-center max-w-[72px]">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: side === 0 ? "hsl(var(--brand-amber-400))" : "hsl(var(--brand-cyan-400))",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            />
          ))}
        </div>
      ))}
      <span className="self-center text-white/50 font-bold text-lg">=</span>
      <span className="self-center text-white font-black text-sm">{n + n}</span>
    </div>
  );
}

export function NumberLineVisual({ meta }: { meta: MathTrickMeta }) {
  const nl = meta.numberLine;
  if (!nl) return null;
  const span = nl.to - nl.from;
  const ticks = Math.min(span + 1, 12);
  const step = span / (ticks - 1);
  return (
    <div className="py-2 px-1" aria-hidden>
      <div
        className="relative h-8 rounded-full mx-2"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div
          className="absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2"
          style={{ background: "rgba(245,158,11,0.5)" }}
        />
        {Array.from({ length: ticks }, (_, i) => {
          const val = Math.round(nl.from + i * step);
          const pct = ticks <= 1 ? 50 : (i / (ticks - 1)) * 100;
          const jump = nl.jumps?.[0];
          const isJump = jump && Math.abs(val - jump.at) <= step / 2;
          return (
            <span
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold"
              style={{
                left: `calc(${pct}% + 8px)`,
                color: isJump ? "hsl(var(--brand-amber-300))" : "rgba(255,255,255,0.35)",
              }}
            >
              {val}
            </span>
          );
        })}
      </div>
      {nl.jumps?.[0] && (
        <p className="text-center text-[10px] font-bold mt-1" style={{ color: "hsl(var(--brand-amber-300))" }}>
          {nl.jumps[0].label}
        </p>
      )}
    </div>
  );
}

export function ExampleStepsVisual({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-left"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            animation: `mt-appear ${200 + i * 80}ms ease both`,
          }}
        >
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: "rgba(245,158,11,0.35)", color: "hsl(var(--brand-amber-200))" }}
          >
            {i + 1}
          </span>
          <span className="text-white/90 text-xs font-bold leading-snug">{step}</span>
        </div>
      ))}
    </div>
  );
}
