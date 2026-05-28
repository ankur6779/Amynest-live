import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import type { EquationPart } from "@workspace/math-tricks";

interface EquationMorphProps {
  /** Tokenized equation — preferred. Enables semantic highlighting + morphing. */
  parts?: EquationPart[];
  /** Plain-string fallback (older callers). */
  equation?: string;
  color?: string;
  reduced: boolean;
}

/** Per-role colour + weight so the *meaning* of each number reads at a glance. */
function roleStyle(role: EquationPart["role"], accent: string): React.CSSProperties {
  switch (role) {
    case "a":
      return { color: "rgba(255,255,255,0.92)" };
    case "b":
      return { color: "hsl(var(--brand-sky-400))" };
    case "extra":
      return {
        color: "hsl(var(--brand-amber-300))",
        textShadow: "0 0 12px hsl(var(--brand-amber-400) / 0.7)",
      };
    case "result":
      return {
        color: "hsl(var(--brand-green-400))",
        textShadow: "0 0 14px hsl(var(--brand-green-400) / 0.5)",
      };
    case "op":
      return { color: "rgba(255,255,255,0.4)", fontWeight: 700 };
    case "muted":
      return { color: "rgba(255,255,255,0.32)", textDecoration: "line-through" };
    default:
      return { color: accent };
  }
}

/**
 * Concrete → abstract bridge (Phase 2). Renders the equation as *semantic
 * tokens* and morphs between states: tokens that persist glide via shared
 * layout, while changed tokens cross-fade. This animates decomposition
 * (7 → 6 + 1) and recomposition (12 + 1 → 13) the way a child would think it.
 */
export function EquationMorph({ parts, equation, color, reduced }: EquationMorphProps) {
  const accent = color ?? "rgba(255,255,255,0.85)";

  // Fallback: plain string crossfade (kept for non-tokenized callers).
  if (!parts || parts.length === 0) {
    return (
      <div className="flex h-8 items-center justify-center" aria-hidden>
        <AnimatePresence mode="wait">
          {equation ? (
            <motion.span
              key={equation}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: reduced ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="font-mono text-base font-black tracking-tight"
              style={{ color: accent }}
            >
              {equation}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center justify-center gap-1" aria-hidden>
      <LayoutGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {parts.map((part, i) => (
            <motion.span
              key={`${i}:${part.role ?? "x"}:${part.text}`}
              layout={!reduced}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.7 }}
              animate={
                reduced
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      y: 0,
                      scale: part.role === "result" || part.role === "extra" ? [0.7, 1.12, 1] : 1,
                    }
              }
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.7 }}
              transition={{
                duration: reduced ? 0.12 : 0.34,
                ease: [0.22, 1, 0.36, 1],
                layout: { type: "spring", stiffness: 320, damping: 30 },
              }}
              className="font-mono text-lg font-black tracking-tight"
              style={roleStyle(part.role, accent)}
            >
              {part.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
