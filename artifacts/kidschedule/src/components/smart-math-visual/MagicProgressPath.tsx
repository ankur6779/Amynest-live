import { motion } from "framer-motion";
import { TRANSITION } from "@/lib/experience-system";
import { useReducedMotion } from "@/lib/reduced-motion";

export type PathNode = {
  id: string;
  label?: string;
  state: "completed" | "today" | "future";
};

type MagicProgressPathProps = {
  nodes: PathNode[];
  accent?: string;
  className?: string;
};

/** Visual journey — glowing checkpoints connected by a magic path. */
export function MagicProgressPath({
  nodes,
  accent = "hsl(var(--brand-amber-300))",
  className = "",
}: MagicProgressPathProps) {
  const reduced = useReducedMotion();
  if (nodes.length === 0) return null;

  return (
    <div className={`relative flex items-center justify-center gap-0 px-2 ${className}`} aria-hidden>
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1;
        const filled = node.state === "completed" || node.state === "today";
        return (
          <div key={node.id} className="flex items-center">
            <motion.div
              className="relative flex h-9 w-9 items-center justify-center"
              initial={reduced ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...TRANSITION.springGentle, delay: i * 0.08 }}
            >
              {node.state === "today" && !reduced && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: accent,
                    opacity: 0.25,
                  }}
                  animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.1, 0.35] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <span
                className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black"
                style={{
                  background:
                    node.state === "completed"
                      ? `linear-gradient(145deg, ${accent}, ${accent}99)`
                      : node.state === "today"
                        ? `linear-gradient(145deg, ${accent}, #f59e0b)`
                        : "rgba(255,255,255,0.08)",
                  color: filled ? "#1c0a00" : "rgba(255,255,255,0.35)",
                  border:
                    node.state === "future"
                      ? "1.5px dashed rgba(255,255,255,0.2)"
                      : `1.5px solid ${accent}88`,
                  boxShadow: filled ? `0 0 14px ${accent}66` : undefined,
                }}
              >
                {node.state === "completed" ? "✓" : i + 1}
              </span>
            </motion.div>
            {!isLast && (
              <div
                className="mx-0.5 h-[3px] w-8 overflow-hidden rounded-full sm:w-12"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <motion.div
                  className="origin-left h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${accent}, ${accent}66)`,
                    width: node.state === "completed" ? "100%" : node.state === "today" ? "55%" : "0%",
                  }}
                  initial={reduced ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ ...TRANSITION.warm, delay: 0.15 + i * 0.1 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
