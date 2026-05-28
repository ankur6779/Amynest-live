import { motion } from "framer-motion";
import type { ParentInsight } from "@workspace/math-tricks";

export interface ParentInsightCardProps {
  insights: ParentInsight[];
  title: string;
  subtitle?: string;
  reduced?: boolean;
}

const TONE_ICON: Record<ParentInsight["tone"], string> = {
  mastery: "🌟",
  growth: "🌱",
  encouragement: "💛",
};

/**
 * Parent Cognition Insights (Phase 8). A calm, premium card that reflects the
 * child's *thinking* back to the parent — strategy use, the concrete→abstract
 * journey and healthy reasoning habits — never engagement vanity metrics.
 */
export function ParentInsightCard({ insights, title, subtitle, reduced }: ParentInsightCardProps) {
  if (insights.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(160deg, hsl(var(--brand-violet-400) / 0.1), rgba(255,255,255,0.02))",
        border: "1px solid hsl(var(--brand-violet-400) / 0.28)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base" aria-hidden>
          🧠
        </span>
        <h3 className="text-sm font-black text-white/90">{title}</h3>
      </div>
      {subtitle && <p className="mb-3 text-xs text-white/55">{subtitle}</p>}
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <motion.li
            key={insight.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.06 }}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <span className="mt-0.5 text-sm" aria-hidden>
              {TONE_ICON[insight.tone]}
            </span>
            <span className="text-xs font-semibold leading-snug text-white/85">{insight.text}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
