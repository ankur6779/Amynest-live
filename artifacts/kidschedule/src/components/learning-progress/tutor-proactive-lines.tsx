import { motion } from "framer-motion";
import { AmyIcon } from "@/components/amy-icon";
import type { ProactiveTutorLine } from "@workspace/learning-progress-engine";
import { PremiumCard, fadeUp, PREMIUM_EASE } from "./premium-polish";

const TONE_ACCENT: Record<ProactiveTutorLine["tone"], string> = {
  celebrate: "border-primary/20 bg-primary/[0.04]",
  encourage: "border-border/60",
  suggest: "border-amber-200/40 bg-amber-50/30 dark:bg-amber-950/20",
  comeback: "border-sky-200/40 bg-sky-50/30 dark:bg-sky-950/20",
};

export function TutorProactiveLines({ lines }: { lines: ProactiveTutorLine[] }) {
  if (lines.length === 0) return null;
  return (
    <PremiumCard testId="tutor-proactive-lines">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold font-quicksand">
          <AmyIcon size={24} />
          Amy noticed
        </div>
        {lines.map((line, i) => (
          <motion.p
            key={line.id}
            {...fadeUp}
            transition={{ ...PREMIUM_EASE, delay: i * 0.06 }}
            className={`text-sm text-foreground/85 leading-relaxed rounded-xl border px-3 py-2.5 ${TONE_ACCENT[line.tone]}`}
          >
            {line.text}
          </motion.p>
        ))}
      </div>
    </PremiumCard>
  );
}
