import { Sparkles, Lock, Trophy, Mic, Palette, Users, FileBadge } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { isGrowLivingV1Enabled } from "@/lib/grow/living-room";

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
  const living = isGrowLivingV1Enabled();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4 space-y-3",
        living
          ? "gw-living-deep-panel border border-[rgba(232,212,184,0.28)]"
          : "border-2 border-teal-400/40 bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-background",
        className,
      )}
      data-testid="abacus-learn-pro-upsell"
      data-gw-living={living ? "1" : undefined}
      role="dialog"
      aria-labelledby="abacus-upsell-title"
    >
      <div className="flex items-start gap-2">
        <Sparkles className={cn("h-5 w-5 shrink-0 mt-0.5", living ? "text-foreground/70" : "text-teal-600")} />
        <div>
          <h4 id="abacus-upsell-title" className="font-bold text-sm text-foreground">
            {living
              ? "A calm first counting practice — well done"
              : "You solved your first Abacus lesson!"}
          </h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {living
              ? "Want to keep practicing with the interactive beads? Amy can support you further whenever you're ready."
              : "Want to practice using the real interactive abacus? Unlock Practice Mode."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPreviewPractice}
        className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted min-h-12"
        data-testid="abacus-upsell-preview"
      >
        {living ? "Preview a practice question →" : "Preview a Practice question →"}
      </button>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onContinueFree}
          className="flex-1 rounded-xl bg-muted text-foreground text-sm font-bold py-3 min-h-12"
          data-testid="abacus-upsell-continue-free"
        >
          {living ? "Not now" : "Continue Free"}
        </button>
        <button
          type="button"
          onClick={onTryPro}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold py-3 min-h-12",
            living
              ? "gw-living-deep-primary-btn"
              : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white",
          )}
          data-testid="abacus-upsell-try-pro"
        >
          {!living && <Lock className="h-3.5 w-3.5" />}
          {living ? PREMIUM_VOICE.continueCta : "Try PRO"}
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

const LIVING_PERKS = [
  { icon: Sparkles, label: "Deeper bead practice with Amy" },
  { icon: Trophy, label: "Gentle challenges when ready" },
  { icon: Users, label: "Family practice together" },
  { icon: Palette, label: "Calm themes earned by practice" },
  { icon: Mic, label: "Quiet voice support" },
  { icon: FileBadge, label: "Simple progress notes" },
] as const;

export function AbacusPremiumValuePanel({ className }: { className?: string }) {
  const living = isGrowLivingV1Enabled();
  const perks = living ? LIVING_PERKS : PRO_PERKS;

  return (
    <section
      className={cn(
        "rounded-2xl p-3 space-y-2.5",
        living
          ? "gw-living-deep-panel border border-[rgba(232,212,184,0.28)]"
          : "border border-primary/25 bg-primary/10",
        className,
      )}
      data-testid="abacus-premium-value"
      data-gw-living={living ? "1" : undefined}
    >
      <p className={cn("text-xs font-bold uppercase tracking-wide text-foreground", living && "gw-living-deep-eyebrow")}>
        {living ? PREMIUM_VOICE.includesLabel : "Why families go PRO"}
      </p>
      <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl bg-background/70 border border-border p-2.5 space-y-1">
          <p className="font-bold">{living ? "Today" : "FREE"}</p>
          <ul className="text-muted-foreground space-y-0.5 font-semibold">
            <li>✓ {living ? "Calm lessons" : "Learn lessons"}</li>
            <li>✓ {living ? "Gentle previews" : "Preview modes"}</li>
            <li>✓ {living ? "Quiet progress" : "Basic progress"}</li>
            <li>✓ {living ? "Small collection starts" : "Collection starters"}</li>
          </ul>
        </div>
        <div
          className={cn(
            "rounded-xl border p-2.5 space-y-1",
            living
              ? "bg-[rgba(232,212,184,0.08)] border-[rgba(232,212,184,0.25)]"
              : "bg-teal-500/10 border-teal-500/30",
          )}
        >
          <p className={cn("font-bold", !living && "text-teal-800 dark:text-teal-200")}>
            {living ? "Whenever you're ready" : "PRO"}
          </p>
          <ul className="text-muted-foreground space-y-1 font-semibold">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-1.5">
                <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", living ? "text-foreground/60" : "text-teal-600")} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {living ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{PREMIUM_VOICE.invitation}</p>
      ) : null}
    </section>
  );
}
