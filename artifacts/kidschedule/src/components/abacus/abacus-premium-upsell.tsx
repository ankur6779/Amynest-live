import { Sparkles, Lock, Trophy, Mic, Palette, Users, FileBadge } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AbacusLearnToProUpsell({
  onContinueFree,
  onTryPro,
  onPreviewPractice,
  className,
}: {
  onContinueFree: () => void;
  onTryPro: () => void;
  onPreviewPractice: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border-2 border-teal-400/40 bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-background p-4 space-y-3",
        className,
      )}
      data-testid="abacus-learn-pro-upsell"
      role="dialog"
      aria-labelledby="abacus-upsell-title"
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <h4 id="abacus-upsell-title" className="font-black text-sm text-foreground">
            You solved your first Abacus lesson!
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Want to practice using the real interactive abacus? Unlock Practice Mode.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPreviewPractice}
        className="w-full rounded-xl border border-teal-500/30 bg-background/80 px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted min-h-[44px]"
        data-testid="abacus-upsell-preview"
      >
        Preview a Practice question →
      </button>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onContinueFree}
          className="flex-1 rounded-xl bg-muted text-foreground text-sm font-bold py-3 min-h-[44px]"
          data-testid="abacus-upsell-continue-free"
        >
          Continue Free
        </button>
        <button
          type="button"
          onClick={onTryPro}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-bold py-3 min-h-[44px]"
          data-testid="abacus-upsell-try-pro"
        >
          <Lock className="h-3.5 w-3.5" />
          Try PRO
        </button>
      </div>
    </motion.div>
  );
}

const PRO_PERKS = [
  { icon: Sparkles, label: "Unlimited AI Tutor + Voice Coach" },
  { icon: Trophy, label: "Advanced Challenges & Master levels" },
  { icon: Users, label: "Family competition & tournaments" },
  { icon: Palette, label: "Exclusive themes (earned by learning)" },
  { icon: Mic, label: "Animated living tutor" },
  { icon: FileBadge, label: "Monthly certificates & reports" },
] as const;

export function AbacusPremiumValuePanel({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/10 p-3 space-y-2.5",
        className,
      )}
      data-testid="abacus-premium-value"
    >
      <p className="text-xs font-black uppercase tracking-wide text-foreground">
        Why families go PRO
      </p>
      <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-background/70 border border-border p-2.5 space-y-1">
          <p className="font-bold">FREE</p>
          <ul className="text-muted-foreground space-y-0.5 font-semibold">
            <li>✓ Learn lessons</li>
            <li>✓ Preview modes</li>
            <li>✓ Basic progress</li>
            <li>✓ Collection starters</li>
          </ul>
        </div>
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-2.5 space-y-1">
          <p className="font-bold text-teal-800 dark:text-teal-200">PRO</p>
          <ul className="text-muted-foreground space-y-1 font-semibold">
            {PRO_PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-1.5">
                <Icon className="h-3 w-3 mt-0.5 shrink-0 text-teal-600" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
