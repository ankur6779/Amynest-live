import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Heart } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import { trackRetentionEvent } from "@/lib/retention/retention-analytics";

type Props = {
  level: number;
  inactiveDays: number;
};

const COPY: Record<number, { title: string; body: string }> = {
  1: {
    title: "We saved your spot",
    body: "Today’s next step is here whenever you’re ready.",
  },
  3: {
    title: "Life can continue from here",
    body: "Your unfinished step is still here — one small return is enough.",
  },
  7: {
    title: "Glad you’re here again",
    body: "Whenever you’re ready, we can pick up one quiet step together.",
  },
  14: {
    title: "Welcome whenever you’re ready",
    body: "A fresh, gentle start is here — your child’s journey continues anytime.",
  },
};

export function WinbackBanner({ level, inactiveDays }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (level <= 0) return;
    trackRetentionEvent("inactive_days", { days: inactiveDays });
    trackRetentionEvent("winback_opened", { level: Math.min(4, level) as 1 | 2 | 3 | 4 });
  }, [level, inactiveDays]);

  if (level <= 0) return null;

  const copy = COPY[level] ?? COPY[14];

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.journey}>
      <div className="p-4 flex gap-3 items-start" data-testid="winback-banner">
        {level >= 7 ? (
          <Gift className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
        ) : (
          <Heart className="h-5 w-5 text-pink-300 shrink-0 mt-0.5" aria-hidden />
        )}
        <div>
          <p className="text-sm font-bold text-white">{t(`retention.winback_${level}_title`, copy.title)}</p>
          <p className="text-xs text-white/65 mt-1">{t(`retention.winback_${level}_body`, copy.body)}</p>
        </div>
      </div>
    </DashboardGlassCard>
  );
}
