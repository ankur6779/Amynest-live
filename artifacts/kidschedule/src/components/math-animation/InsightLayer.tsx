import { AnimatePresence, motion } from "framer-motion";
import type { StepEmphasis } from "@workspace/math-tricks";

interface InsightLayerProps {
  /** The "why it works" line for this trick (from sequence.meta.insightLine). */
  insightLine?: string;
  /** Short emphasis annotation for the active step (e.g. "+1 more"). */
  emphasisNote?: string;
  relation?: StepEmphasis["relation"];
  /** Amplify the insight (Replay-Thinking mode keeps it on-screen, brighter). */
  thinking?: boolean;
  reduced: boolean;
}

const RELATION_ICON: Record<NonNullable<StepEmphasis["relation"]>, string> = {
  neighbor: "🔗",
  double: "✌️",
  group: "🟰",
  share: "🤝",
  take_away: "✈️",
};

/**
 * Thinking Visualization (Phase 1) — a quiet, Montessori-calm annotation layer
 * that makes the *reasoning* visible without clutter. It shows the strategy's
 * "why" line and a per-step relationship cue (the neighbour +1, the matching
 * double, the fair share). In Replay-Thinking mode it stays prominent so the
 * child can absorb the shortcut logic.
 */
export function InsightLayer({
  insightLine,
  emphasisNote,
  relation,
  thinking,
  reduced,
}: InsightLayerProps) {
  const showInsight = !!insightLine && (thinking || !!emphasisNote);
  const icon = relation ? RELATION_ICON[relation] : "💡";

  return (
    <div className="pointer-events-none flex min-h-[34px] flex-col items-center justify-center gap-1.5">
      <AnimatePresence mode="wait">
        {showInsight ? (
          <motion.div
            key={insightLine}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: reduced ? 0.12 : 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              background: thinking
                ? "hsl(var(--brand-violet-400) / 0.16)"
                : "rgba(255,255,255,0.06)",
              border: `1px solid ${thinking ? "hsl(var(--brand-violet-400) / 0.5)" : "rgba(255,255,255,0.12)"}`,
            }}
          >
            <span className="text-sm" aria-hidden>
              {icon}
            </span>
            <span
              className="text-xs font-bold leading-snug"
              style={{ color: thinking ? "hsl(var(--brand-violet-400))" : "rgba(255,255,255,0.82)" }}
            >
              {insightLine}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {emphasisNote ? (
          <motion.span
            key={emphasisNote}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={
              reduced ? { opacity: 1 } : { opacity: 1, scale: [0.6, 1.18, 1] }
            }
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={{ duration: reduced ? 0.12 : 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="rounded-full px-2.5 py-0.5 text-[11px] font-black"
            style={{
              color: "hsl(var(--brand-amber-300))",
              background: "hsl(var(--brand-amber-400) / 0.16)",
              border: "1px solid hsl(var(--brand-amber-400) / 0.45)",
            }}
          >
            {emphasisNote}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
